import { NextRequest, NextResponse } from "next/server"
import { requireActiveSession } from "@/lib/session-guard"
import { prisma } from "@/lib/prisma"
import { deleteBlob } from "@/lib/storage"

const SYS_FIELDS = ["voltage", "bilSil", "shortCircuit", "installCond", "groundConfig", "requiredCapacity"] as const

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session
  if (!["PRACTITIONER", "ADMIN"].includes(session.user.role ?? "")) {
    return NextResponse.json({ error: "실무자만 수정할 수 있습니다." }, { status: 403 })
  }

  const { id } = await params

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 })
  }

  const isAdmin = session.user.role === "ADMIN"
  const analysis = await prisma.analysis.findFirst({
    where: {
      id,
      status: "DRAFT",
      submittedAt: null,
      ...(isAdmin ? {} : { tender: { createdById: session.user.id } }),
    },
  })
  if (!analysis) return NextResponse.json({ error: "수정할 수 없는 상태입니다." }, { status: 409 })

  const b = body as Record<string, unknown>
  const data: Record<string, string | null> = {}
  for (const f of SYS_FIELDS) {
    if (f in b) {
      const v = b[f]
      data[f] = typeof v === "string" && v.trim() ? v.trim() : null
    }
  }

  await prisma.analysis.update({ where: { id }, data })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session
  if (!["PRACTITIONER", "ADMIN"].includes(session.user.role ?? "")) {
    return NextResponse.json({ error: "실무자만 삭제할 수 있습니다." }, { status: 403 })
  }

  const { id } = await params

  const isAdmin = session.user.role === "ADMIN"
  const analysis = await prisma.analysis.findFirst({
    where: {
      id,
      status: "DRAFT",
      submittedAt: null,
      ...(isAdmin ? {} : { tender: { createdById: session.user.id } }),
    },
    include: { document: { select: { id: true, storagePath: true } } },
  })
  if (!analysis) return NextResponse.json({ error: "삭제할 수 없는 상태입니다." }, { status: 409 })

  await prisma.$transaction([
    prisma.comment.deleteMany({ where: { analysisId: id } }),
    prisma.reviewHistory.deleteMany({ where: { analysisId: id } }),
    prisma.specRequirement.deleteMany({ where: { analysisId: id } }),
    prisma.analysis.delete({ where: { id } }),
  ])

  // 이 분석에만 연결된 문서는 Blob에서도 삭제
  if (analysis.documentId) {
    const stillUsed = await prisma.analysis.findFirst({ where: { documentId: analysis.documentId } })
    if (!stillUsed && analysis.document) await deleteBlob(analysis.document.storagePath).catch(() => {})
  }

  return NextResponse.json({ ok: true })
}
