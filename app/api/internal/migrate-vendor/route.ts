import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// 1회성 프로덕션 마이그레이션 엔드포인트
// 사용 후 즉시 삭제할 것
export async function GET(req: NextRequest) {
  const t = req.nextUrl.searchParams.get("t")
  if (!t || t !== process.env.MIGRATION_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Vendor" (
        "id"          TEXT        NOT NULL,
        "name"        TEXT        NOT NULL,
        "location"    TEXT        NOT NULL DEFAULT '',
        "mainItem"    TEXT        NOT NULL DEFAULT '',
        "status"      TEXT        NOT NULL DEFAULT 'NORMAL',
        "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "createdById" TEXT        NOT NULL,
        CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "Vendor_createdById_fkey"
          FOREIGN KEY ("createdById") REFERENCES "User"("id")
          ON DELETE RESTRICT ON UPDATE CASCADE
      )
    `)
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "Vendor_createdById_idx" ON "Vendor"("createdById")
    `)
    return NextResponse.json({ ok: true, message: "Vendor 테이블 생성 완료" })
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 })
  }
}
