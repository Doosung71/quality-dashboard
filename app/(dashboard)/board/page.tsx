import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { requireActiveSession } from "@/lib/session-guard"
import { BoardClient } from "@/components/board/board-client"
import type { Role } from "@/lib/generated/prisma/client"

export default async function BoardPage() {
  const session = await auth()
  if (!session) redirect("/login")

  return (
    <BoardClient
      currentUserId={session.user.id}
      currentUserRole={session.user.role as Role}
      currentUserName={session.user.nickname ?? session.user.name ?? ""}
    />
  )
}
