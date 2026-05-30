import { NextRequest, NextResponse } from "next/server"
import { requireActiveSession } from "@/lib/session-guard"
import { prisma } from "@/lib/prisma"

const VALID_COMPLY = new Set(["COMPLY", "NON_COMPLY", "TBD"])

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  const role = session.user.role
  if (role !== "PRACTITIONER" && role !== "TEAM_LEAD") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 })
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

  const requirement = await prisma.specRequirement.findFirst({
    where: role === "PRACTITIONER"
      ? { id, analysis: { status: "DRAFT", submittedAt: null, tender: { createdById: session.user.id } } }
      : { id, analysis: { status: "DRAFT", submittedAt: { not: null } } },
    select: { id: true },
  })
  if (!requirement) return NextResponse.json({ error: "수정할 수 없는 상태입니다." }, { status: 409 })

  const data: Record<string, unknown> = {}
  if ("comply" in b) {
    const v = b.comply
    if (v !== null && !VALID_COMPLY.has(v as string)) {
      return NextResponse.json({ error: "올바르지 않은 comply 값입니다." }, { status: 400 })
    }
    data.comply = v ?? null
  }
  if ("remark" in b) {
    const v = b.remark
    data.remark = typeof v === "string" && v.trim() ? v.trim() : null
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "수정할 필드가 없습니다." }, { status: 400 })
  }

  await prisma.specRequirement.update({ where: { id }, data })
  return NextResponse.json({ ok: true })
}
