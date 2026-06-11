import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  await prisma.$executeRaw`
    ALTER TABLE "FeedbackReply"
    ADD COLUMN IF NOT EXISTS attachments JSONB NOT NULL DEFAULT '[]'::jsonb
  `

  return NextResponse.json({ ok: true, message: "FeedbackReply.attachments 컬럼 추가 완료" })
}
