import { NextRequest, NextResponse } from "next/server"
import { requireActiveSession } from "@/lib/session-guard"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session
  if (session.user.role !== "PRACTITIONER") {
    return NextResponse.json({ error: "실무자만 제출할 수 있습니다." }, { status: 403 })
  }

  const { id: analysisId } = await params

  let message: string | null = null
  try {
    const body: unknown = await req.json()
    if (typeof body === "object" && body !== null) {
      const m = (body as Record<string, unknown>).message
      if (typeof m === "string" && m.trim()) message = m.trim()
    }
  } catch {
    // body 없음 — 정상
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.analysis.updateMany({
      where: {
        id: analysisId,
        status: "DRAFT",
        submittedAt: null,
        tender: { createdById: session.user.id },
      },
      data: { submittedAt: new Date() },
    })
    if (updated.count === 0) return null

    await tx.reviewHistory.create({
      data: {
        analysisId,
        userId: session.user.id,
        action: "SUBMIT_FOR_REVIEW",
        fromStatus: "DRAFT",
        toStatus: "DRAFT",
        ...(message ? { reason: message } : {}),
      },
    })
    return true
  })

  if (!result) {
    return NextResponse.json({ error: "이미 제출됐거나 조건이 맞지 않습니다." }, { status: 409 })
  }

  return NextResponse.json({ ok: true })
}
