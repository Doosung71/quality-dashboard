import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("t") !== "qms2026attach") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "BoardPost" ADD COLUMN IF NOT EXISTS attachments JSONB NOT NULL DEFAULT '[]'::jsonb;
  `)
  return NextResponse.json({ ok: true, message: "attachments 컬럼 추가 완료" })
}
