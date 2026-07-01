import { NextRequest, NextResponse } from "next/server"
import { requireActiveSession } from "@/lib/session-guard"
import { checkRateLimit } from "@/lib/rate-limit"
import { prisma } from "@/lib/prisma"
import { extractTextFromPdf, PdfRangeError, type PageRange } from "@/lib/pdf"
import { extractTenderSpec } from "@/lib/ai/extract"
import { searchKnowledge } from "@/lib/knowledge"
import { readBlobBuffer } from "@/lib/storage"
import { parseRagThreshold, buildKnowledgeChunksXml } from "@/lib/rag"
import { naverSearchText } from "@/lib/naver-search"

async function searchWebForTender(query: string): Promise<string> {
  return naverSearchText(query, 5)
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
  const rl = await checkRateLimit(req)
  if (rl) return rl

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

  // TDS 페이지 범위 (선택) — documentId별 { startPage, endPage }
  // H-01: malformed/unknown range를 조용히 무시하면 "전체 추출 fallback"으로 fail-open 되므로,
  //       요청에 ranges가 있으면 각 항목을 엄격 검증하고 실패 시 400(fail-closed)으로 막는다.
  const documentIdSet = new Set(documentIds as string[])
  const rawRanges: unknown = (body as Record<string, unknown>).ranges
  const rangeMap = new Map<string, PageRange>()
  if (rawRanges !== undefined) {
    if (!Array.isArray(rawRanges)) {
      return NextResponse.json({ error: "ranges는 배열이어야 합니다." }, { status: 400 })
    }
    for (const r of rawRanges) {
      if (!r || typeof r !== "object") {
        return NextResponse.json({ error: "ranges 항목은 객체여야 합니다." }, { status: 400 })
      }
      const documentId = (r as Record<string, unknown>).documentId
      if (typeof documentId !== "string" || !documentIdSet.has(documentId)) {
        return NextResponse.json(
          { error: "ranges 항목의 documentId가 유효하지 않습니다." },
          { status: 400 },
        )
      }
      const { startPage, endPage } = r as { startPage?: number; endPage?: number }
      rangeMap.set(documentId, { startPage, endPage })
    }
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
    let extractResult
    try {
      extractResult = await extractTextFromPdf(buffer, rangeMap.get(doc.id))
    } catch (e) {
      // L-01: 다중 문서 중 어느 파일의 범위가 잘못됐는지 식별 가능하도록 filename 포함
      if (e instanceof PdfRangeError) return NextResponse.json({ error: `[${doc.filename}] ${e.message}` }, { status: 400 })
      throw e
    }
    if (combinedText) combinedText += "\n\n---\n\n"
    combinedText += extractResult.text
    if (extractResult.truncated) anyTruncated = true
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
