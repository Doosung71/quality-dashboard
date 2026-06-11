import { NextResponse } from "next/server"
import { requireActiveSession } from "@/lib/session-guard"
import { prisma } from "@/lib/prisma"

// 1회성 프로덕션 마이그레이션 엔드포인트 — 실행 후 즉시 삭제할 것
// ADMIN 계정으로 로그인한 상태에서 호출해야 함
export async function GET() {
  const session = await requireActiveSession()
  if (session instanceof NextResponse) return session
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "ADMIN 권한 필요" }, { status: 403 })
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
    return NextResponse.json({ ok: true, message: "✓ Vendor 테이블 생성 완료" })
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 })
  }
}
