import { NextRequest, NextResponse } from "next/server"
import { requireActiveSession } from "@/lib/session-guard"
import { prisma } from "@/lib/prisma"

// 입회검사 번호 자동 채번: WI-YYYY-NNN
async function generateInspNo(): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `WI-${year}-`
  const last = await prisma.witnessInspection.findFirst({
    where: { inspNo: { startsWith: prefix } },
    orderBy: { inspNo: "desc" },
  })
  const seq = last ? parseInt(last.inspNo.split("-")[2]) + 1 : 1
  return `${prefix}${String(seq).padStart(3, "0")}`
}

export async function GET(req: NextRequest) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  const { searchParams } = new URL(req.url)
  const year  = searchParams.get("year")
  const month = searchParams.get("month") // 1-based

  const where = year && month
    ? {
        inspectionDate: {
          gte: new Date(parseInt(year), parseInt(month) - 1, 1),
          lt:  new Date(parseInt(year), parseInt(month), 1),
        },
      }
    : {}

  const inspections = await prisma.witnessInspection.findMany({
    where,
    orderBy: { inspectionDate: "asc" },
    include: {
      createdBy: { select: { name: true, nickname: true } },
      room:      { select: { id: true, name: true, siteId: true } },
    },
  })
  return NextResponse.json(inspections)
}

export async function POST(req: NextRequest) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  const VALID_REGIONS = ["DOMESTIC", "EUROPE", "ASIA", "MIDDLE_EAST", "OTHER"]

  const body = await req.json() as {
    customer: string; projectName: string; projectNumber?: string
    productName?: string; inspectionDate: string; endDate?: string
    location?: string; region?: string; roomId?: string
    assigneeId: string; assigneeName: string
    description?: string; notes?: string
  }

  if (!body.customer || !body.projectName || !body.inspectionDate || !body.assigneeName) {
    return NextResponse.json({ error: "필수 항목 누락 (고객사·프로젝트명·일정·담당자)" }, { status: 400 })
  }
  if (body.region && !VALID_REGIONS.includes(body.region)) {
    return NextResponse.json({ error: "유효하지 않은 권역입니다." }, { status: 400 })
  }

  const inspNo = await generateInspNo()

  const inspection = await prisma.witnessInspection.create({
    data: {
      inspNo,
      customer:       body.customer,
      projectName:    body.projectName,
      projectNumber:  body.projectNumber,
      productName:    body.productName,
      inspectionDate: new Date(body.inspectionDate),
      endDate:        body.endDate ? new Date(body.endDate) : null,
      location:       body.location,
      region:         body.region    ?? null,
      roomId:         body.roomId    ?? null,
      assigneeId:     body.assigneeId || session.user.id,
      assigneeName:   body.assigneeName,
      createdById:    session.user.id,
    },
  })
  return NextResponse.json({ id: inspection.id, inspNo: inspection.inspNo }, { status: 201 })
}
