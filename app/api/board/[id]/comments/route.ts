import { NextRequest, NextResponse } from "next/server"
import { requireActiveSession } from "@/lib/session-guard"
import { prisma } from "@/lib/prisma"

// POST /api/board/[id]/comments — 댓글·대댓글 작성
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  const { id: postId } = await params
  const { content, parentId, displayMode } = await req.json()
  if (!content?.trim()) {
    return NextResponse.json({ error: "내용을 입력하세요." }, { status: 400 })
  }

  const comment = await prisma.boardComment.create({
    data: {
      postId,
      authorId: session.user.id,
      content: content.trim(),
      parentId: parentId ?? null,
      displayMode: ["REAL", "NICKNAME", "ANONYMOUS"].includes(displayMode) ? displayMode : "REAL",
    },
    include: {
      author: { select: { id: true, name: true, nickname: true, department: true } },
      replies: { include: { author: { select: { id: true, name: true, nickname: true, department: true } } } },
    },
  })
  return NextResponse.json(comment, { status: 201 })
}

// DELETE /api/board/[id]/comments/[commentId] 는 별도 라우트로 처리
