import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireActiveSession } from "@/lib/session-guard"

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  const { id } = await params
  const meeting = await prisma.meeting.findUnique({
    where: { id },
    include: {
      createdBy: { select: { name: true, nickname: true } },
      actions: { orderBy: { createdAt: "asc" } },
    },
  })
  if (!meeting) return NextResponse.json({ error: "not found" }, { status: 404 })
  return NextResponse.json(meeting)
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  const { id } = await params
  const body = await req.json() as {
    title?: string
    type?: string
    meetingDate?: string
    body?: string
    issueLinks?: { issueType: string; issueId: string; issueLabel: string }[]
  }

  const data: Record<string, unknown> = {}
  if (body.title       !== undefined) data.title       = body.title
  if (body.type        !== undefined) data.type        = body.type
  if (body.meetingDate !== undefined) data.meetingDate = new Date(body.meetingDate)
  if (body.body        !== undefined) data.body        = body.body
  if (body.issueLinks  !== undefined) data.issueLinks  = body.issueLinks

  const updated = await prisma.meeting.update({
    where: { id },
    data,
    include: {
      createdBy: { select: { name: true, nickname: true } },
      actions: { orderBy: { createdAt: "asc" } },
    },
  })
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  const { id } = await params
  await prisma.meeting.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
