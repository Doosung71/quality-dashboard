import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { requireActiveSession } from "@/lib/session-guard"
import { isAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"

const CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"

function generateTempPassword(): string {
  let result = "QMS-"
  for (let i = 0; i < 6; i++) {
    result += CHARS[Math.floor(Math.random() * CHARS.length)]
  }
  return result
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session
  if (!isAdmin(session.user.email, session.user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  const tempPassword = generateTempPassword()
  const passwordHash = await bcrypt.hash(tempPassword, 12)

  await prisma.user.update({ where: { id }, data: { passwordHash } })

  return NextResponse.json({ tempPassword })
}
