import { NextRequest, NextResponse } from "next/server"
import { requireActiveSession } from "@/lib/session-guard"
import { prisma } from "@/lib/prisma"
import { extractTextFromPdf } from "@/lib/pdf"
import { extractTenderSpec } from "@/lib/ai/extract"
import { searchKnowledge } from "@/lib/knowledge"
import { readBlobBuffer } from "@/lib/storage"
import { parseRagThreshold, buildKnowledgeChunksXml } from "@/lib/rag"

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
      .join('. ')
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

  const extracted = await extractTenderSpec(combinedText, knowledgeContext)

  const analysis = await prisma.analysis.create({
    data: {
      tenderId,
      documentId: documents[0].id,
      status: "DRAFT",
      voltage: extracted.systemCharacteristics.voltage,
      bilSil: extracted.systemCharacteristics.bilSil,
      shortCircuit: extracted.systemCharacteristics.shortCircuit,
      installCond: extracted.systemCharacteristics.installCond,
      groundConfig: extracted.systemCharacteristics.groundConfig,
      requiredCapacity: extracted.systemCharacteristics.requiredCapacity,
      requirements: {
        create: extracted.requirements.map((r) => ({
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
    ...(ragError ? { ragError } : {}),
  })
}
