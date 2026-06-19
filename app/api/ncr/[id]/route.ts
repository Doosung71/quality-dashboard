import { after } from "next/server"
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireActiveSession } from "@/lib/session-guard"
import { ingestClosedNcr } from "@/lib/ingest-qms"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session
  const { id } = await params
  const ncr = await prisma.ncr.findUnique({
    where: { id },
    include: { createdBy: { select: { name: true, nickname: true } } },
  })
  if (!ncr) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(ncr)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session
  const { id } = await params

  const body = await req.json() as {
    title?: string; source?: string; severity?: string; disposition?: string
    status?: string; targetDate?: string; closedDate?: string | null
    assignee?: string; description?: string; timeline?: unknown[]; attachments?: unknown[]
  }

  // Closed 전환 감지 또는 Closed 상태에서 timeline 변경 시 re-ingest 필요
  const needsIngestCheck = body.status === "Closed" || body.timeline !== undefined
  const existing = needsIngestCheck
    ? await prisma.ncr.findUnique({ where: { id }, select: { status: true } })
    : null

  const ncr = await prisma.ncr.update({
    where: { id },
    data: {
      ...(body.title       !== undefined && { title:       body.title }),
      ...(body.source      !== undefined && { source:      body.source }),
      ...(body.severity    !== undefined && { severity:    body.severity    as never }),
      ...(body.disposition !== undefined && { disposition: body.disposition as never }),
      ...(body.status      !== undefined && { status:      body.status      as never }),
      ...(body.assignee    !== undefined && { assignee:    body.assignee }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.timeline    !== undefined && { timeline:    body.timeline as never }),
      ...(body.attachments !== undefined && { attachments: body.attachments as never }),
      ...(body.targetDate  !== undefined && { targetDate:  new Date(body.targetDate) }),
      ...(body.closedDate  !== undefined && { closedDate:  body.closedDate ? new Date(body.closedDate) : null }),
    },
  })

  const isClosingNow = body.status === "Closed" && existing?.status !== "Closed"
  const isClosedTimelineUpdate = body.timeline !== undefined && existing?.status === "Closed"
  if (isClosingNow || isClosedTimelineUpdate) {
    after(async () => { await ingestClosedNcr(id) })
  }

  return NextResponse.json(ncr)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session
  const { id } = await params
  await prisma.ncr.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
