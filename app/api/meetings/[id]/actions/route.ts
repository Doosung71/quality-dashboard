import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireActiveSession } from "@/lib/session-guard"

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  const { id: meetingId } = await params
  const body = await req.json() as {
    content: string
    assigneeName: string
    dueDate?: string | null
  }

  const action = await prisma.meetingAction.create({
    data: {
      meetingId,
      content:      body.content,
      assigneeName: body.assigneeName,
      dueDate:      body.dueDate ? new Date(body.dueDate) : null,
    },
  })
  return NextResponse.json(action, { status: 201 })
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  const { id: meetingId } = await params
  const body = await req.json() as {
    actionId: string
    content?: string
    assigneeName?: string
    dueDate?: string | null
    done?: boolean
  }

  const data: Record<string, unknown> = {}
  if (body.content      !== undefined) data.content      = body.content
  if (body.assigneeName !== undefined) data.assigneeName = body.assigneeName
  if (body.done         !== undefined) data.done         = body.done
  if ("dueDate" in body) data.dueDate = body.dueDate ? new Date(body.dueDate) : null

  const updated = await prisma.meetingAction.update({
    where: { id: body.actionId, meetingId },
    data,
  })
  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  const { id: meetingId } = await params
  const { actionId } = await req.json() as { actionId: string }

  await prisma.meetingAction.delete({ where: { id: actionId, meetingId } })
  return NextResponse.json({ ok: true })
}
