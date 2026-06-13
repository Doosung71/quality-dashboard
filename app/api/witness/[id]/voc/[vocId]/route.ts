import { NextRequest, NextResponse } from "next/server"
import { requireActiveSession } from "@/lib/session-guard"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string; vocId: string }> }

const WRITER_ROLES   = ["TEAM_LEAD", "DIRECTOR", "ADMIN"]
const VALID_CATEGORY = ["DEFECT", "REQUIREMENT", "SCHEDULE", "DOCUMENT", "OTHER"]
const VALID_PRIORITY  = ["HIGH", "NORMAL", "LOW"]
const VALID_STATUS   = ["OPEN", "IN_PROGRESS", "RESOLVED"]

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  if (!WRITER_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: "팀장 이상만 VoC를 수정할 수 있습니다." }, { status: 403 })
  }

  const { id, vocId } = await params

  const existing = await prisma.witnessVoC.findUnique({ where: { id: vocId }, select: { inspectionId: true } })
  if (!existing || existing.inspectionId !== id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const body = await req.json() as {
    content?: string; category?: string; priority?: string
    status?: string; response?: string; dueDate?: string
  }

  if (body.category !== undefined && !VALID_CATEGORY.includes(body.category)) {
    return NextResponse.json({ error: `유효하지 않은 category: ${body.category}` }, { status: 400 })
  }
  if (body.priority !== undefined && !VALID_PRIORITY.includes(body.priority)) {
    return NextResponse.json({ error: `유효하지 않은 priority: ${body.priority}` }, { status: 400 })
  }
  if (body.status !== undefined && !VALID_STATUS.includes(body.status)) {
    return NextResponse.json({ error: `유효하지 않은 status: ${body.status}` }, { status: 400 })
  }

  const data: Record<string, unknown> = {}
  if (body.content   !== undefined) data.content   = body.content
  if (body.category  !== undefined) data.category  = body.category
  if (body.priority  !== undefined) data.priority  = body.priority
  if (body.status    !== undefined) {
    data.status = body.status
    if (body.status === "RESOLVED") data.closedAt = new Date()
    else data.closedAt = null
  }
  if (body.response  !== undefined) data.response  = body.response
  if (body.dueDate   !== undefined) data.dueDate   = body.dueDate ? new Date(body.dueDate) : null

  const voc = await prisma.witnessVoC.update({ where: { id: vocId }, data })
  return NextResponse.json(voc)
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  if (!WRITER_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: "팀장 이상만 VoC를 삭제할 수 있습니다." }, { status: 403 })
  }

  const { id, vocId } = await params

  const existing = await prisma.witnessVoC.findUnique({ where: { id: vocId }, select: { inspectionId: true } })
  if (!existing || existing.inspectionId !== id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  await prisma.witnessVoC.delete({ where: { id: vocId } })
  return NextResponse.json({ ok: true })
}
