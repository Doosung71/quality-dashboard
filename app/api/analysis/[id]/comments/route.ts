import { NextRequest, NextResponse } from "next/server"
import { requireActiveSession } from "@/lib/session-guard"
import { prisma } from "@/lib/prisma"
import { displayName } from "@/lib/display-name"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  const { id: analysisId } = await params

  const analysis = await prisma.analysis.findFirst({
    where: {
      id: analysisId,
      ...(session.user.role === "PRACTITIONER"
        ? { tender: { createdById: session.user.id } }
        : {}),
    },
  })
  if (!analysis) return NextResponse.json({ error: "분석을 찾을 수 없습니다." }, { status: 404 })

  const rows = await prisma.comment.findMany({
    where: { analysisId, parentId: null },
    orderBy: { createdAt: "asc" },
    include: {
      author: { select: { name: true, nickname: true } },
      replies: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { name: true } } },
      },
    },
  })

  const comments = rows.map((c) => ({
    id: c.id,
    authorName: displayName(c.author),
    content: c.content,
    createdAt: c.createdAt.toISOString(),
    replies: c.replies.map((r) => ({
      id: r.id,
      authorName: displayName(r.author),
      content: r.content,
      createdAt: r.createdAt.toISOString(),
    })),
  }))

  return NextResponse.json({ comments })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  const { id: analysisId } = await params

  const analysis = await prisma.analysis.findFirst({
    where: {
      id: analysisId,
      ...(session.user.role === "PRACTITIONER"
        ? { tender: { createdById: session.user.id } }
        : {}),
    },
  })
  if (!analysis) return NextResponse.json({ error: "분석을 찾을 수 없습니다." }, { status: 404 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "요청 본문을 파싱할 수 없습니다." }, { status: 400 })
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 })
  }
  const content: unknown = (body as Record<string, unknown>).content
  const parentId: unknown = (body as Record<string, unknown>).parentId

  if (typeof content !== "string" || !content.trim()) {
    return NextResponse.json({ error: "내용을 입력해주세요." }, { status: 400 })
  }

  if (parentId !== undefined && parentId !== null) {
    if (typeof parentId !== "string") {
      return NextResponse.json({ error: "잘못된 parentId입니다." }, { status: 400 })
    }
    const parent = await prisma.comment.findFirst({ where: { id: parentId, analysisId } })
    if (!parent) return NextResponse.json({ error: "부모 댓글을 찾을 수 없습니다." }, { status: 404 })
    if (parent.parentId) {
      return NextResponse.json({ error: "댓글에만 답글을 달 수 있습니다." }, { status: 400 })
    }
  }

  const comment = await prisma.comment.create({
    data: {
      analysisId,
      authorId: session.user.id,
      content: content.trim(),
      parentId: typeof parentId === "string" ? parentId : null,
    },
    include: { author: { select: { name: true } } },
  })

  return NextResponse.json({
    comment: {
      ...comment,
      author: { name: displayName(comment.author) },
    },
  })
}
