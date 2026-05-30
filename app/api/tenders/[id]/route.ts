import { NextRequest, NextResponse } from "next/server"
import { requireActiveSession } from "@/lib/session-guard"
import { prisma } from "@/lib/prisma"
import { deleteBlob } from "@/lib/storage"

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  const { id } = await params

  let title: unknown
  try {
    const body = await req.json()
    title = (body as Record<string, unknown>).title
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 })
  }
  if (typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "입찰명을 입력해주세요." }, { status: 400 })
  }

  const tender = await prisma.tender.findFirst({
    where: { id, createdById: session.user.id },
  })
  if (!tender) return NextResponse.json({ error: "입찰을 찾을 수 없습니다." }, { status: 404 })

  await prisma.tender.update({ where: { id }, data: { title: title.trim() } })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  const { id } = await params

  const tender = await prisma.tender.findFirst({
    where: { id, createdById: session.user.id },
    include: {
      analyses: { select: { id: true, status: true } },
      documents: { select: { storagePath: true } },
    },
  })
  if (!tender) return NextResponse.json({ error: "입찰을 찾을 수 없습니다." }, { status: 404 })

  const blocked = tender.analyses.some(
    (a) => a.status === "REVIEWED" || a.status === "APPROVED"
  )
  if (blocked) {
    return NextResponse.json(
      { error: "팀장 승인 이후에는 삭제할 수 없습니다." },
      { status: 403 }
    )
  }

  const analysisIds = tender.analyses.map((a) => a.id)

  await prisma.$transaction(async (tx) => {
    if (analysisIds.length > 0) {
      await tx.comment.deleteMany({ where: { analysisId: { in: analysisIds } } })
      await tx.reviewHistory.deleteMany({ where: { analysisId: { in: analysisIds } } })
      await tx.specRequirement.deleteMany({ where: { analysisId: { in: analysisIds } } })
      await tx.analysis.deleteMany({ where: { tenderId: id } })
    }
    await tx.tenderDocument.deleteMany({ where: { tenderId: id } })
    await tx.tender.delete({ where: { id } })
  })

  for (const doc of tender.documents) {
    await deleteBlob(doc.storagePath)
  }

  return NextResponse.json({ ok: true })
}
