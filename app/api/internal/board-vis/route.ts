import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("t") !== "qms2026vis") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }
  await prisma.$executeRawUnsafe(`ALTER TABLE "BoardPost"    ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'ALL'`)
  await prisma.$executeRawUnsafe(`ALTER TABLE "BoardComment" ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'ALL'`)
  return NextResponse.json({ ok: true, message: "visibility 컬럼 추가 완료" })
}
