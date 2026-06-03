import { NextRequest, NextResponse } from "next/server"
import { requireActiveSession } from "@/lib/session-guard"
import { isAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session
  if (!isAdmin(session.user.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  const body = await req.json()

  // status=RESTRICTED 일 때 restrictedUntil을 함께 처리
  const data: Record<string, unknown> = {}
  if (body.role) data.role = body.role
  if (body.status) {
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
  if (!isAdmin(session.user.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  const target = await prisma.user.findUnique({ where: { id }, select: { email: true } })
  if (!target) return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 })
  if (isAdmin(target.email)) return NextResponse.json({ error: "관리자 계정은 삭제할 수 없습니다." }, { status: 403 })

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
