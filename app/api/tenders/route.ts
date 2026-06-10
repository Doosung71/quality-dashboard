import { NextRequest, NextResponse } from "next/server"
import { requireActiveSession } from "@/lib/session-guard"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session


  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 })
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 })
  }

  const { title } = body as Record<string, unknown>
  if (typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "입찰명을 입력해주세요." }, { status: 400 })
  }

  const tender = await prisma.tender.create({
    data: {
      title: title.trim(),
      createdById: session.user.id,
    },
  })

  return NextResponse.json({ tenderId: tender.id })
}
