import { NextRequest, NextResponse } from "next/server"
import { requireActiveSession } from "@/lib/session-guard"
import { prisma } from "@/lib/prisma"
import { calcQpaScores } from "@/lib/qpa-template"

async function recalcAudit(auditId: string) {
  const items = await prisma.qpaAuditItem.findMany({ where: { auditId } })
  const { totalScore, totalPercent, level, result } = calcQpaScores(
    items.map((i) => ({ potential: i.potential, score: i.score, isNA: i.isNA }))
  )
  await prisma.qpaAudit.update({
    where: { id: auditId },
    data: { totalScore, totalPercent, level, result },
  })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemNo: string }> }
) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  const writerRoles = ["TEAM_LEAD", "DIRECTOR", "ADMIN"]
  if (!writerRoles.includes(session.user.role)) {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 })
  }

  const { id: auditId, itemNo: itemNoStr } = await params
  const itemNo = parseInt(itemNoStr)
  const body = await req.json() as {
    score?: number
    isNA?:  boolean
    comment?: string
    evidence?: string
  }

  const item = await prisma.qpaAuditItem.update({
    where: { auditId_itemNo: { auditId, itemNo } },
    data: {
      ...(body.score    !== undefined && { score:    body.score }),
      ...(body.isNA     !== undefined && { isNA:     body.isNA }),
      ...(body.comment  !== undefined && { comment:  body.comment }),
      ...(body.evidence !== undefined && { evidence: body.evidence }),
    },
  })

  await recalcAudit(auditId)
  return NextResponse.json({ id: item.id })
}
