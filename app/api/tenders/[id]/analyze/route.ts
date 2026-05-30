import { NextRequest, NextResponse } from "next/server"
import { requireActiveSession } from "@/lib/session-guard"
import { prisma } from "@/lib/prisma"
import { extractTextFromPdf } from "@/lib/pdf"
import { extractTenderSpec } from "@/lib/ai/extract"
import { searchKnowledge } from "@/lib/knowledge"
import { readBlobBuffer } from "@/lib/storage"
import { parseRagThreshold, buildKnowledgeChunksXml } from "@/lib/rag"

const DDG_TIMEOUT_MS = 5000

// DuckDuckGo Lite HTML 파서를 활용한 실시간 외부 웹 검색 (API Key 불필요)
async function searchWebForTender(query: string): Promise<string> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), DDG_TIMEOUT_MS)
    let res: Response
    try {
      res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        },
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timer)
    }
    if (!res.ok) return ""

    const html = await res.text()
    const snippetRegex = /<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g
    const titleRegex = /<a class="result__title"[^>]*>([\s\S]*?)<\/a>/g

    const titles: string[] = []
    const snippets: string[] = []
    let match: RegExpExecArray | null

    while ((match = titleRegex.exec(html)) !== null && titles.length < 3) {
      titles.push(match[1].replace(/<[^>]*>/g, "").trim())
    }
    while ((match = snippetRegex.exec(html)) !== null && snippets.length < 3) {
      snippets.push(match[1].replace(/<[^>]*>/g, "").trim())
    }

    return titles
      .map((t, i) => `[웹${i + 1}] ${t}: ${snippets[i] ?? ""}`)
      .filter((s) => s.trim().length > 10)
      .join("\n")
  } catch {
    return ""
  }
}

// PDF 텍스트에서 핵심 기술 키워드 추출 (IEC 규격, 전압 레벨 등)
function extractTenderKeywords(text: string): string {
  const slice = text.slice(0, 3000)
  const patterns = [
    /IEC\s+\d+[\w-]*/gi,
    /IEEE\s+\d+[\w-]*/gi,
    /CIGRE\s+[\w-]+/gi,
    /\d+\s*kV\s*(?:XLPE|cable|submarine|underground)?/gi,
    /\d+\s*MVA?\b/gi,
    /HVAC|HVDC|submarine cable|undersea cable/gi,
  ]
  const keywords = new Set<string>()
  for (const pat of patterns) {
    const matches = slice.match(pat) ?? []
    matches.slice(0, 3).forEach((m) => keywords.add(m.trim()))
  }
  return Array.from(keywords).slice(0, 6).join(" ")
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  const { id: tenderId } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "요청 본문이 올바른 JSON이 아닙니다." }, { status: 400 })
  }
  if (body === null || typeof body !== "object") {
    return NextResponse.json({ error: "요청 본문이 올바른 JSON이 아닙니다." }, { status: 400 })
  }
  const documentIds: unknown = (body as Record<string, unknown>).documentIds
  if (!Array.isArray(documentIds) || documentIds.length === 0 || documentIds.some((id) => typeof id !== "string")) {
    return NextResponse.json({ error: "documentIds 배열이 필요합니다." }, { status: 400 })
  }

  const documents = await prisma.tenderDocument.findMany({
    where: {
      id: { in: documentIds as string[] },
      tenderId,
      isAnalysisSource: true,
      tender: { createdById: session.user.id },
    },
  })
  if (documents.length !== documentIds.length) {
    return NextResponse.json({ error: "문서를 찾을 수 없습니다." }, { status: 404 })
  }

  let combinedText = ""
  let anyTruncated = false
  for (const doc of documents) {
    const buffer = await readBlobBuffer(doc.storagePath)
    if (!buffer) return NextResponse.json({ error: "PDF를 읽을 수 없습니다." }, { status: 502 })
    const { text, truncated } = await extractTextFromPdf(buffer)
    if (combinedText) combinedText += "\n\n---\n\n"
    combinedText += text
    if (truncated) anyTruncated = true
  }

  // 1. 내부 RAG 지식 검색
  const RAG_THRESHOLD = parseRagThreshold(process.env.RAG_THRESHOLD)
  let knowledgeContext: string | undefined
  let ragApplied = false
  let ragChunkCount = 0
  let ragError: string | undefined
  try {
    const keywordPattern = /IEC\s+\d|IEEE\s+\d|CIGRE|KS [A-Z]|\d+\s*kV|\d+\s*MW|mm²/i
    const keywordSentences = combinedText
      .slice(0, 5000)
      .split(/[.\n]+/)
      .filter((s) => keywordPattern.test(s))
      .slice(0, 3)
      .join(". ")
    const ragQuery = keywordSentences ? `${combinedText.slice(0, 800)}\n\n${keywordSentences}` : combinedText.slice(0, 800)
    const chunks = (await searchKnowledge(ragQuery, { limit: 5 }))
      .filter((c) => c.similarity >= RAG_THRESHOLD)
    if (chunks.length > 0) {
      knowledgeContext = buildKnowledgeChunksXml(chunks)
      ragApplied = true
      ragChunkCount = chunks.length
    }
  } catch (e) {
    console.warn("[analyze] 지식 검색 실패, RAG 없이 진행:", (e as Error).message)
    ragError = "RAG_UNAVAILABLE"
  }

  // 2. 외부 웹 검색 (DuckDuckGo, API Key 불필요) — searchWeb 플래그가 true일 때만 실행
  const searchWeb: boolean = (body as Record<string, unknown>).searchWeb === true
  let webContext: string | undefined
  if (searchWeb) {
    try {
      const keywords = extractTenderKeywords(combinedText)
      if (keywords) {
        const webResults = await searchWebForTender(`${keywords} cable specification standard`)
        if (webResults) webContext = webResults
      }
    } catch (e) {
      console.warn("[analyze] 외부 웹 검색 실패, 웹 컨텍스트 없이 진행:", (e as Error).message)
    }
  }

  // 3. AI 분석 (Claude → OpenAI → Gemini 순서로 폴백)
  let extracted
  try {
    extracted = await extractTenderSpec(combinedText, knowledgeContext, webContext)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error("[analyze] AI 분석 실패:", msg)
    return NextResponse.json({ error: `AI 분석에 실패했습니다: ${msg}` }, { status: 500 })
  }

  const webContextApplied = !!webContext
  const analysis = await prisma.analysis.create({
    data: {
      tenderId,
      documentId: documents[0].id,
      status: "DRAFT",
      ragChunkCount,
      webContextApplied,
      aiUsed: extracted.aiUsed,
      voltage: extracted.data.systemCharacteristics.voltage,
      bilSil: extracted.data.systemCharacteristics.bilSil,
      shortCircuit: extracted.data.systemCharacteristics.shortCircuit,
      installCond: extracted.data.systemCharacteristics.installCond,
      groundConfig: extracted.data.systemCharacteristics.groundConfig,
      requiredCapacity: extracted.data.systemCharacteristics.requiredCapacity,
      requirements: {
        create: extracted.data.requirements.map((r) => ({
          category: r.category,
          content: r.content,
          sourcePage: r.sourcePage,
          sourceText: r.sourceText,
          isRisk: r.isRisk,
          isVE: r.isVE,
        })),
      },
    },
  })

  return NextResponse.json({
    analysisId: analysis.id,
    truncated: anyTruncated,
    ragApplied,
    ragChunkCount,
    webContextApplied,
    aiUsed: extracted.aiUsed,
    ...(ragError ? { ragError } : {}),
  })
}
