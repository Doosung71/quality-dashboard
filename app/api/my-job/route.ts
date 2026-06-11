import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireActiveSession } from "@/lib/session-guard"

export async function GET() {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  // E2E-1 테스트 단계: 전체 공개 (E2E-2 착수 시 역할별 제한 복원)
  // TODO(E2E-2): TEAM_LEAD/DIRECTOR는 팀 전체, PRACTITIONER는 본인만 조회하도록 변경
  const actions = await prisma.meetingAction.findMany({
    where: { done: false },
    orderBy: [
      { dueDate: "asc" },
      { createdAt: "desc" },
    ],
    include: {
      meeting: {
        select: { id: true, title: true, type: true, meetingDate: true },
      },
    },
  })

  return NextResponse.json(actions)
}
