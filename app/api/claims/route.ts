import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireActiveSession } from "@/lib/session-guard"
import { parseProjectKeyInput } from "@/lib/project-key"

export async function GET() {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  const claims = await prisma.claim.findMany({
    orderBy: { receivedAt: "desc" },
    include: { createdBy: { select: { name: true, nickname: true } } },
  })
  return NextResponse.json(claims)
}

export async function POST(req: NextRequest) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  const body = await req.json() as {
    title: string; customer: string; priority: string
    assignee: string; description: string; receivedAt?: string
    responsibleParty?: string; projectKey?: string
    attachments?: { url: string; name: string; size: number; contentType: string }[]
  }

  const pk = parseProjectKeyInput(body.projectKey)
  if (pk.invalid) {
    return NextResponse.json(
      { error: "project_key 형식이 올바르지 않습니다 (kebab-case: 소문자·숫자·하이픈)" },
      { status: 400 },
    )
  }

  // 채번: CLM-YYYY-NNN
  const latest = await prisma.claim.findFirst({ orderBy: { createdAt: "desc" }, select: { claimNo: true } })
  const year   = new Date().getFullYear()
  const nextN  = latest ? parseInt(latest.claimNo.split("-")[2] ?? "0") + 1 : 1
  const claimNo = `CLM-${year}-${String(nextN).padStart(3, "0")}`
  const today   = new Date().toISOString().slice(0, 10)

  const claim = await prisma.claim.create({
    data: {
      claimNo,
      title:            body.title,
      customer:         body.customer,
      projectKey:       pk.value,
      priority:         body.priority as never,
      assignee:         body.assignee,
      description:      body.description,
      receivedAt:       body.receivedAt ? new Date(body.receivedAt) : new Date(),
      responsibleParty: body.responsibleParty ?? null,
      timeline:         [{ date: today, action: "클레임 접수" }],
      attachments:      Array.isArray(body.attachments) ? body.attachments : [],
      createdById:      session.user.id,
    },
  })
  return NextResponse.json({ id: claim.id, claimNo: claim.claimNo }, { status: 201 })
}
