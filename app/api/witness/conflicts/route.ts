import { NextRequest, NextResponse } from "next/server"
import { requireActiveSession } from "@/lib/session-guard"
import { prisma } from "@/lib/prisma"

// GET /api/witness/conflicts?roomId=xxx&date=YYYY-MM-DD&excludeId=xxx
export async function GET(req: NextRequest) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  const { searchParams } = new URL(req.url)
  const roomId    = searchParams.get("roomId")
  const date      = searchParams.get("date")      // YYYY-MM-DD
  const excludeId = searchParams.get("excludeId") // 수정 시 자기 자신 제외

  if (!roomId || !date) {
    return NextResponse.json([], { status: 200 })
  }

  const dayStart = new Date(date)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(date)
  dayEnd.setHours(23, 59, 59, 999)

  const conflicts = await prisma.witnessInspection.findMany({
    where: {
      roomId,
      status: { notIn: ["CANCELLED"] },
      inspectionDate: { gte: dayStart, lte: dayEnd },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: {
      id: true, inspNo: true, customer: true,
      projectName: true, assigneeName: true, status: true,
    },
  })

  return NextResponse.json(conflicts)
}
