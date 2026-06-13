import { NextRequest, NextResponse } from "next/server"
import { requireActiveSession } from "@/lib/session-guard"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string }> }

export async function GET(_: NextRequest, { params }: Params) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session
  const { id } = await params

  const voCs = await prisma.witnessVoC.findMany({
    where: { inspectionId: id },
    orderBy: { createdAt: "asc" },
  })
  return NextResponse.json(voCs)
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session
  const { id } = await params

  const body = await req.json() as {
    content: string; category?: string; priority?: string; dueDate?: string
  }

  if (!body.content?.trim()) {
    return NextResponse.json({ error: "요청사항 내용을 입력해주세요." }, { status: 400 })
  }

  const voc = await prisma.witnessVoC.create({
    data: {
      inspectionId: id,
      content:      body.content.trim(),
      category:     (body.category as never) ?? "OTHER",
      priority:     (body.priority as never) ?? "NORMAL",
      dueDate:      body.dueDate ? new Date(body.dueDate) : null,
    },
  })
  return NextResponse.json(voc, { status: 201 })
}
