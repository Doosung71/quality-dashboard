import { NextRequest, NextResponse } from "next/server"
import { requireActiveSession } from "@/lib/session-guard"
import { checkRateLimit } from "@/lib/rate-limit"
import { prisma } from "@/lib/prisma"
import { deleteBlob, readBlobBuffer } from "@/lib/storage"
import { extractTextFromPdf, PdfRangeError } from "@/lib/pdf"
import { extractTenderSpec } from "@/lib/ai/extract"
import { searchKnowledge } from "@/lib/knowledge"
import { parseRagThreshold, buildKnowledgeChunksXml } from "@/lib/rag"
import { naverSearchText } from "@/lib/naver-search"

async function searchWebForTender(query: string): Promise<string> {
  return naverSearchText(query, 5)
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
  const rl = await checkRateLimit(req)
  if (rl) return rl


  const { id: tenderId } = await params

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 })
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 })
  }

  // files: [{blobUrl, filename}] 배열 또는 단일 {blobUrl, filename} 허용
  const b = body as Record<string, unknown>
  const searchWeb = b.searchWeb
  const rawFiles = b.files ?? (b.blobUrl ? [{ blobUrl: b.blobUrl, filename: b.filename }] : null)
  if (!Array.isArray(rawFiles) || rawFiles.length === 0) {
    return NextResponse.json({ error: "files 배열이 필요합니다." }, { status: 400 })
  }
  const files = rawFiles as { blobUrl: string; filename: string; startPage?: number; endPage?: number }[]
  for (const f of files) {
    if (typeof f.blobUrl !== "string" || !f.blobUrl.startsWith("https://"))
      return NextResponse.json({ error: "올바른 blobUrl이 필요합니다." }, { status: 400 })
    if (typeof f.filename !== "string" || !f.filename)
      return NextResponse.json({ error: "filename이 필요합니다." }, { status: 400 })
  }

  const tender = await prisma.tender.findFirst({
    where: { id: tenderId, createdById: session.user.id },
  })
  if (!tender) return NextResponse.json({ error: "입찰을 찾을 수 없습니다." }, { status: 404 })

  // 여러 PDF 텍스트 합산
  let pdfText = ""
  let truncated = false
  for (const f of files) {
    try {
      const buffer = await readBlobBuffer(f.blobUrl)
      if (!buffer) throw new Error("blob fetch failed")
      const result = await extractTextFromPdf(buffer, { startPage: f.startPage, endPage: f.endPage })
      if (pdfText) pdfText += "\n\n---\n\n"
      pdfText += result.text
      if (result.truncated) truncated = true
    } catch (e) {
      await deleteBlob(f.blobUrl)
      if (e instanceof PdfRangeError) return NextResponse.json({ error: e.message }, { status: 400 })
      return NextResponse.json({ error: "분석 중 오류가 발생했습니다." }, { status: 500 })
    }
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
    return NextResponse.json({ error: "분석 중 오류가 발생했습니다." }, { status: 500 })
  }

  // 기존 분석은 삭제하지 않고 새 분석을 누적 추가
  const result = await prisma.$transaction(async (tx) => {
    // 파일들을 TenderDocument로 등록, 첫 번째를 분석 대표 문서로 사용
    const newDocs = await Promise.all(
      files.map((f) => tx.tenderDocument.create({ data: { tenderId, filename: f.filename, storagePath: f.blobUrl } }))
    )

    return tx.analysis.create({
      data: {
        tenderId,
        documentId: newDocs[0].id,
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

  return NextResponse.json({ analysisId: result.id, truncated, ragChunkCount, webContextApplied, aiUsed: extracted.aiUsed })
}
