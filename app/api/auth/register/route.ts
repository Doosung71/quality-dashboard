import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  const { name, email, password, department, employeeId } = await req.json()

  if (!name || !email || !password) {
    return NextResponse.json({ error: "이름, 이메일, 비밀번호는 필수입니다." }, { status: 400 })
  }

  if (!department || !String(department).trim()) {
    return NextResponse.json({ error: "부서명을 입력해주세요." }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: "이미 등록된 이메일입니다." }, { status: 409 })
  }

  const passwordHash = await bcrypt.hash(password, 12)
  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: "PRACTITIONER",
      status: "PENDING",
      department: String(department).trim(),
      employeeId: employeeId || null,
    },
  })

  return NextResponse.json({ ok: true }, { status: 201 })
}
