import { NextRequest, NextResponse } from "next/server"
import { requireActiveSession } from "@/lib/session-guard"
import { prisma } from "@/lib/prisma"

// POST /api/awarded-projects — APPROVED 입찰에서 수주 프로젝트 생성
export async function POST(req: NextRequest) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  const { tenderId } = await req.json() as { tenderId?: string }
  if (!tenderId) return NextResponse.json({ error: "tenderId 필요" }, { status: 400 })

  const tender = await prisma.tender.findFirst({
    where: {
      id: tenderId,
      analyses: { some: { status: "APPROVED" } },
    },
  })
  if (!tender) return NextResponse.json({ error: "최종 승인된 입찰을 찾을 수 없습니다." }, { status: 404 })

  const existing = await prisma.awardedProject.findUnique({ where: { tenderId } })
  if (existing) return NextResponse.json({ error: "이미 수주 프로젝트가 존재합니다." }, { status: 409 })

  const project = await prisma.awardedProject.create({
    data: { tenderId, createdById: session.user.id },
  })

  return NextResponse.json({ id: project.id }, { status: 201 })
}

// GET /api/awarded-projects — 목록 조회
export async function GET(req: NextRequest) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  const projects = await prisma.awardedProject.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      tender: { select: { id: true, title: true } },
      analyses: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, status: true, gaps: { select: { isRisk: true } } },
      },
      documents: { select: { id: true }, orderBy: { uploadedAt: "desc" }, take: 1 },
    },
  })

  return NextResponse.json(projects)
}
