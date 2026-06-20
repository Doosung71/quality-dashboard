import { after } from "next/server"
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireActiveSession } from "@/lib/session-guard"
import { ingestClosedNcr } from "@/lib/ingest-qms"
import { parseProjectKeyInput } from "@/lib/project-key"

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
    projectKey?: string | null
  }

  let projectKeyUpdate: { projectKey?: string | null } = {}
  if (body.projectKey !== undefined) {
    const pk = parseProjectKeyInput(body.projectKey)
    if (pk.invalid) {
      return NextResponse.json(
        { error: "project_key 형식이 올바르지 않습니다 (kebab-case: 소문자·숫자·하이픈)" },
        { status: 400 },
      )
    }
    projectKeyUpdate = { projectKey: pk.value }
  }

  // Closed 전환 / Closed 상태에서 timeline·projectKey 변경 시 re-ingest 필요
  // (Q1-03: 종결 후 projectKey 부여·수정·삭제도 knowledge_chunks metadata에 반영돼야 함)
  const needsIngestCheck =
    body.status === "Closed" || body.timeline !== undefined || body.projectKey !== undefined
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
      ...projectKeyUpdate,
    },
  })

  const isClosingNow = body.status === "Closed" && existing?.status !== "Closed"
  const isClosedTimelineUpdate = body.timeline !== undefined && existing?.status === "Closed"
  const isClosedProjectKeyUpdate = body.projectKey !== undefined && existing?.status === "Closed"
  if (isClosingNow || isClosedTimelineUpdate || isClosedProjectKeyUpdate) {
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
