import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  const token = process.env.INTERNAL_MIGRATION_TOKEN
  if (!token) return NextResponse.json({ error: "not configured" }, { status: 403 })
  const t = req.nextUrl.searchParams.get("t")
  if (t !== token) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Equipment"          ADD COLUMN IF NOT EXISTS "attachments" JSONB NOT NULL DEFAULT '[]'`)
    await prisma.$executeRawUnsafe(`ALTER TABLE "EquipmentRepair"    ADD COLUMN IF NOT EXISTS "attachments" JSONB NOT NULL DEFAULT '[]'`)
    await prisma.$executeRawUnsafe(`ALTER TABLE "IncomingInspection" ADD COLUMN IF NOT EXISTS "attachments" JSONB NOT NULL DEFAULT '[]'`)
    await prisma.$executeRawUnsafe(`ALTER TABLE "SourceInspection"   ADD COLUMN IF NOT EXISTS "attachments" JSONB NOT NULL DEFAULT '[]'`)
    await prisma.$executeRawUnsafe(`ALTER TABLE "SupplierAudit"      ADD COLUMN IF NOT EXISTS "attachments" JSONB NOT NULL DEFAULT '[]'`)
    return NextResponse.json({ ok: true, message: "attachments columns applied" })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
