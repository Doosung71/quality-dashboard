import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireActiveSession } from "@/lib/session-guard"

export async function GET() {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  const ncrs = await prisma.ncr.findMany({
    orderBy: { issuedDate: "desc" },
    include: { createdBy: { select: { name: true, nickname: true } } },
  })
  return NextResponse.json(ncrs)
}

export async function POST(req: NextRequest) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  const body = await req.json() as {
    title: string; source: string; severity: string; disposition: string
    targetDate: string; assignee: string; description: string
    attachments?: { url: string; name: string; size: number; contentType: string }[]
  }

  // 채번: NCR-YYYY-NNN
  const latest = await prisma.ncr.findFirst({ orderBy: { createdAt: "desc" }, select: { ncrNo: true } })
  const year   = new Date().getFullYear()
  const nextN  = latest ? parseInt(latest.ncrNo.split("-")[2] ?? "0") + 1 : 1
  const ncrNo  = `NCR-${year}-${String(nextN).padStart(3, "0")}`
  const today  = new Date().toISOString().slice(0, 10)
  const assignee = body.assignee || session.user.name || "등록자"

  const ncr = await prisma.ncr.create({
    data: {
      ncrNo,
      title:       body.title,
      source:      body.source,
      severity:    body.severity    as never,
      disposition: body.disposition as never,
      issuedDate:  new Date(),
      targetDate:  new Date(body.targetDate),
      assignee,
      description: body.description,
      timeline:    [{ date: today, action: "부적합 발행 (Issued)", user: assignee }],
      attachments: Array.isArray(body.attachments) ? body.attachments : [],
      createdById: session.user.id,
    },
  })
  return NextResponse.json({ id: ncr.id, ncrNo: ncr.ncrNo }, { status: 201 })
}
