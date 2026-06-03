import { NextRequest, NextResponse } from "next/server"
import { requireActiveSession } from "@/lib/session-guard"
import { prisma } from "@/lib/prisma"
import { canView } from "@/lib/board-visibility"

// POST /api/board/[id]/comments — 댓글·대댓글 작성
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  const { id: postId } = await params

  // 게시글 존재 및 visibility 확인
  const post = await prisma.boardPost.findUnique({ where: { id: postId }, select: { visibility: true } })
  if (!post) return NextResponse.json({ error: "게시글을 찾을 수 없습니다." }, { status: 404 })
  if (!canView(post.visibility, session.user.role)) {
    return NextResponse.json({ error: "이 게시글에 댓글을 작성할 권한이 없습니다." }, { status: 403 })
  }

  const { content, parentId, displayMode, visibility } = await req.json()
  if (!content?.trim()) {
    return NextResponse.json({ error: "내용을 입력하세요." }, { status: 400 })
  }

  const comment = await prisma.boardComment.create({
    data: {
      postId,
      authorId: session.user.id,
      content: content.trim(),
      parentId: parentId ?? null,
      displayMode: ["REAL","NICKNAME","ANONYMOUS"].includes(displayMode) ? displayMode : "REAL",
      visibility: ["ALL","TEAM_LEAD_UP","DIRECTOR_UP"].includes(visibility) ? visibility : "ALL",
    },
    include: {
      author: { select: { id: true, name: true, nickname: true, department: true } },
      replies: { include: { author: { select: { id: true, name: true, nickname: true, department: true } } } },
    },
  })
  return NextResponse.json(comment, { status: 201 })
}

// DELETE /api/board/[id]/comments/[commentId] 는 별도 라우트로 처리
