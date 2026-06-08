import { NextRequest, NextResponse } from "next/server"
import { requireActiveSession } from "@/lib/session-guard"
import { prisma } from "@/lib/prisma"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session
  if (!["DIRECTOR", "ADMIN"].includes(session.user.role ?? "")) {
    return NextResponse.json({ error: "부문장만 수정할 수 있습니다." }, { status: 403 })
  }

  const { id } = await params

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 })
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 })
  }

  const b = body as Record<string, unknown>
  const data: { directorMemo?: string | null; draftOpinion?: string | null } = {}

  if ("directorMemo" in b) {
    const v = b.directorMemo
    data.directorMemo = typeof v === "string" && v.trim() ? v.trim() : null
  }
  if ("draftOpinion" in b) {
    const v = b.draftOpinion
    data.draftOpinion = typeof v === "string" && v.trim() ? v.trim() : null
  }

  const analysis = await prisma.analysis.findFirst({ where: { id } })
  if (!analysis) return NextResponse.json({ error: "분석을 찾을 수 없습니다." }, { status: 404 })

  await prisma.analysis.update({ where: { id }, data })
  return NextResponse.json({ ok: true })
}
