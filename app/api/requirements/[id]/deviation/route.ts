import { NextRequest, NextResponse } from "next/server"
import { requireActiveSession } from "@/lib/session-guard"
import { prisma } from "@/lib/prisma"
import { type DeviationType } from "@/lib/generated/prisma/enums"

const VALID_DEVIATION_TYPE = new Set(["DEVIATION", "CLARIFICATION", "ASSUMPTION"])

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

  if (!("deviationType" in b)) {
    return NextResponse.json({ error: "deviationType 필드가 필요합니다." }, { status: 400 })
  }

  const deviationType = b.deviationType
  if (deviationType !== null && !VALID_DEVIATION_TYPE.has(deviationType as string)) {
    return NextResponse.json({ error: "올바르지 않은 deviationType 값입니다." }, { status: 400 })
  }

  const requirement = await prisma.specRequirement.findFirst({
    where: role === "PRACTITIONER"
      ? { id, analysis: { status: "DRAFT", submittedAt: null, tender: { createdById: session.user.id } } }
      : { id, analysis: { status: "DRAFT", submittedAt: { not: null } } },
    select: { id: true },
  })
  if (!requirement) return NextResponse.json({ error: "수정할 수 없는 상태입니다." }, { status: 409 })

  const deviationText = b.deviationText
  const textValue = typeof deviationText === "string" && deviationText.trim()
    ? deviationText.trim()
    : null

  await prisma.specRequirement.update({
    where: { id },
    data: {
      deviationType: (deviationType as DeviationType | null) ?? null,
      deviationText: deviationType === null ? null : textValue,
    },
  })

  return NextResponse.json({ ok: true })
}
