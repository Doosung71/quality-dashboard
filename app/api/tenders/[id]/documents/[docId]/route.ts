import { NextRequest, NextResponse } from "next/server"
import { requireActiveSession } from "@/lib/session-guard"
import { prisma } from "@/lib/prisma"
import { deleteBlob } from "@/lib/storage"

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> },
) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session
  const { id: tenderId, docId } = await params

  // 역할에 관계없이 본인이 생성한 tender의 문서만 삭제 가능
  const doc = await prisma.tenderDocument.findFirst({
    where: {
      id: docId,
      tenderId,
      tender: { createdById: session.user.id },
    },
  })
  if (!doc) return NextResponse.json({ error: "파일을 찾을 수 없습니다." }, { status: 404 })

  const blockers = await prisma.analysis.findMany({
    where: {
      documentId: docId,
      OR: [{ status: "REVIEWED" }, { status: "APPROVED" }, { submittedAt: { not: null } }],
    },
    select: { id: true },
  })
  if (blockers.length > 0) {
    return NextResponse.json(
      { error: "검토 중이거나 승인된 분석이 이 파일을 참조하고 있어 삭제할 수 없습니다." },
      { status: 409 },
    )
  }

  await prisma.$transaction([
    prisma.analysis.updateMany({
      where: { documentId: docId, status: "DRAFT", submittedAt: null },
      data: { documentId: null },
    }),
    prisma.tenderDocument.delete({ where: { id: docId } }),
  ])

  await deleteBlob(doc.storagePath)

  return NextResponse.json({ ok: true })
}
