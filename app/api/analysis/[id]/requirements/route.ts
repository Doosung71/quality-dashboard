import { NextRequest, NextResponse } from "next/server"
import { requireActiveSession } from "@/lib/session-guard"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session
  if (!["PRACTITIONER", "ADMIN"].includes(session.user.role ?? "")) {
    return NextResponse.json({ error: "실무자만 추가할 수 있습니다." }, { status: 403 })
  }

  const { id: analysisId } = await params

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 })
  }

  const isAdmin = session.user.role === "ADMIN"
  const analysis = await prisma.analysis.findFirst({
    where: {
      id: analysisId,
      status: "DRAFT",
      submittedAt: null,
      ...(isAdmin ? {} : { tender: { createdById: session.user.id } }),
    },
  })
  if (!analysis) return NextResponse.json({ error: "수정할 수 없는 상태입니다." }, { status: 409 })

  const b = body as Record<string, unknown>
  if (typeof b.category !== "string" || !b.category.trim()) {
    return NextResponse.json({ error: "분류를 입력해주세요." }, { status: 400 })
  }
  if (typeof b.content !== "string" || !b.content.trim()) {
    return NextResponse.json({ error: "내용을 입력해주세요." }, { status: 400 })
  }

  const requirement = await prisma.specRequirement.create({
    data: {
      analysisId,
      category: b.category.trim(),
      content: b.content.trim(),
      isRisk: b.isRisk === true,
      isVE: b.isVE === true,
      sourcePage: typeof b.sourcePage === "number" ? b.sourcePage : null,
      sourceText: typeof b.sourceText === "string" && b.sourceText.trim() ? b.sourceText.trim() : null,
    },
  })

  return NextResponse.json({ id: requirement.id })
}
