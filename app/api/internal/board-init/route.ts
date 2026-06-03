import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("t") !== "qms2026board") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  // BoardCategory enum 생성
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BoardCategory') THEN
        CREATE TYPE "BoardCategory" AS ENUM ('NOTICE', 'GENERAL');
      END IF;
    END $$;
  `)

  // BoardPost 테이블
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "BoardPost" (
      id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      category    "BoardCategory" NOT NULL DEFAULT 'GENERAL',
      pinned      BOOLEAN NOT NULL DEFAULT false,
      title       TEXT NOT NULL,
      content     TEXT NOT NULL,
      "authorId"  TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `)

  // BoardComment 테이블
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "BoardComment" (
      id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "postId"    TEXT NOT NULL REFERENCES "BoardPost"(id) ON DELETE CASCADE,
      "authorId"  TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
      content     TEXT NOT NULL,
      "parentId"  TEXT REFERENCES "BoardComment"(id) ON DELETE CASCADE,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `)

  return NextResponse.json({ ok: true, message: "BoardPost, BoardComment 테이블 생성 완료" })
}
