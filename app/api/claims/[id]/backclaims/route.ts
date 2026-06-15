import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireActiveSession } from "@/lib/session-guard"
import { BACK_CLAIM_STATUSES, type BackClaimStatus } from "@/types/claim"

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

  // BC-05: claimedAmount 타입·범위 검증
  const claimedAmount = Number(body.claimedAmount)
  if (!Number.isInteger(claimedAmount) || claimedAmount <= 0) {
    return NextResponse.json({ error: "청구 금액은 양의 정수여야 합니다." }, { status: 400 })
  }

  // BC-03: status enum 서버 검증
  const status = body.status ?? "DRAFT"
  if (!BACK_CLAIM_STATUSES.includes(status as BackClaimStatus)) {
    return NextResponse.json({ error: "유효하지 않은 상태값입니다." }, { status: 400 })
  }

  const backClaim = await prisma.backClaim.create({
    data: {
      claimId:         id,
      vendorName:      body.vendorName.trim(),
      sentAt:          body.sentAt ? new Date(body.sentAt) : null,
      replyDeadline:   body.replyDeadline ? new Date(body.replyDeadline) : null,
      claimedAmount,
      recoveredAmount: body.recoveredAmount ?? null,
      status:          status as never,
      notes:           body.notes?.trim() ?? null,
    },
  })
  return NextResponse.json(backClaim, { status: 201 })
}
