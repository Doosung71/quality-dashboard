import { NextRequest, NextResponse } from "next/server"
import { requireActiveSession } from "@/lib/session-guard"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session
  if (!["TEAM_LEAD", "DIRECTOR", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "팀장 이상 권한 필요" }, { status: 403 })
  }

  const { id } = await params
  const { reason } = await req.json() as { reason?: string }
  const analysis = await prisma.contractAnalysis.findUnique({ where: { id } })
  if (!analysis || analysis.status !== "DRAFT") return NextResponse.json({ error: "검토 요청 상태가 아닙니다." }, { status: 400 })

  await prisma.$transaction([
    prisma.contractAnalysis.update({ where: { id }, data: { submittedAt: null } }),
    prisma.contractReviewHistory.create({
      data: { analysisId: id, userId: session.user.id, action: "REVIEW_REJECT", fromStatus: "DRAFT", toStatus: "DRAFT", reason },
    }),
  ])

  return NextResponse.json({ ok: true })
}
