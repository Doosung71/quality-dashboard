import { NextRequest, NextResponse } from "next/server"
import { requireActiveSession } from "@/lib/session-guard"
import { prisma } from "@/lib/prisma"
import { deleteBlob, readBlobBuffer } from "@/lib/storage"
import { extractTextFromPdf } from "@/lib/pdf"
import { extractTenderSpec } from "@/lib/ai/extract"
import { searchKnowledge } from "@/lib/knowledge"
import { parseRagThreshold, buildKnowledgeChunksXml } from "@/lib/rag"

const DDG_TIMEOUT_MS = 5000

async function searchWebForTender(query: string): Promise<string> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), DDG_TIMEOUT_MS)
    let res: Response
    try {
      res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
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
    while ((match = titleRegex.exec(html)) !== null && titles.length < 3)
      titles.push(match[1].replace(/<[^>]*>/g, "").trim())
    while ((match = snippetRegex.exec(html)) !== null && snippets.length < 3)
      snippets.push(match[1].replace(/<[^>]*>/g, "").trim())
    return titles.map((t, i) => `[웹${i + 1}] ${t}: ${snippets[i] ?? ""}`).filter((s) => s.trim().length > 10).join("\n")
  } catch { return "" }
}

function extractTenderKeywords(text: string): string {
  const slice = text.slice(0, 3000)
  const patterns = [/IEC\s+\d+[\w-]*/gi, /IEEE\s+\d+[\w-]*/gi, /CIGRE\s+[\w-]+/gi, /\d+\s*kV\s*(?:XLPE|cable|submarine|underground)?/gi, /\d+\s*MVA?\b/gi, /HVAC|HVDC|submarine cable|undersea cable/gi]
  const keywords = new Set<string>()
  for (const pat of patterns) { const matches = slice.match(pat) ?? []; matches.slice(0, 3).forEach((m) => keywords.add(m.trim())) }
  return Array.from(keywords).slice(0, 6).join(" ")
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session
  if (session.user.role !== "PRACTITIONER") {
    return NextResponse.json({ error: "실무자만 재분석할 수 있습니다." }, { status: 403 })
  }

  const { id: tenderId } = await params

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 })
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 })
  }

  const { blobUrl, filename, searchWeb } = body as Record<string, unknown>
  if (typeof blobUrl !== "string" || !blobUrl.startsWith("https://")) {
    return NextResponse.json({ error: "올바른 blobUrl이 필요합니다." }, { status: 400 })
  }
  if (typeof filename !== "string" || !filename) {
    return NextResponse.json({ error: "filename이 필요합니다." }, { status: 400 })
  }

  const tender = await prisma.tender.findFirst({
    where: { id: tenderId, createdById: session.user.id },
    include: {
      analyses: {
        where: { status: "DRAFT", submittedAt: null },
        include: {
          requirements: { select: { id: true } },
          document: { select: { id: true, storagePath: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  })
  if (!tender) return NextResponse.json({ error: "입찰을 찾을 수 없습니다." }, { status: 404 })

  let pdfText: string
  let truncated: boolean
  try {
    const buffer = await readBlobBuffer(blobUrl as string)
    if (!buffer) throw new Error("blob fetch failed")
    const result = await extractTextFromPdf(buffer)
    pdfText = result.text
    truncated = result.truncated
  } catch {
    await deleteBlob(blobUrl as string)
    return NextResponse.json({ error: "분석 중 오류가 발생했습니다." }, { status: 500 })
  }

  // RAG 지식 검색
  const RAG_THRESHOLD = parseRagThreshold(process.env.RAG_THRESHOLD)
  let knowledgeContext: string | undefined
  let ragChunkCount = 0
  try {
    const keywordPattern = /IEC\s+\d|IEEE\s+\d|CIGRE|KS [A-Z]|\d+\s*kV|\d+\s*MW|mm²/i
    const keywordSentences = pdfText.slice(0, 5000).split(/[.\n]+/).filter((s) => keywordPattern.test(s)).slice(0, 3).join(". ")
    const ragQuery = keywordSentences ? `${pdfText.slice(0, 800)}\n\n${keywordSentences}` : pdfText.slice(0, 800)
    const chunks = (await searchKnowledge(ragQuery, { limit: 5 })).filter((c) => c.similarity >= RAG_THRESHOLD)
    if (chunks.length > 0) { knowledgeContext = buildKnowledgeChunksXml(chunks); ragChunkCount = chunks.length }
  } catch (e) { console.warn("[reanalyze] RAG 실패:", (e as Error).message) }

  // 외부 웹 검색 (searchWeb === true 일 때만)
  let webContext: string | undefined
  let webContextApplied = false
  if (searchWeb === true) {
    try {
      const keywords = extractTenderKeywords(pdfText)
      if (keywords) { const webResults = await searchWebForTender(`${keywords} cable specification standard`); if (webResults) { webContext = webResults; webContextApplied = true } }
    } catch (e) { console.warn("[reanalyze] 웹 검색 실패:", (e as Error).message) }
  }

  let extracted: Awaited<ReturnType<typeof extractTenderSpec>>
  try {
    extracted = await extractTenderSpec(pdfText, knowledgeContext, webContext)
  } catch {
    await deleteBlob(blobUrl as string)
    return NextResponse.json({ error: "분석 중 오류가 발생했습니다." }, { status: 500 })
  }

  const oldAnalysis = tender.analyses[0]
  const oldDocInfo = oldAnalysis?.document ?? null

  const result = await prisma.$transaction(async (tx) => {
    const newDoc = await tx.tenderDocument.create({
      data: { tenderId, filename, storagePath: blobUrl },
    })

    if (oldAnalysis) {
      await tx.comment.deleteMany({ where: { analysisId: oldAnalysis.id } })
      await tx.reviewHistory.deleteMany({ where: { analysisId: oldAnalysis.id } })
      await tx.specRequirement.deleteMany({ where: { analysisId: oldAnalysis.id } })
      await tx.analysis.delete({ where: { id: oldAnalysis.id } })
    }

    return tx.analysis.create({
      data: {
        tenderId,
        documentId: newDoc.id,
        status: "DRAFT",
        aiUsed: extracted.aiUsed,
        ragChunkCount,
        webContextApplied,
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
  })

  if (oldDocInfo) {
    const stillUsed = await prisma.tenderDocument.findFirst({
      where: { id: oldDocInfo.id, analyses: { some: {} } },
    })
    if (!stillUsed) await deleteBlob(oldDocInfo.storagePath)
  }

  return NextResponse.json({ analysisId: result.id, truncated, ragChunkCount, webContextApplied, aiUsed: extracted.aiUsed })
}
