import { after } from "next/server"
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireActiveSession } from "@/lib/session-guard"
import { ingestClosedClaim } from "@/lib/ingest-qms"

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
  }

  const existing = body.status === "Closed"
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
    },
  })

  if (body.status === "Closed" && existing?.status !== "Closed") {
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
