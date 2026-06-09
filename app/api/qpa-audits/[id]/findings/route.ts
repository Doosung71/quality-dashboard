import { NextRequest, NextResponse } from "next/server"
import { requireActiveSession } from "@/lib/session-guard"
import { prisma } from "@/lib/prisma"

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session
  const { id: auditId } = await params

  const findings = await prisma.qpaFinding.findMany({
    where:   { auditId },
    orderBy: { seq: "asc" },
  })
  return NextResponse.json(findings)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  const writerRoles = ["TEAM_LEAD", "DIRECTOR", "ADMIN"]
  if (!writerRoles.includes(session.user.role)) {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 })
  }

  const { id: auditId } = await params
  const body = await req.json() as {
    category:    string
    finding:     string
    action?:     string
    responsible?: string
    dueDate?:    string
  }

  if (!body.category || !body.finding) {
    return NextResponse.json({ error: "필수 항목 누락" }, { status: 400 })
  }

  const last = await prisma.qpaFinding.findFirst({
    where:   { auditId },
    orderBy: { seq: "desc" },
    select:  { seq: true },
  })
  const seq = (last?.seq ?? 0) + 1

  const finding = await prisma.qpaFinding.create({
    data: {
      auditId,
      seq,
      category:    body.category,
      finding:     body.finding,
      action:      body.action      ?? "",
      responsible: body.responsible ?? "",
      dueDate:     body.dueDate ? new Date(body.dueDate) : undefined,
    },
  })
  return NextResponse.json(finding, { status: 201 })
}
