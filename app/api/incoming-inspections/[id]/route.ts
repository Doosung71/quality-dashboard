import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireActiveSession } from "@/lib/session-guard"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  const { id } = await params
  const item = await prisma.incomingInspection.findUnique({
    where: { id },
    include: { createdBy: { select: { name: true, nickname: true } } },
  })
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(item)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  const { id } = await params
  const body = await req.json() as {
    result?: string; defectCount?: number | null; defectRate?: number | null
    notes?: string | null; status?: string
    attachments?: unknown[]
  }

  const item = await prisma.incomingInspection.update({
    where: { id },
    data: {
      ...(body.result      !== undefined && { result:      body.result as never }),
      ...(body.defectCount !== undefined && { defectCount: body.defectCount }),
      ...(body.defectRate  !== undefined && { defectRate:  body.defectRate }),
      ...(body.notes       !== undefined && { notes:       body.notes }),
      ...(body.status      !== undefined && { status:      body.status }),
      ...(body.attachments !== undefined && { attachments: body.attachments as never }),
    },
  })
  return NextResponse.json(item)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  const { id } = await params
  await prisma.incomingInspection.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
