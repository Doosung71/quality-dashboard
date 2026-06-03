import { NextResponse } from "next/server"
import { requireActiveSession } from "@/lib/session-guard"
import { isAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session
  if (!isAdmin(session.user.email, session.user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, email: true, role: true, status: true, department: true, employeeId: true, createdAt: true },
  })
  return NextResponse.json(users)
}
