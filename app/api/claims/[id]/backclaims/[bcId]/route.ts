import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireActiveSession } from "@/lib/session-guard"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; bcId: string }> }) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session
  const { bcId } = await params

  const body = await req.json() as {
    vendorName?: string
    sentAt?: string | null
    replyDeadline?: string | null
    claimedAmount?: number
    recoveredAmount?: number | null
    status?: string
    notes?: string | null
  }

  const backClaim = await prisma.backClaim.update({
    where: { id: bcId },
    data: {
      ...(body.vendorName       !== undefined && { vendorName:       body.vendorName }),
      ...(body.sentAt           !== undefined && { sentAt:           body.sentAt ? new Date(body.sentAt) : null }),
      ...(body.replyDeadline    !== undefined && { replyDeadline:    body.replyDeadline ? new Date(body.replyDeadline) : null }),
      ...(body.claimedAmount    !== undefined && { claimedAmount:    body.claimedAmount }),
      ...(body.recoveredAmount  !== undefined && { recoveredAmount:  body.recoveredAmount }),
      ...(body.status           !== undefined && { status:           body.status as never }),
      ...(body.notes            !== undefined && { notes:            body.notes }),
    },
  })
  return NextResponse.json(backClaim)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; bcId: string }> }) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session
  const { bcId } = await params

  await prisma.backClaim.delete({ where: { id: bcId } })
  return NextResponse.json({ ok: true })
}
