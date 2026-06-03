import { NextRequest, NextResponse } from "next/server"
import { requireActiveSession } from "@/lib/session-guard"
import { isAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session
  if (!isAdmin(session.user.email, session.user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  const body = await req.json()

  // 자기 자신의 역할·상태·이메일 변경 차단 — 실수로 관리자 계정을 잠그는 것을 방지
  // (이름·부서·연락처·사번 등 기본 정보 편집은 허용)
  if (id === session.user.id && (body.role !== undefined || body.status !== undefined || body.email !== undefined)) {
    return NextResponse.json(
      { error: "자기 자신의 역할·상태·이메일은 변경할 수 없습니다." },
      { status: 403 }
    )
  }

  const VALID_ROLES = ["PRACTITIONER", "TEAM_LEAD", "DIRECTOR", "ADMIN"]
  const VALID_STATUSES = ["ACTIVE", "PENDING", "BANNED", "RESTRICTED"]

  const data: Record<string, unknown> = {}
  // 기본 정보 편집 (관리자 전용)
  if (body.name !== undefined) data.name = String(body.name).trim()
  if (body.email !== undefined) {
    const trimmed = String(body.email).trim()
    if (!trimmed.includes("@")) return NextResponse.json({ error: "유효하지 않은 이메일 형식입니다." }, { status: 400 })
    data.email = trimmed
  }
  if (body.department !== undefined) data.department = body.department || null
  if (body.employeeId !== undefined) data.employeeId = body.employeeId || null
  if (body.phone !== undefined) data.phone = body.phone || null
  if (body.role !== undefined) {
    if (!VALID_ROLES.includes(body.role)) return NextResponse.json({ error: "유효하지 않은 역할입니다." }, { status: 400 })
    data.role = body.role
  }
  // status=RESTRICTED 일 때 restrictedUntil을 함께 처리
  if (body.status !== undefined) {
    if (!VALID_STATUSES.includes(body.status)) return NextResponse.json({ error: "유효하지 않은 상태값입니다." }, { status: 400 })
    data.status = body.status
    if (body.status === "RESTRICTED" && body.restrictedUntil) {
      data.restrictedUntil = new Date(body.restrictedUntil)
    }
    // 정지 해제·복구 시 restrictedUntil 초기화
    if (body.status === "ACTIVE" || body.status === "BANNED") {
      data.restrictedUntil = null
    }
  }

  const user = await prisma.user.update({ where: { id }, data })
  return NextResponse.json(user)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session
  if (!isAdmin(session.user.email, session.user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  const target = await prisma.user.findUnique({ where: { id }, select: { email: true, role: true } })
  if (!target) return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 })
  if (isAdmin(target.email, target.role)) return NextResponse.json({ error: "관리자 계정은 삭제할 수 없습니다." }, { status: 403 })

  // QD·TRA가 같은 DB를 공유하므로 연관 데이터를 순서대로 삭제
  await prisma.$transaction(async (tx) => {
    // 1. 사용자가 작성한 댓글·피드백 삭제
    await tx.feedbackReply.deleteMany({ where: { authorId: id } })
    await tx.feedback.deleteMany({ where: { authorId: id } })
    await tx.comment.deleteMany({ where: { authorId: id } })

    // 2. 사용자가 참여한 리뷰 이력 삭제
    await tx.reviewHistory.deleteMany({ where: { userId: id } })

    // 3. 사용자가 생성한 입찰 건 및 하위 데이터 삭제
    const tenders = await tx.tender.findMany({
      where: { createdById: id },
      select: { id: true },
    })
    const tenderIds = tenders.map((t) => t.id)

    if (tenderIds.length > 0) {
      const analyses = await tx.analysis.findMany({
        where: { tenderId: { in: tenderIds } },
        select: { id: true },
      })
      const analysisIds = analyses.map((a) => a.id)

      if (analysisIds.length > 0) {
        await tx.comment.deleteMany({ where: { analysisId: { in: analysisIds } } })
        await tx.reviewHistory.deleteMany({ where: { analysisId: { in: analysisIds } } })
        await tx.specRequirement.deleteMany({ where: { analysisId: { in: analysisIds } } })
        await tx.analysis.deleteMany({ where: { id: { in: analysisIds } } })
      }
      await tx.tenderDocument.deleteMany({ where: { tenderId: { in: tenderIds } } })
      await tx.tender.deleteMany({ where: { id: { in: tenderIds } } })
    }

    // 4. 사용자 삭제
    await tx.user.delete({ where: { id } })
  })

  return NextResponse.json({ ok: true })
}
