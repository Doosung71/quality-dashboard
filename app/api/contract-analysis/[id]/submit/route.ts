import { NextRequest, NextResponse } from "next/server"
import { requireActiveSession } from "@/lib/session-guard"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  const { id } = await params
  const analysis = await prisma.contractAnalysis.findUnique({ where: { id } })
  if (!analysis) return NextResponse.json({ error: "분석을 찾을 수 없습니다." }, { status: 404 })
  if (analysis.status !== "DRAFT") return NextResponse.json({ error: "DRAFT 상태에서만 검토 요청 가능합니다." }, { status: 400 })

  await prisma.$transaction([
    prisma.contractAnalysis.update({ where: { id }, data: { submittedAt: new Date() } }),
    prisma.contractReviewHistory.create({
      data: { analysisId: id, userId: session.user.id, action: "SUBMIT_FOR_REVIEW", fromStatus: "DRAFT", toStatus: "DRAFT" },
    }),
  ])

  return NextResponse.json({ ok: true })
}
