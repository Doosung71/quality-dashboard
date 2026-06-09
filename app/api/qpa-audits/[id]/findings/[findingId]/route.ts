import { NextRequest, NextResponse } from "next/server"
import { requireActiveSession } from "@/lib/session-guard"
import { prisma } from "@/lib/prisma"

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; findingId: string }> }
) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  const writerRoles = ["TEAM_LEAD", "DIRECTOR", "ADMIN"]
  if (!writerRoles.includes(session.user.role)) {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 })
  }

  const { findingId } = await params
  const body = await req.json() as {
    category?:    string
    finding?:     string
    action?:      string
    responsible?: string
    dueDate?:     string | null
    status?:      string
  }

  const finding = await prisma.qpaFinding.update({
    where: { id: findingId },
    data: {
      ...(body.category    !== undefined && { category:    body.category }),
      ...(body.finding     !== undefined && { finding:     body.finding }),
      ...(body.action      !== undefined && { action:      body.action }),
      ...(body.responsible !== undefined && { responsible: body.responsible }),
      ...(body.status      !== undefined && { status:      body.status }),
      ...(body.dueDate !== undefined && {
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
      }),
    },
  })
  return NextResponse.json({ id: finding.id })
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string; findingId: string }> }
) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  const writerRoles = ["TEAM_LEAD", "DIRECTOR", "ADMIN"]
  if (!writerRoles.includes(session.user.role)) {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 })
  }

  const { findingId } = await params
  await prisma.qpaFinding.delete({ where: { id: findingId } })
  return NextResponse.json({ ok: true })
}
