import { NextRequest, NextResponse } from "next/server"
import { requireActiveSession } from "@/lib/session-guard"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session
  const { id: auditId } = await params

  const body = await req.json() as {
    category: string; description: string; severity: string
    requirement?: string; dueDate?: string
  }

  if (!body.category || !body.description) {
    return NextResponse.json({ error: "필수 항목 누락" }, { status: 400 })
  }

  const finding = await prisma.auditFinding.create({
    data: {
      auditId,
      category:    body.category,
      description: body.description,
      severity:    body.severity as never,
      requirement: body.requirement,
      dueDate:     body.dueDate ? new Date(body.dueDate) : undefined,
    },
  })
  return NextResponse.json(finding, { status: 201 })
}
