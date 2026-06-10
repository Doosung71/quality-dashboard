import { NextRequest, NextResponse } from "next/server"
import { requireActiveSession } from "@/lib/session-guard"
import { prisma } from "@/lib/prisma"

type Ctx = { params: Promise<{ id: string }> }

async function getEditableRequirement(reqId: string, userId: string) {
  return prisma.specRequirement.findFirst({
    where: {
      id: reqId,
      analysis: { status: "DRAFT", submittedAt: null, tender: { createdById: userId } },
    },
  })
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session


  const { id } = await params

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 })
  }

  const requirement = await getEditableRequirement(id, session.user.id)
  if (!requirement) return NextResponse.json({ error: "수정할 수 없는 상태입니다." }, { status: 409 })

  const b = body as Record<string, unknown>
  const data: Record<string, unknown> = {}
  if (typeof b.category === "string" && b.category.trim()) data.category = b.category.trim()
  if (typeof b.content === "string" && b.content.trim()) data.content = b.content.trim()
  if (typeof b.isRisk === "boolean") data.isRisk = b.isRisk
  if (typeof b.isVE === "boolean") data.isVE = b.isVE
  if ("sourcePage" in b) data.sourcePage = typeof b.sourcePage === "number" ? b.sourcePage : null

  await prisma.specRequirement.update({ where: { id }, data })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session


  const { id } = await params

  const requirement = await getEditableRequirement(id, session.user.id)
  if (!requirement) return NextResponse.json({ error: "삭제할 수 없는 상태입니다." }, { status: 409 })

  await prisma.specRequirement.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
