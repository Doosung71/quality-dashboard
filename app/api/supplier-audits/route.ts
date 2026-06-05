import { NextRequest, NextResponse } from "next/server"
import { requireActiveSession } from "@/lib/session-guard"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  const audits = await prisma.supplierAudit.findMany({
    orderBy: { auditDate: "desc" },
    include: {
      findings: { select: { id: true, severity: true, status: true } },
      createdBy: { select: { name: true, nickname: true } },
    },
  })
  return NextResponse.json(audits)
}

export async function POST(req: NextRequest) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  const body = await req.json() as {
    vendorId: string; vendorName: string; auditDate: string
    auditType: string; auditor: string; location?: string; status: string
  }

  if (!body.vendorId || !body.vendorName || !body.auditDate || !body.auditor) {
    return NextResponse.json({ error: "필수 항목 누락" }, { status: 400 })
  }

  const audit = await prisma.supplierAudit.create({
    data: {
      vendorId: body.vendorId,
      vendorName: body.vendorName,
      auditDate: new Date(body.auditDate),
      auditType: body.auditType as never,
      auditor: body.auditor,
      location: body.location,
      status: body.status as never,
      createdById: session.user.id,
    },
  })
  return NextResponse.json({ id: audit.id }, { status: 201 })
}
