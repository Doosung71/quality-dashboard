import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: feedbackId } = await params
  const { content } = await req.json()
  if (!content?.trim()) return NextResponse.json({ error: "내용을 입력해주세요" }, { status: 400 })

  const reply = await prisma.feedbackReply.create({
    data: {
      content: content.trim(),
      feedbackId,
      authorId: session.user.id,
    },
    include: {
      author: { select: { id: true, name: true, nickname: true, role: true } },
    },
  })

  return NextResponse.json(reply, { status: 201 })
}
