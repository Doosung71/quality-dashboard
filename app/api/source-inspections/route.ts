import { NextRequest, NextResponse } from "next/server"
import { requireActiveSession } from "@/lib/session-guard"
import { prisma } from "@/lib/prisma"
import { validateInspectionQuantities } from "@/lib/inspection-quantities"

export async function GET() {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  const inspections = await prisma.sourceInspection.findMany({
    orderBy: { inspectionDate: "desc" },
    include: { createdBy: { select: { name: true, nickname: true } } },
  })
  return NextResponse.json(inspections)
}

export async function POST(req: NextRequest) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  const body = await req.json() as {
    vendorId: string; vendorName: string; inspectionDate: string
    location?: string; itemName: string; itemCode?: string
    quantity: number; sampleSize?: number; result: string
    defectCount?: number; defectRate?: number; inspector: string; notes?: string
  }

  if (!body.vendorId || !body.vendorName || !body.inspectionDate || !body.itemName || !body.inspector) {
    return NextResponse.json({ error: "필수 항목 누락" }, { status: 400 })
  }

  // 수량 정합성 검증 (fail-closed) — 클라이언트 우회·직접 호출 방어
  const qtyError = validateInspectionQuantities(body.quantity, body.sampleSize ?? null, body.defectCount ?? null)
  if (qtyError) return NextResponse.json({ error: qtyError }, { status: 400 })

  // 불량률은 클라이언트 값 무시하고 서버에서 재계산 (데이터 무결성)
  const defectRate = (body.defectCount != null && body.sampleSize)
    ? (body.defectCount / body.sampleSize) * 100 : null

  const inspection = await prisma.sourceInspection.create({
    data: {
      vendorId:       body.vendorId,
      vendorName:     body.vendorName,
      inspectionDate: new Date(body.inspectionDate),
      location:       body.location,
      itemName:       body.itemName,
      itemCode:       body.itemCode,
      quantity:       body.quantity,
      sampleSize:     body.sampleSize,
      result:         body.result as never,
      defectCount:    body.defectCount,
      defectRate:     defectRate,
      inspector:      body.inspector,
      notes:          body.notes,
      status:         "CONFIRMED",
      createdById:    session.user.id,
    },
  })
  return NextResponse.json({ id: inspection.id }, { status: 201 })
}
