import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { displayName } from "@/lib/display-name"
import { MainDashboard } from "./MainDashboard"

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const userId = session.user.id ?? ""

  // 부서명은 로그인 신원(실제 DB 값)에서 조회한다. JWT 토큰이 아니라 DB를
  // 읽는 이유: 관리자가 부서를 바꿔도 재로그인 없이 즉시 반영되게 하기 위함.
  const me = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: { department: true },
      })
    : null
  const department = me?.department?.trim() ?? ""

  // 팀장 뷰 리소스 풀 — 같은 부서의 활성 사용자(본인 제외)를 실제로 조회한다.
  // 리소스 풀은 팀장·부문장 뷰에만 노출되므로, 그 외 역할에는 동료 목록을
  // 조회·전달하지 않는다(불필요한 사용자 정보 클라이언트 노출 방지).
  const role = session.user.role ?? "PRACTITIONER"
  const canSeeTeamPool = role === "TEAM_LEAD" || role === "DIRECTOR"
  const teamRows = department && canSeeTeamPool
    ? await prisma.user.findMany({
        where: { department, status: "ACTIVE", id: { not: userId } },
        select: { id: true, name: true, nickname: true, role: true },
        orderBy: { name: "asc" },
      })
    : []

  const teamMembers = teamRows.map((m) => ({
    id: m.id,
    name: displayName(m),
    role: m.role,
  }))

  return (
    <MainDashboard
      role={role}
      userName={session.user.name ?? ""}
      userId={userId}
      department={department}
      teamMembers={teamMembers}
    />
  )
}
