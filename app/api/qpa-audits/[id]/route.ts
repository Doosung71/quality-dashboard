import { NextRequest, NextResponse } from "next/server"
import { requireActiveSession } from "@/lib/session-guard"
import { prisma } from "@/lib/prisma"

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session
  const { id } = await params

  const audit = await prisma.qpaAudit.findUnique({
    where: { id },
    include: {
      items:    { orderBy: { itemNo: "asc" } },
      findings: { orderBy: { seq: "asc" } },
      createdBy: { select: { name: true, nickname: true } },
    },
  })
  if (!audit) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(audit)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  const writerRoles = ["TEAM_LEAD", "DIRECTOR", "ADMIN"]
  if (!writerRoles.includes(session.user.role)) {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json() as Record<string, unknown>

  const audit = await prisma.qpaAudit.update({
    where: { id },
    data: {
      ...(body.auditDate    !== undefined && { auditDate:    new Date(body.auditDate as string) }),
      ...(body.vendorId     !== undefined && { vendorId:     body.vendorId     as string }),
      ...(body.vendorName   !== undefined && { vendorName:   body.vendorName   as string }),
      ...(body.location     !== undefined && { location:     body.location     as string }),
      ...(body.partName     !== undefined && { partName:     body.partName     as string }),
      ...(body.auditorNames !== undefined && { auditorNames: body.auditorNames as string }),
      ...(body.status       !== undefined && { status:       body.status       as string }),
    },
  })
  return NextResponse.json({ id: audit.id })
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  const writerRoles = ["TEAM_LEAD", "DIRECTOR", "ADMIN"]
  if (!writerRoles.includes(session.user.role)) {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 })
  }

  const { id } = await params
  await prisma.qpaAudit.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
