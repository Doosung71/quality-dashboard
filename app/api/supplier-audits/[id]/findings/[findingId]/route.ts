import { NextRequest, NextResponse } from "next/server"
import { requireActiveSession } from "@/lib/session-guard"
import { prisma } from "@/lib/prisma"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ findingId: string }> }) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session
  const { findingId } = await params

  const body = await req.json() as Record<string, unknown>

  const finding = await prisma.auditFinding.update({
    where: { id: findingId },
    data: {
      status:   body.status   as never ?? undefined,
      response: body.response as string ?? undefined,
      dueDate:  body.dueDate  ? new Date(body.dueDate as string) : undefined,
      closedAt: body.status === "CLOSED" ? new Date() : undefined,
    },
  })
  return NextResponse.json(finding)
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ findingId: string }> }) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session
  const { findingId } = await params

  await prisma.auditFinding.delete({ where: { id: findingId } })
  return NextResponse.json({ ok: true })
}
