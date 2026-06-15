import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireActiveSession } from "@/lib/session-guard"
import { BACK_CLAIM_STATUSES, type BackClaimStatus } from "@/types/claim"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; bcId: string }> }) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session
  const { id, bcId } = await params

  const body = await req.json() as {
    vendorName?: string
    sentAt?: string | null
    replyDeadline?: string | null
    claimedAmount?: number
    recoveredAmount?: number | null
    status?: string
    notes?: string | null
  }

  // BC-03: status enum 서버 검증
  if (body.status !== undefined && !BACK_CLAIM_STATUSES.includes(body.status as BackClaimStatus)) {
    return NextResponse.json({ error: "유효하지 않은 상태값입니다." }, { status: 400 })
  }

  // BC-05: claimedAmount 타입·범위 검증
  if (body.claimedAmount !== undefined) {
    const amt = Number(body.claimedAmount)
    if (!Number.isInteger(amt) || amt <= 0) {
      return NextResponse.json({ error: "청구 금액은 양의 정수여야 합니다." }, { status: 400 })
    }
  }
  if (body.recoveredAmount !== undefined && body.recoveredAmount !== null) {
    const rec = Number(body.recoveredAmount)
    if (!Number.isFinite(rec) || rec < 0) {
      return NextResponse.json({ error: "회수 금액은 0 이상이어야 합니다." }, { status: 400 })
    }
  }

  // BC-02: bcId가 이 claimId에 속하는지 교차 검증
  const result = await prisma.backClaim.updateMany({
    where: { id: bcId, claimId: id },
    data: {
      ...(body.vendorName       !== undefined && { vendorName:       body.vendorName }),
      ...(body.sentAt           !== undefined && { sentAt:           body.sentAt ? new Date(body.sentAt) : null }),
      ...(body.replyDeadline    !== undefined && { replyDeadline:    body.replyDeadline ? new Date(body.replyDeadline) : null }),
      ...(body.claimedAmount    !== undefined && { claimedAmount:    Number(body.claimedAmount) }),
      ...(body.recoveredAmount  !== undefined && { recoveredAmount:  body.recoveredAmount }),
      ...(body.status           !== undefined && { status:           body.status as never }),
      ...(body.notes            !== undefined && { notes:            body.notes }),
    },
  })
  if (result.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const backClaim = await prisma.backClaim.findUnique({ where: { id: bcId } })
  return NextResponse.json(backClaim)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; bcId: string }> }) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session
  const { id, bcId } = await params

  // BC-02: bcId가 이 claimId에 속하는지 교차 검증
  const result = await prisma.backClaim.deleteMany({ where: { id: bcId, claimId: id } })
  if (result.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ ok: true })
}
