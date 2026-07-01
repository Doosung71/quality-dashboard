import { NextRequest, NextResponse, after } from "next/server"
import { requireActiveSession } from "@/lib/session-guard"
import { prisma } from "@/lib/prisma"
import { ingestSourceInspection } from "@/lib/ingest-qms"
import { validateInspectionQuantities } from "@/lib/inspection-quantities"

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session
  const { id } = await params

  const inspection = await prisma.sourceInspection.findUnique({
    where: { id },
    include: { createdBy: { select: { name: true, nickname: true } } },
  })
  if (!inspection) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(inspection)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session
  const { id } = await params

  const body = await req.json() as Record<string, unknown>

  // 수량 필드가 하나라도 오면 기존값과 병합해 정합성 검증 (fail-closed) + 불량률 서버 재계산
  let recomputedDefectRate: number | null | undefined = undefined
  if (body.quantity !== undefined || body.sampleSize !== undefined || body.defectCount !== undefined) {
    const existing = await prisma.sourceInspection.findUnique({
      where: { id },
      select: { quantity: true, sampleSize: true, defectCount: true },
    })
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })
    const effQty    = body.quantity    !== undefined ? body.quantity    : existing.quantity
    const effSample = body.sampleSize  !== undefined ? body.sampleSize  : existing.sampleSize
    const effDefect = body.defectCount !== undefined ? body.defectCount : existing.defectCount
    const qtyError = validateInspectionQuantities(effQty, effSample, effDefect)
    if (qtyError) return NextResponse.json({ error: qtyError }, { status: 400 })
    // 불량률은 클라이언트 값 무시하고 병합된 검증값으로 서버가 재계산
    recomputedDefectRate = (effDefect != null && effSample)
      ? (Number(effDefect) / Number(effSample)) * 100 : null
  }

  const inspection = await prisma.sourceInspection.update({
    where: { id },
    data: {
      inspectionDate: body.inspectionDate ? new Date(body.inspectionDate as string) : undefined,
      location:       body.location    as string ?? undefined,
      itemName:       body.itemName    as string ?? undefined,
      itemCode:       body.itemCode    as string ?? undefined,
      quantity:       body.quantity    as number ?? undefined,
      sampleSize:     body.sampleSize  as number ?? undefined,
      result:         body.result      as never ?? undefined,
      defectCount:    body.defectCount as number ?? undefined,
      defectRate:     recomputedDefectRate,
      inspector:      body.inspector   as string ?? undefined,
      notes:          body.notes       as string ?? undefined,
      ...(body.attachments !== undefined && { attachments: body.attachments as never }),
    },
  })
  if (body.result !== undefined) {
    after(() => ingestSourceInspection(id))
  }
  return NextResponse.json({ id: inspection.id })
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session
  const { id } = await params

  await prisma.sourceInspection.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
