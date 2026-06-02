import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { requireActivePageSession } from "@/lib/session-guard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import NicknameForm from "./NicknameForm"
import PasswordChangeForm from "./PasswordChangeForm"

const ROLE_LABEL: Record<string, string> = {
  PRACTITIONER: "실무자",
  TEAM_LEAD: "팀장",
  DIRECTOR: "부문장",
}

export default async function ProfilePage() {
  const session = await requireActivePageSession()

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user) redirect("/login")

  return (
    <div className="min-h-screen bg-zinc-50 py-10 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-800">
            ← 대시보드
          </Link>
          <h1 className="text-lg font-semibold">내 프로필</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">기본 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <InfoRow label="이름" value={user.name} />
            <InfoRow label="이메일" value={user.email} />
            <InfoRow label="역할" value={ROLE_LABEL[user.role] ?? user.role} />
            <InfoRow label="부서" value={user.department ?? "—"} />
            <InfoRow label="사번" value={user.employeeId ?? "—"} />
            <InfoRow label="연락처" value={user.phone ?? "—"} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">닉네임</CardTitle>
          </CardHeader>
          <CardContent>
            <NicknameForm currentNickname={user.nickname} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">비밀번호 변경</CardTitle>
          </CardHeader>
          <CardContent>
            <PasswordChangeForm />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-16 text-zinc-500 shrink-0">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}
