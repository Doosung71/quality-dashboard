import { auth } from "@/auth"
import { NextResponse } from "next/server"
import { redirect } from "next/navigation"
import { isAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import type { Session } from "next-auth"
import type { UserStatus } from "@/lib/generated/prisma/enums"

function restrictionExpired(status: UserStatus, restrictedUntil: Date | string | null) {
  return status === "RESTRICTED" && !!restrictedUntil && new Date(restrictedUntil) < new Date()
}

function applyFreshUser(
  session: Session,
  user: {
    role: Session["user"]["role"]
    status: Session["user"]["status"]
    restrictedUntil: Date | null
    nickname: string | null
  }
) {
  session.user.role = user.role
  session.user.status = user.status
  session.user.restrictedUntil = user.restrictedUntil?.toISOString() ?? null
  session.user.nickname = user.nickname
  return session
}

export async function requireActiveSession() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, status: true, restrictedUntil: true, nickname: true },
  })
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  applyFreshUser(session, user)

  if (!isAdmin(session.user.email) && user.status !== "ACTIVE" && !restrictionExpired(user.status, user.restrictedUntil)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  return session
}

export async function requireActivePageSession() {
  const session = await auth()
  if (!session) redirect("/login")

  let user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, status: true, restrictedUntil: true, nickname: true },
  })
  if (!user) redirect("/login")

  // 사용정지 기간 만료 시 DB 자동 ACTIVE 전환
  if (restrictionExpired(user.status, user.restrictedUntil)) {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { status: "ACTIVE", restrictedUntil: null },
    })
    user = { ...user, status: "ACTIVE", restrictedUntil: null }
  }

  applyFreshUser(session, user)

  if (isAdmin(session.user.email) || user.status === "ACTIVE") {
    return session
  }

  if (user.status === "PENDING") redirect("/pending")
  redirect("/banned")
}
