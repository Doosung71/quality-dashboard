import { NextRequest, NextResponse } from "next/server"
import { requireActiveSession } from "@/lib/session-guard"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session
  if (!["DIRECTOR", "ADMIN"].includes(session.user.role ?? "")) {
    return NextResponse.json({ error: "부문장만 반려할 수 있습니다." }, { status: 403 })
  }

  const { id: analysisId } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 })
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 })
  }
  const reason: unknown = (body as Record<string, unknown>).reason
  if (typeof reason !== "string" || !reason.trim()) {
    return NextResponse.json({ error: "반려 사유가 필요합니다." }, { status: 400 })
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.analysis.updateMany({
      where: { id: analysisId, status: "REVIEWED" },
      data: { status: "DRAFT", submittedAt: null },
    })
    if (updated.count === 0) return null

    await tx.reviewHistory.create({
      data: {
        analysisId,
        userId: session.user.id,
        action: "FINAL_REJECT",
        fromStatus: "REVIEWED",
        toStatus: "DRAFT",
        reason: reason.trim(),
      },
    })
    return true
  })

  if (!result) {
    return NextResponse.json({ error: "이미 처리됐거나 조건이 맞지 않습니다." }, { status: 409 })
  }

  return NextResponse.json({ ok: true })
}
