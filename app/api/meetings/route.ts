import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireActiveSession } from "@/lib/session-guard"

export async function GET() {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  const meetings = await prisma.meeting.findMany({
    orderBy: { meetingDate: "desc" },
    include: {
      createdBy: { select: { name: true, nickname: true } },
      actions: { orderBy: { createdAt: "asc" } },
    },
  })
  return NextResponse.json(meetings)
}

export async function POST(req: NextRequest) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  const body = await req.json() as {
    title: string
    type: string
    meetingDate: string
    body?: string
    issueLinks?: { issueType: string; issueId: string; issueLabel: string }[]
  }

  const meeting = await prisma.meeting.create({
    data: {
      title:       body.title,
      type:        body.type as never,
      meetingDate: new Date(body.meetingDate),
      body:        body.body ?? "",
      issueLinks:  Array.isArray(body.issueLinks) ? body.issueLinks : [],
      createdById: session.user.id,
    },
    include: {
      createdBy: { select: { name: true, nickname: true } },
      actions: true,
    },
  })
  return NextResponse.json(meeting, { status: 201 })
}
