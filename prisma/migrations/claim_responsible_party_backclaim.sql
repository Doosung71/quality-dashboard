-- Migration: 귀책처(responsibleParty) + Back-claim 테이블 추가
-- 2026-06-15

-- 1. Claim 테이블에 귀책처 컬럼 추가
ALTER TABLE "Claim"
  ADD COLUMN IF NOT EXISTS "responsibleParty" TEXT;

-- 2. BackClaimStatus enum 생성
DO $$ BEGIN
  CREATE TYPE "BackClaimStatus" AS ENUM ('DRAFT', 'SENT', 'REPLIED', 'SETTLED', 'CLOSED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 3. BackClaim 테이블 생성
CREATE TABLE IF NOT EXISTS "BackClaim" (
  "id"              TEXT        NOT NULL,
  "claimId"         TEXT        NOT NULL,
  "vendorName"      TEXT        NOT NULL,
  "sentAt"          TIMESTAMP(3),
  "replyDeadline"   TIMESTAMP(3),
  "claimedAmount"   INTEGER     NOT NULL,
  "recoveredAmount" INTEGER,
  "status"          "BackClaimStatus" NOT NULL DEFAULT 'DRAFT',
  "notes"           TEXT,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "BackClaim_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BackClaim_claimId_fkey"
    FOREIGN KEY ("claimId") REFERENCES "Claim"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "BackClaim_claimId_idx" ON "BackClaim"("claimId");
