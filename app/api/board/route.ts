import { NextRequest, NextResponse } from "next/server"
import { requireActiveSession } from "@/lib/session-guard"
import { prisma } from "@/lib/prisma"

// GET /api/board — 게시글 목록
export async function GET() {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  const posts = await prisma.boardPost.findMany({
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    include: {
      author: { select: { id: true, name: true, nickname: true, department: true } },
      _count: { select: { comments: true } },
    },
  })
  return NextResponse.json(posts)
}

// POST /api/board — 게시글 작성
export async function POST(req: NextRequest) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  const { title, content, category, pinned } = await req.json()
  if (!title?.trim() || !content?.trim()) {
    return NextResponse.json({ error: "제목과 내용을 입력하세요." }, { status: 400 })
  }

  const role = session.user.role as string
  const isPrivileged = role === "ADMIN" || role === "DIRECTOR"

  const post = await prisma.boardPost.create({
    data: {
      title: title.trim(),
      content: content.trim(),
      category: category === "NOTICE" && isPrivileged ? "NOTICE" : "GENERAL",
      pinned: !!(pinned && isPrivileged),
      authorId: session.user.id,
    },
    include: {
      author: { select: { id: true, name: true, nickname: true, department: true } },
      _count: { select: { comments: true } },
    },
  })
  return NextResponse.json(post, { status: 201 })
}
