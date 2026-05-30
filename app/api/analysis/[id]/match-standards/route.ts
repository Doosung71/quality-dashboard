import { NextRequest, NextResponse } from "next/server"
import { requireActiveSession } from "@/lib/session-guard"
import { prisma } from "@/lib/prisma"
import { matchStandardIds } from "@/lib/standard-keywords"

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  if (session.user.role !== "PRACTITIONER") {
    return NextResponse.json({ error: "실무자만 표준 매칭을 실행할 수 있습니다." }, { status: 403 })
  }

  const { id: analysisId } = await params

  const analysis = await prisma.analysis.findFirst({
    where: {
      id: analysisId,
      tender: { createdById: session.user.id },
      status: "DRAFT",
      submittedAt: null,
    },
    include: { requirements: { select: { id: true, content: true } } },
  })
  if (!analysis) return NextResponse.json({ error: "분석을 찾을 수 없습니다." }, { status: 404 })

  if (analysis.requirements.length === 0) {
    return NextResponse.json({ matchedCount: 0 })
  }

  const seededStandards = await prisma.standard.findMany({ select: { id: true } })
  const seededIds = new Set(seededStandards.map((s) => s.id))

  let totalMatched = 0
  await prisma.$transaction(async (tx) => {
    for (const req of analysis.requirements) {
      const matched = matchStandardIds(req.content).filter((id) => seededIds.has(id))
      totalMatched += matched.length
      await tx.specRequirement.update({
        where: { id: req.id },
        data: { standards: { set: matched.map((id) => ({ id })) } },
      })
    }
  })

  return NextResponse.json({ matchedCount: totalMatched })
}
