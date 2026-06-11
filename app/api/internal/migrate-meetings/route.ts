import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const TOKEN = process.env.MIGRATION_SECRET ?? "qms-migrate-2026"

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("t") !== TOKEN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const steps: string[] = []
  try {
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MeetingType') THEN
          CREATE TYPE "MeetingType" AS ENUM (
            'QUALITY_ISSUE', 'STANDARD_REVIEW', 'CHANGE_MANAGEMENT', 'QUALITY_MEETING', 'OTHER'
          );
        END IF;
      END $$;
    `)
    steps.push("enum MeetingType OK")

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Meeting" (
        "id"          TEXT NOT NULL,
        "title"       TEXT NOT NULL,
        "type"        "MeetingType" NOT NULL,
        "meetingDate" TIMESTAMP(3) NOT NULL,
        "body"        TEXT NOT NULL DEFAULT '',
        "issueLinks"  JSONB NOT NULL DEFAULT '[]',
        "createdById" TEXT NOT NULL,
        "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Meeting_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "Meeting_createdById_fkey"
          FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
      );
    `)
    steps.push("table Meeting OK")

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "MeetingAction" (
        "id"           TEXT NOT NULL,
        "meetingId"    TEXT NOT NULL,
        "content"      TEXT NOT NULL,
        "assigneeName" TEXT NOT NULL,
        "dueDate"      TIMESTAMP(3),
        "done"         BOOLEAN NOT NULL DEFAULT false,
        "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "MeetingAction_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "MeetingAction_meetingId_fkey"
          FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `)
    steps.push("table MeetingAction OK")

    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Meeting_createdById_idx" ON "Meeting"("createdById");`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "MeetingAction_meetingId_idx" ON "MeetingAction"("meetingId");`)
    steps.push("indexes OK")

    return NextResponse.json({ ok: true, steps })
  } catch (e) {
    return NextResponse.json({ ok: false, steps, error: String(e) }, { status: 500 })
  }
}
