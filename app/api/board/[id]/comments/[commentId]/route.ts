import { NextRequest, NextResponse } from "next/server"
import { requireActiveSession } from "@/lib/session-guard"
import { prisma } from "@/lib/prisma"

// PATCH /api/board/[id]/comments/[commentId] — 댓글 수정 (작성자·임원·관리자)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  const { commentId } = await params
  const comment = await prisma.boardComment.findUnique({
    where: { id: commentId },
    select: { authorId: true },
  })
  if (!comment) return NextResponse.json({ error: "없음" }, { status: 404 })

  const role = session.user.role as string
  const isPrivileged = role === "ADMIN" || role === "DIRECTOR"
  if (comment.authorId !== session.user.id && !isPrivileged) {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 })
  }

  const { content } = await req.json()
  if (!content?.trim()) return NextResponse.json({ error: "내용을 입력하세요." }, { status: 400 })

  const updated = await prisma.boardComment.update({
    where: { id: commentId },
    data: { content: content.trim() },
    include: {
      author: { select: { id: true, name: true, nickname: true, department: true } },
      replies: { include: { author: { select: { id: true, name: true, nickname: true, department: true } } } },
    },
  })
  return NextResponse.json(updated)
}

// DELETE /api/board/[id]/comments/[commentId]
export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  const { commentId } = await params
  const comment = await prisma.boardComment.findUnique({
    where: { id: commentId },
    select: { authorId: true },
  })
  if (!comment) return NextResponse.json({ error: "없음" }, { status: 404 })

  const role = session.user.role as string
  const isPrivileged = role === "ADMIN" || role === "DIRECTOR"
  if (comment.authorId !== session.user.id && !isPrivileged) {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 })
  }

  await prisma.boardComment.delete({ where: { id: commentId } })
  return NextResponse.json({ ok: true })
}
