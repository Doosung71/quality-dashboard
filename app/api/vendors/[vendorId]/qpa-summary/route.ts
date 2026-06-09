import { NextRequest, NextResponse } from "next/server"
import { requireActiveSession } from "@/lib/session-guard"
import { prisma } from "@/lib/prisma"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ vendorId: string }> }
) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  const { vendorId } = await params

  const audits = await prisma.qpaAudit.findMany({
    where: { vendorId },
    orderBy: { auditDate: "desc" },
    select: {
      id:           true,
      qpaNo:        true,
      auditDate:    true,
      partName:     true,
      auditorNames: true,
      totalPercent: true,
      level:        true,
      result:       true,
      status:       true,
      _count: { select: { findings: true } },
    },
  })

  return NextResponse.json({
    audits: audits.map(a => ({
      ...a,
      auditDate: a.auditDate.toISOString(),
    })),
  })
}
