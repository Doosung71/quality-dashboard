import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireActiveSession } from "@/lib/session-guard"

export async function GET() {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  const items = await prisma.incomingInspection.findMany({
    orderBy: { inspectionDate: "desc" },
    include: { createdBy: { select: { name: true, nickname: true } } },
  })
  return NextResponse.json(items)
}

export async function POST(req: NextRequest) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  const body = await req.json() as {
    vendorId: string; vendorName: string; poNumber?: string
    receiptDate: string; inspectionDate: string
    itemName: string; itemCode?: string
    quantity: number; sampleSize?: number
    result: string; defectCount?: number; defectRate?: number
    inspector: string; notes?: string
  }

  const item = await prisma.incomingInspection.create({
    data: {
      vendorId:       body.vendorId,
      vendorName:     body.vendorName,
      poNumber:       body.poNumber ?? null,
      receiptDate:    new Date(body.receiptDate),
      inspectionDate: new Date(body.inspectionDate),
      itemName:       body.itemName,
      itemCode:       body.itemCode ?? null,
      quantity:       body.quantity,
      sampleSize:     body.sampleSize ?? null,
      result:         body.result as never,
      defectCount:    body.defectCount ?? null,
      defectRate:     body.defectRate ?? null,
      inspector:      body.inspector,
      notes:          body.notes ?? null,
      createdById:    session.user.id,
    },
  })
  return NextResponse.json({ id: item.id }, { status: 201 })
}
