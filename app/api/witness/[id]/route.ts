import { NextRequest, NextResponse } from "next/server"
import { requireActiveSession } from "@/lib/session-guard"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string }> }

export async function GET(_: NextRequest, { params }: Params) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session
  const { id } = await params

  const inspection = await prisma.witnessInspection.findUnique({
    where: { id },
    include: {
      createdBy: { select: { name: true, nickname: true } },
      voCs: { orderBy: { createdAt: "asc" } },
    },
  })
  if (!inspection) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(inspection)
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session
  const { id } = await params

  const body = await req.json() as {
    customer?: string; projectName?: string; projectNumber?: string
    productName?: string; inspectionDate?: string; endDate?: string
    location?: string; assigneeId?: string; assigneeName?: string
    status?: string; result?: string
    description?: string; notes?: string; attachments?: unknown
  }

  const data: Record<string, unknown> = {}
  if (body.customer       !== undefined) data.customer       = body.customer
  if (body.projectName    !== undefined) data.projectName    = body.projectName
  if (body.projectNumber  !== undefined) data.projectNumber  = body.projectNumber
  if (body.productName    !== undefined) data.productName    = body.productName
  if (body.inspectionDate !== undefined) data.inspectionDate = new Date(body.inspectionDate)
  if (body.endDate        !== undefined) data.endDate        = body.endDate ? new Date(body.endDate) : null
  if (body.location       !== undefined) data.location       = body.location
  if (body.assigneeId     !== undefined) data.assigneeId     = body.assigneeId
  if (body.assigneeName   !== undefined) data.assigneeName   = body.assigneeName
  if (body.status         !== undefined) data.status         = body.status
  if (body.result         !== undefined) data.result         = body.result || null
  if (body.description    !== undefined) data.description    = body.description
  if (body.notes          !== undefined) data.notes          = body.notes
  if (body.attachments    !== undefined) data.attachments    = body.attachments

  const updated = await prisma.witnessInspection.update({ where: { id }, data })
  return NextResponse.json(updated)
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session
  const { id } = await params

  await prisma.witnessInspection.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
