import { NextRequest, NextResponse, after } from "next/server"
import { requireActiveSession } from "@/lib/session-guard"
import { prisma } from "@/lib/prisma"
import { ingestSourceInspection } from "@/lib/ingest-qms"

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
      defectRate:     body.defectRate  as number ?? undefined,
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
