import { NextRequest, NextResponse } from "next/server"
import { requireActiveSession } from "@/lib/session-guard"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session
  if (session.user.role !== "TEAM_LEAD") {
    return NextResponse.json({ error: "팀장만 승인할 수 있습니다." }, { status: 403 })
  }

  const { id: analysisId } = await params

  let reason: string | null = null
  try {
    const body: unknown = await req.json()
    if (typeof body === "object" && body !== null) {
      const r = (body as Record<string, unknown>).reason
      if (typeof r === "string" && r.trim()) reason = r.trim()
    }
  } catch {
    // body 없음 — 정상
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.analysis.updateMany({
      where: { id: analysisId, status: "DRAFT", submittedAt: { not: null } },
      data: { status: "REVIEWED" },
    })
    if (updated.count === 0) return null

    await tx.reviewHistory.create({
      data: {
        analysisId,
        userId: session.user.id,
        action: "REVIEW_APPROVE",
        fromStatus: "DRAFT",
        toStatus: "REVIEWED",
        ...(reason ? { reason } : {}),
      },
    })
    return true
  })

  if (!result) {
    return NextResponse.json({ error: "이미 처리됐거나 조건이 맞지 않습니다." }, { status: 409 })
  }

  return NextResponse.json({ ok: true })
}
