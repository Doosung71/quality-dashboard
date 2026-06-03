import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { requireActiveSession } from "@/lib/session-guard"
import { BoardClient } from "@/components/board/board-client"
import type { Role } from "@/lib/generated/prisma/client"

export default async function BoardPage() {
  const session = await auth()
  if (!session) redirect("/login")

  return (
    // shell의 p-4 lg:p-6 패딩을 무효화하여 게시판이 전체 높이를 사용하도록 함
    <div className="-m-4 lg:-m-6">
      <BoardClient
        currentUserId={session.user.id}
        currentUserRole={session.user.role as Role}
        currentUserName={session.user.nickname ?? session.user.name ?? ""}
      />
    </div>
  )
}
