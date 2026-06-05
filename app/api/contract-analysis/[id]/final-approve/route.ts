import { NextRequest, NextResponse } from "next/server"
import { requireActiveSession } from "@/lib/session-guard"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session
  if (!["DIRECTOR", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "부문장 이상 권한 필요" }, { status: 403 })
  }

  const { id } = await params
  const { draftOpinion, directorMemo } = await req.json() as { draftOpinion?: string; directorMemo?: string }
  const analysis = await prisma.contractAnalysis.findUnique({ where: { id } })
  if (!analysis || analysis.status !== "REVIEWED") return NextResponse.json({ error: "팀장 승인 상태가 아닙니다." }, { status: 400 })

  await prisma.$transaction([
    prisma.contractAnalysis.update({ where: { id }, data: { status: "APPROVED", draftOpinion, directorMemo } }),
    prisma.contractReviewHistory.create({
      data: { analysisId: id, userId: session.user.id, action: "FINAL_APPROVE", fromStatus: "REVIEWED", toStatus: "APPROVED" },
    }),
    prisma.awardedProject.update({
      where: { id: analysis.projectId },
      data: { status: "COMPLETED" },
    }),
  ])

  return NextResponse.json({ ok: true })
}
