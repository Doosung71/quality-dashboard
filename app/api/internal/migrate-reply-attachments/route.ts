import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  if (searchParams.get("t") !== process.env.INTERNAL_MIGRATION_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  await prisma.$executeRaw`
    ALTER TABLE "FeedbackReply"
    ADD COLUMN IF NOT EXISTS attachments JSONB NOT NULL DEFAULT '[]'::jsonb
  `

  return NextResponse.json({ ok: true, message: "FeedbackReply.attachments 컬럼 추가 완료" })
}
