import { NextRequest, NextResponse } from "next/server"
import { requireActiveSession } from "@/lib/session-guard"
import { prisma } from "@/lib/prisma"

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session
  const { id } = await params

  const audit = await prisma.supplierAudit.findUnique({
    where: { id },
    include: {
      findings: { orderBy: [{ severity: "asc" }, { createdAt: "asc" }] },
      createdBy: { select: { name: true, nickname: true } },
    },
  })
  if (!audit) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(audit)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session
  const { id } = await params

  const body = await req.json() as Record<string, unknown>

  const audit = await prisma.supplierAudit.update({
    where: { id },
    data: {
      auditDate:    body.auditDate    ? new Date(body.auditDate as string) : undefined,
      auditType:    body.auditType    as never ?? undefined,
      auditor:      body.auditor      as string ?? undefined,
      location:     body.location     as string ?? undefined,
      overallGrade: body.overallGrade as string ?? undefined,
      totalScore:   body.totalScore   as number ?? undefined,
      status:       body.status       as never ?? undefined,
      summary:      body.summary      as string ?? undefined,
      ...(body.attachments !== undefined && { attachments: body.attachments as never }),
    },
  })
  return NextResponse.json({ id: audit.id })
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session
  const { id } = await params

  await prisma.supplierAudit.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
