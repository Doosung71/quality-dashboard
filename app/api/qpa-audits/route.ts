import { NextRequest, NextResponse } from "next/server"
import { requireActiveSession } from "@/lib/session-guard"
import { prisma } from "@/lib/prisma"
import { QPA_TEMPLATE } from "@/lib/qpa-template"

async function generateQpaNo(): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `QPA-${year}-`
  const last = await prisma.qpaAudit.findFirst({
    where: { qpaNo: { startsWith: prefix } },
    orderBy: { qpaNo: "desc" },
  })
  const seq = last ? parseInt(last.qpaNo.slice(prefix.length)) + 1 : 1
  return `${prefix}${String(seq).padStart(3, "0")}`
}

export async function GET() {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  const audits = await prisma.qpaAudit.findMany({
    orderBy: { auditDate: "desc" },
    include: {
      _count: { select: { items: true, findings: true } },
      createdBy: { select: { name: true, nickname: true } },
    },
  })
  return NextResponse.json(audits)
}

export async function POST(req: NextRequest) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  const writerRoles = ["TEAM_LEAD", "DIRECTOR", "ADMIN"]
  if (!writerRoles.includes(session.user.role)) {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 })
  }

  const body = await req.json() as {
    vendorId: string
    vendorName: string
    auditDate: string
    location?: string
    partName?: string
    auditorNames?: string
  }

  if (!body.vendorId || !body.vendorName || !body.auditDate) {
    return NextResponse.json({ error: "필수 항목 누락" }, { status: 400 })
  }

  const qpaNo = await generateQpaNo()

  const audit = await prisma.qpaAudit.create({
    data: {
      qpaNo,
      vendorId:     body.vendorId,
      vendorName:   body.vendorName,
      auditDate:    new Date(body.auditDate),
      location:     body.location     ?? "",
      partName:     body.partName     ?? "",
      auditorNames: body.auditorNames ?? session.user.name,
      createdById:  session.user.id,
      items: {
        create: QPA_TEMPLATE.map((t) => ({
          itemNo:      t.itemNo,
          category:    t.category,
          subCategory: t.subCategory,
          isKey:       t.isKey,
          checkItem:   t.checkItem,
          criteria:    t.criteria,
          potential:   t.potential,
        })),
      },
    },
  })
  return NextResponse.json({ id: audit.id }, { status: 201 })
}
