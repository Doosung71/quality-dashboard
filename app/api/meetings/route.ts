import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireActiveSession } from "@/lib/session-guard"

const VALID_MEETING_TYPES = [
  "QUALITY_ISSUE", "STANDARD_REVIEW", "CHANGE_MANAGEMENT", "QUALITY_MEETING", "OTHER",
] as const
type MeetingTypeValue = typeof VALID_MEETING_TYPES[number]

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
    issueLinks?: unknown[]
  }

  if (!VALID_MEETING_TYPES.includes(body.type as MeetingTypeValue)) {
    return NextResponse.json({ error: "유효하지 않은 회의 유형입니다." }, { status: 400 })
  }

  const issueLinks = (Array.isArray(body.issueLinks) ? body.issueLinks : []).filter(
    (l): l is { issueType: string; issueId: string; issueLabel: string } =>
      typeof l === "object" && l !== null &&
      typeof (l as Record<string, unknown>).issueType === "string" &&
      typeof (l as Record<string, unknown>).issueId === "string" &&
      typeof (l as Record<string, unknown>).issueLabel === "string"
  )

  const meeting = await prisma.meeting.create({
    data: {
      title:       body.title,
      type:        body.type as MeetingTypeValue,
      meetingDate: new Date(body.meetingDate),
      body:        body.body ?? "",
      issueLinks,
      createdById: session.user.id,
    },
    include: {
      createdBy: { select: { name: true, nickname: true } },
      actions: true,
    },
  })
  return NextResponse.json(meeting, { status: 201 })
}
