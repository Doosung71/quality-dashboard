import { NextRequest, NextResponse } from "next/server"
import { requireActiveSession } from "@/lib/session-guard"
import { prisma } from "@/lib/prisma"

// GET /api/board/[id] — 게시글 상세 + 댓글
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  const { id } = await params
  const post = await prisma.boardPost.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, name: true, nickname: true, department: true } },
      comments: {
        where: { parentId: null },
        orderBy: { createdAt: "asc" },
        include: {
          author: { select: { id: true, name: true, nickname: true, department: true } },
          replies: {
            orderBy: { createdAt: "asc" },
            include: {
              author: { select: { id: true, name: true, nickname: true, department: true } },
            },
          },
        },
      },
    },
  })
  if (!post) return NextResponse.json({ error: "게시글을 찾을 수 없습니다." }, { status: 404 })
  return NextResponse.json(post)
}

// PATCH /api/board/[id] — 게시글 수정 (제목·내용: 작성자 또는 임원·관리자 / 핀·카테고리: 임원·관리자만)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  const { id } = await params
  const post = await prisma.boardPost.findUnique({ where: { id }, select: { authorId: true } })
  if (!post) return NextResponse.json({ error: "없음" }, { status: 404 })

  const role = session.user.role as string
  const isPrivileged = role === "ADMIN" || role === "DIRECTOR"
  const isAuthor = post.authorId === session.user.id

  if (!isAuthor && !isPrivileged) {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 })
  }

  const { title, content, pinned, category, attachments } = await req.json()
  const data: Record<string, unknown> = {}

  // 제목·내용·첨부파일: 작성자 또는 임원·관리자
  if (title !== undefined) data.title = String(title).trim()
  if (content !== undefined) data.content = String(content).trim()
  if (attachments !== undefined) data.attachments = Array.isArray(attachments) ? attachments : []

  // 핀·카테고리: 임원·관리자만
  if (isPrivileged) {
    if (pinned !== undefined) data.pinned = pinned
    if (category !== undefined) data.category = category
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "변경할 항목 없음" }, { status: 400 })
  }

  data.updatedAt = new Date()
  const updated = await prisma.boardPost.update({ where: { id }, data })
  return NextResponse.json(updated)
}

// DELETE /api/board/[id] — 게시글 삭제 (작성자·관리자·임원)
export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  const { id } = await params
  const post = await prisma.boardPost.findUnique({ where: { id }, select: { authorId: true } })
  if (!post) return NextResponse.json({ error: "없음" }, { status: 404 })

  const role = session.user.role as string
  const isPrivileged = role === "ADMIN" || role === "DIRECTOR"
  if (post.authorId !== session.user.id && !isPrivileged) {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 })
  }

  await prisma.boardPost.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
