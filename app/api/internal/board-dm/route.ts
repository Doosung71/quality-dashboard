import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("t") !== "qms2026dm") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }
  await prisma.$executeRawUnsafe(`ALTER TABLE "BoardPost"    ADD COLUMN IF NOT EXISTS "displayMode" TEXT NOT NULL DEFAULT 'REAL'`)
  await prisma.$executeRawUnsafe(`ALTER TABLE "BoardComment" ADD COLUMN IF NOT EXISTS "displayMode" TEXT NOT NULL DEFAULT 'REAL'`)
  return NextResponse.json({ ok: true, message: "displayMode 컬럼 추가 완료" })
}
