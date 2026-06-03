import { NextRequest, NextResponse } from "next/server"
import { requireActiveSession } from "@/lib/session-guard"
import { prisma } from "@/lib/prisma"
import { canView, isPrivileged as checkPrivileged } from "@/lib/board-visibility"

const VALID_VISIBILITY = ["ALL", "TEAM_LEAD_UP", "DIRECTOR_UP"]
const VALID_DISPLAY    = ["REAL", "NICKNAME", "ANONYMOUS"]

// GET /api/board — 게시글 목록 (역할별 visibility 필터)
export async function GET() {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  const role = session.user.role as string

  const posts = await prisma.boardPost.findMany({
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    include: {
      author: { select: { id: true, name: true, nickname: true, department: true } },
      _count: { select: { comments: true } },
    },
  })

  // 서버에서 visibility 필터링
  const visible = posts.filter(p => canView(p.visibility, role))
  return NextResponse.json(visible)
}

// POST /api/board — 게시글 작성
export async function POST(req: NextRequest) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  const { title, content, category, pinned, attachments, displayMode, visibility } = await req.json()
  if (!title?.trim() || !content?.trim()) {
    return NextResponse.json({ error: "제목과 내용을 입력하세요." }, { status: 400 })
  }

  const role = session.user.role as string
  const privileged = checkPrivileged(role)

  const post = await prisma.boardPost.create({
    data: {
      title: title.trim(),
      content: content.trim(),
      category: category === "NOTICE" && privileged ? "NOTICE" : "GENERAL",
      pinned: !!(pinned && privileged),
      authorId: session.user.id,
      attachments: Array.isArray(attachments) ? attachments : [],
      displayMode: VALID_DISPLAY.includes(displayMode) ? displayMode : "REAL",
      visibility:  VALID_VISIBILITY.includes(visibility) ? visibility : "ALL",
    },
    include: {
      author: { select: { id: true, name: true, nickname: true, department: true } },
      _count: { select: { comments: true } },
    },
  })
  return NextResponse.json(post, { status: 201 })
}
