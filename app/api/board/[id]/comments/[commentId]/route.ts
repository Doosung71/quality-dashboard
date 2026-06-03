import { NextRequest, NextResponse } from "next/server"
import { requireActiveSession } from "@/lib/session-guard"
import { prisma } from "@/lib/prisma"
import { isPrivileged } from "@/lib/board-visibility"

// PATCH /api/board/[id]/comments/[commentId] — 내용·visibility 수정 (작성자·임원·ADMIN)
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
  if (comment.authorId !== session.user.id && !isPrivileged(role)) {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 })
  }

  const { content, visibility } = await req.json()
  const data: Record<string, unknown> = {}
  if (content?.trim()) data.content = content.trim()
  if (visibility && ["ALL","TEAM_LEAD_UP","DIRECTOR_UP"].includes(visibility)) data.visibility = visibility

  if (!data.content && !data.visibility) {
    return NextResponse.json({ error: "변경할 항목 없음" }, { status: 400 })
  }

  const updated = await prisma.boardComment.update({
    where: { id: commentId },
    data,
    include: {
      author: { select: { id: true, name: true, nickname: true, department: true } },
      replies: {
        include: { author: { select: { id: true, name: true, nickname: true, department: true } } },
      },
    },
  })
  return NextResponse.json(updated)
}

// DELETE /api/board/[id]/comments/[commentId] — 작성자·임원·ADMIN
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
  if (comment.authorId !== session.user.id && !isPrivileged(role)) {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 })
  }

  await prisma.boardComment.delete({ where: { id: commentId } })
  return NextResponse.json({ ok: true })
}
