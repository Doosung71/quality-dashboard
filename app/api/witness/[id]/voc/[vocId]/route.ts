import { NextRequest, NextResponse } from "next/server"
import { requireActiveSession } from "@/lib/session-guard"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string; vocId: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session
  const { vocId } = await params

  const body = await req.json() as {
    content?: string; category?: string; priority?: string
    status?: string; response?: string; dueDate?: string
  }

  const data: Record<string, unknown> = {}
  if (body.content   !== undefined) data.content   = body.content
  if (body.category  !== undefined) data.category  = body.category
  if (body.priority  !== undefined) data.priority  = body.priority
  if (body.status    !== undefined) {
    data.status = body.status
    if (body.status === "RESOLVED") data.closedAt = new Date()
    else data.closedAt = null
  }
  if (body.response  !== undefined) data.response  = body.response
  if (body.dueDate   !== undefined) data.dueDate   = body.dueDate ? new Date(body.dueDate) : null

  const voc = await prisma.witnessVoC.update({ where: { id: vocId }, data })
  return NextResponse.json(voc)
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session
  const { vocId } = await params

  await prisma.witnessVoC.delete({ where: { id: vocId } })
  return NextResponse.json({ ok: true })
}
