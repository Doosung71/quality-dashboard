import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

// 일회성 관리자 비밀번호 리셋 엔드포인트
// 배포 후 호출 즉시 삭제 예정
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("t")
  if (token !== "qms2026reset") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const hash = await bcrypt.hash("admin1234!", 12)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (prisma.user.update as any)({
    where: { email: "doosung71@gmail.com" },
    data: { passwordHash: hash, role: "ADMIN", name: "관리자", department: "품질부문" },
  })

  return NextResponse.json({ ok: true, message: "비밀번호가 admin1234!로 초기화됐습니다." })
}
