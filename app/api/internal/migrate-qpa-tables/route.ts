import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const TOKEN = "qms-qpa-2026"

export async function POST(req: NextRequest) {
  const token = req.headers.get("x-migrate-token")
  if (token !== TOKEN) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "QpaAudit" (
      "id"              TEXT         NOT NULL,
      "qpaNo"           TEXT         NOT NULL,
      "vendorId"        TEXT         NOT NULL,
      "vendorName"      TEXT         NOT NULL,
      "location"        TEXT         NOT NULL DEFAULT '',
      "partName"        TEXT         NOT NULL DEFAULT '',
      "auditDate"       TIMESTAMPTZ  NOT NULL,
      "auditorNames"    TEXT         NOT NULL DEFAULT '',
      "templateVersion" TEXT         NOT NULL DEFAULT 'March 2026',
      "totalPotential"  INTEGER      NOT NULL DEFAULT 138,
      "totalScore"      INTEGER      NOT NULL DEFAULT 0,
      "totalPercent"    FLOAT8       NOT NULL DEFAULT 0,
      "level"           TEXT         NOT NULL DEFAULT '',
      "result"          TEXT         NOT NULL DEFAULT 'TBD',
      "status"          TEXT         NOT NULL DEFAULT 'InProgress',
      "createdById"     TEXT         NOT NULL,
      "createdAt"       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      "updatedAt"       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      CONSTRAINT "QpaAudit_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "QpaAudit_qpaNo_key" UNIQUE ("qpaNo"),
      CONSTRAINT "QpaAudit_createdById_fkey"
        FOREIGN KEY ("createdById") REFERENCES "User"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE
    )
  `)

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "QpaAuditItem" (
      "id"          TEXT         NOT NULL,
      "auditId"     TEXT         NOT NULL,
      "itemNo"      INTEGER      NOT NULL,
      "category"    TEXT         NOT NULL,
      "subCategory" TEXT         NOT NULL,
      "isKey"       BOOLEAN      NOT NULL DEFAULT FALSE,
      "checkItem"   TEXT         NOT NULL,
      "criteria"    TEXT         NOT NULL,
      "potential"   INTEGER      NOT NULL,
      "score"       INTEGER      NOT NULL DEFAULT 0,
      "isNA"        BOOLEAN      NOT NULL DEFAULT FALSE,
      "comment"     TEXT         NOT NULL DEFAULT '',
      "evidence"    TEXT         NOT NULL DEFAULT '',
      "createdAt"   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      "updatedAt"   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      CONSTRAINT "QpaAuditItem_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "QpaAuditItem_auditId_itemNo_key" UNIQUE ("auditId", "itemNo"),
      CONSTRAINT "QpaAuditItem_auditId_fkey"
        FOREIGN KEY ("auditId") REFERENCES "QpaAudit"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
    )
  `)

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "QpaFinding" (
      "id"          TEXT         NOT NULL,
      "auditId"     TEXT         NOT NULL,
      "seq"         INTEGER      NOT NULL,
      "category"    TEXT         NOT NULL,
      "finding"     TEXT         NOT NULL,
      "action"      TEXT         NOT NULL DEFAULT '',
      "responsible" TEXT         NOT NULL DEFAULT '',
      "dueDate"     TIMESTAMPTZ,
      "status"      TEXT         NOT NULL DEFAULT 'OPEN',
      "createdAt"   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      "updatedAt"   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      CONSTRAINT "QpaFinding_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "QpaFinding_auditId_fkey"
        FOREIGN KEY ("auditId") REFERENCES "QpaAudit"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
    )
  `)

  return NextResponse.json({ ok: true, message: "QPA tables created" })
}
