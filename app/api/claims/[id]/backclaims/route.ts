import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireActiveSession } from "@/lib/session-guard"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session
  const { id } = await params

  const backClaims = await prisma.backClaim.findMany({
    where: { claimId: id },
    orderBy: { createdAt: "asc" },
  })
  return NextResponse.json(backClaims)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session
  const { id } = await params

  const body = await req.json() as {
    vendorName: string
    sentAt?: string
    replyDeadline?: string
    claimedAmount: number
    recoveredAmount?: number
    status?: string
    notes?: string
  }

  if (!body.vendorName?.trim()) {
    return NextResponse.json({ error: "업체명은 필수입니다." }, { status: 400 })
  }
  if (!body.claimedAmount || body.claimedAmount <= 0) {
    return NextResponse.json({ error: "청구 금액은 0보다 커야 합니다." }, { status: 400 })
  }

  const backClaim = await prisma.backClaim.create({
    data: {
      claimId:         id,
      vendorName:      body.vendorName.trim(),
      sentAt:          body.sentAt ? new Date(body.sentAt) : null,
      replyDeadline:   body.replyDeadline ? new Date(body.replyDeadline) : null,
      claimedAmount:   body.claimedAmount,
      recoveredAmount: body.recoveredAmount ?? null,
      status:          (body.status ?? "DRAFT") as never,
      notes:           body.notes?.trim() ?? null,
    },
  })
  return NextResponse.json(backClaim, { status: 201 })
}
