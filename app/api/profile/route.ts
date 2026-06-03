import { NextRequest, NextResponse } from "next/server"
import { requireActiveSession } from "@/lib/session-guard"
import { prisma } from "@/lib/prisma"

export async function PATCH(req: NextRequest) {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session

  const { name, department, employeeId, phone } = await req.json()

  if (name !== undefined && typeof name === "string" && !name.trim()) {
    return NextResponse.json({ error: "이름은 비워둘 수 없습니다." }, { status: 400 })
  }

  const data: Record<string, unknown> = {}
  if (name !== undefined) data.name = String(name).trim()
  if (department !== undefined) data.department = department ? String(department).trim() : null
  if (employeeId !== undefined) data.employeeId = employeeId ? String(employeeId).trim() : null
  if (phone !== undefined) data.phone = phone ? String(phone).trim() : null

  const user = await prisma.user.update({ where: { id: session.user.id }, data })
  return NextResponse.json({ ok: true, name: user.name })
}
