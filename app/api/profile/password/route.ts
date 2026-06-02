import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { requireActiveSession } from "@/lib/session-guard"
import { prisma } from "@/lib/prisma"

export async function PATCH(req: NextRequest) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  const { currentPassword, newPassword } = await req.json()
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "현재 비밀번호와 새 비밀번호를 입력해주세요." }, { status: 400 })
  }
  if (newPassword.length < 6) {
    return NextResponse.json({ error: "새 비밀번호는 6자 이상이어야 합니다." }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user) return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 })

  const valid = await bcrypt.compare(currentPassword, user.passwordHash)
  if (!valid) return NextResponse.json({ error: "현재 비밀번호가 올바르지 않습니다." }, { status: 400 })

  const passwordHash = await bcrypt.hash(newPassword, 12)
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } })

  return NextResponse.json({ ok: true })
}
