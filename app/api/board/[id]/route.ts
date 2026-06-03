import { NextRequest, NextResponse } from "next/server"
import { requireActiveSession } from "@/lib/session-guard"
import { prisma } from "@/lib/prisma"
import { canView, isAdmin, isPrivileged } from "@/lib/board-visibility"

const VALID_VISIBILITY = ["ALL", "TEAM_LEAD_UP", "DIRECTOR_UP"]

// GET /api/board/[id] — 게시글 상세 + 댓글 (visibility 필터)
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  const { id } = await params
  const role = session.user.role as string

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

  // 게시글 visibility 확인
  if (!canView(post.visibility, role)) {
    return NextResponse.json({ error: "접근 권한이 없습니다." }, { status: 403 })
  }

  // 댓글·대댓글 visibility 필터링
  const filteredComments = post.comments
    .filter(c => canView(c.visibility, role))
    .map(c => ({
      ...c,
      replies: c.replies.filter(r => canView(r.visibility, role)),
    }))

  return NextResponse.json({ ...post, comments: filteredComments })
}

// PATCH /api/board/[id] — 게시글 수정
// - 제목·내용·첨부·visibility: 작성자 또는 ADMIN
// - 공지·핀·카테고리: 임원(DIRECTOR)·ADMIN
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  const { id } = await params
  const post = await prisma.boardPost.findUnique({ where: { id }, select: { authorId: true } })
  if (!post) return NextResponse.json({ error: "없음" }, { status: 404 })

  const role = session.user.role as string
  const admin = isAdmin(role)
  const privileged = isPrivileged(role)
  const isAuthor = post.authorId === session.user.id

  if (!isAuthor && !privileged) {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 })
  }

  const { title, content, pinned, category, attachments, visibility } = await req.json()
  const data: Record<string, unknown> = {}

  // 작성자·ADMIN: 제목·내용·첨부·visibility
  if (isAuthor || admin) {
    if (title !== undefined)       data.title = String(title).trim()
    if (content !== undefined)     data.content = String(content).trim()
    if (attachments !== undefined) data.attachments = Array.isArray(attachments) ? attachments : []
    if (visibility !== undefined && VALID_VISIBILITY.includes(visibility)) data.visibility = visibility
  } else if (privileged) {
    // DIRECTOR만 (작성자 아닐 때): visibility 편집 허용
    if (visibility !== undefined && VALID_VISIBILITY.includes(visibility)) data.visibility = visibility
    if (title !== undefined)       data.title = String(title).trim()
    if (content !== undefined)     data.content = String(content).trim()
    if (attachments !== undefined) data.attachments = Array.isArray(attachments) ? attachments : []
  }

  // 임원·ADMIN: 공지·핀·카테고리
  if (privileged) {
    if (pinned !== undefined)   data.pinned = pinned
    if (category !== undefined) data.category = category
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "변경할 항목 없음" }, { status: 400 })
  }

  data.updatedAt = new Date()
  const updated = await prisma.boardPost.update({ where: { id }, data })
  return NextResponse.json(updated)
}

// DELETE /api/board/[id] — 작성자·임원·ADMIN
export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  const { id } = await params
  const post = await prisma.boardPost.findUnique({ where: { id }, select: { authorId: true } })
  if (!post) return NextResponse.json({ error: "없음" }, { status: 404 })

  const role = session.user.role as string
  if (post.authorId !== session.user.id && !isPrivileged(role)) {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 })
  }

  await prisma.boardPost.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
