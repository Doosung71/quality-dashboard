import { NextRequest, NextResponse } from "next/server"
import { requireActiveSession } from "@/lib/session-guard"
import { prisma } from "@/lib/prisma"
import { deleteBlob, readBlobBuffer } from "@/lib/storage"
import { extractTextFromPdf } from "@/lib/pdf"
import { extractTenderSpec } from "@/lib/ai/extract"

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

  const { blobUrl, filename } = body as Record<string, unknown>
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

  let extracted: Awaited<ReturnType<typeof extractTenderSpec>>
  let truncated: boolean
  try {
    const buffer = await readBlobBuffer(blobUrl)
    if (!buffer) throw new Error("blob fetch failed")
    const result = await extractTextFromPdf(buffer)
    extracted = await extractTenderSpec(result.text)
    truncated = result.truncated
  } catch {
    await deleteBlob(blobUrl)
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

  return NextResponse.json({ analysisId: result.id, truncated })
}
