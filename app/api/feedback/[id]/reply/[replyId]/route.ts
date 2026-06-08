import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

type Ctx = { params: Promise<{ id: string; replyId: string }> }

export async function PATCH(req: Request, { params }: Ctx) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { replyId } = await params
  const reply = await prisma.feedbackReply.findUnique({ where: { id: replyId } })
  if (!reply) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (reply.authorId !== session.user.id)
    return NextResponse.json({ error: "본인 댓글만 수정할 수 있습니다" }, { status: 403 })

  const { content } = await req.json() as { content?: string }
  if (!content?.trim()) return NextResponse.json({ error: "내용을 입력해주세요" }, { status: 400 })

  const updated = await prisma.feedbackReply.update({
    where: { id: replyId },
    data: { content: content.trim() },
  })
  return NextResponse.json(updated)
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { replyId } = await params
  const reply = await prisma.feedbackReply.findUnique({ where: { id: replyId } })
  if (!reply) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const role = session.user.role as string
  const isOwner = reply.authorId === session.user.id
  const isPrivileged = role === "DIRECTOR" || role === "ADMIN"
  if (!isOwner && !isPrivileged)
    return NextResponse.json({ error: "삭제 권한이 없습니다" }, { status: 403 })

  await prisma.feedbackReply.delete({ where: { id: replyId } })
  return NextResponse.json({ ok: true })
}
