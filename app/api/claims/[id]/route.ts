import { after } from "next/server"
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireActiveSession } from "@/lib/session-guard"
import { ingestClosedClaim } from "@/lib/ingest-qms"
import { parseProjectKeyInput } from "@/lib/project-key"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session
  const { id } = await params
  const claim = await prisma.claim.findUnique({
    where: { id },
    include: { createdBy: { select: { name: true, nickname: true } } },
  })
  if (!claim) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(claim)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session
  const { id } = await params

  const body = await req.json() as {
    title?: string; customer?: string; priority?: string; assignee?: string
    description?: string; status?: string; targetDate?: string | null; closedAt?: string | null
    timeline?: unknown[]; attachments?: unknown[]; responsibleParty?: string | null
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

  // Closed 전환 / Closed 상태에서 projectKey 변경 시 re-ingest 필요
  // (Q1-03: 종결 후 projectKey 부여·수정·삭제도 knowledge_chunks metadata에 반영돼야 함)
  const needsIngestCheck = body.status === "Closed" || body.projectKey !== undefined
  const existing = needsIngestCheck
    ? await prisma.claim.findUnique({ where: { id }, select: { status: true } })
    : null

  const claim = await prisma.claim.update({
    where: { id },
    data: {
      ...(body.title             !== undefined && { title:            body.title }),
      ...(body.customer          !== undefined && { customer:         body.customer }),
      ...(body.priority          !== undefined && { priority:         body.priority as never }),
      ...(body.assignee          !== undefined && { assignee:         body.assignee }),
      ...(body.description       !== undefined && { description:      body.description }),
      ...(body.status            !== undefined && { status:           body.status as never }),
      ...(body.timeline          !== undefined && { timeline:         body.timeline as never }),
      ...(body.attachments       !== undefined && { attachments:      body.attachments as never }),
      ...(body.targetDate        !== undefined && { targetDate:       body.targetDate ? new Date(body.targetDate) : null }),
      ...(body.closedAt          !== undefined && { closedAt:         body.closedAt ? new Date(body.closedAt) : null }),
      ...(body.responsibleParty  !== undefined && { responsibleParty: body.responsibleParty }),
      ...projectKeyUpdate,
    },
  })

  const isClosingNow = body.status === "Closed" && existing?.status !== "Closed"
  const isClosedProjectKeyUpdate = body.projectKey !== undefined && existing?.status === "Closed"
  if (isClosingNow || isClosedProjectKeyUpdate) {
    after(async () => { await ingestClosedClaim(id) })
  }

  return NextResponse.json(claim)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session
  const { id } = await params
  await prisma.claim.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
