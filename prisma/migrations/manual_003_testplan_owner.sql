-- TestPlan 관리팀·담당자 필드 추가
ALTER TABLE "TestPlan"
  ADD COLUMN IF NOT EXISTS "managingTeam" TEXT,
  ADD COLUMN IF NOT EXISTS "ownerId"      TEXT REFERENCES "User"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "ownerName"    TEXT;

CREATE INDEX IF NOT EXISTS "TestPlan_ownerId_idx" ON "TestPlan"("ownerId");

-- 시험 계획 담당자 변경 이력 (append-only)
CREATE TABLE IF NOT EXISTS "TestPlanOwnerHistory" (
  "id"            TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "testPlanId"    TEXT        NOT NULL REFERENCES "TestPlan"("id") ON DELETE CASCADE,
  "managingTeam"  TEXT,
  "ownerId"       TEXT        REFERENCES "User"("id") ON DELETE SET NULL,
  "ownerName"     TEXT,
  "changedById"   TEXT        NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
  "note"          TEXT,
  "changedAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "TestPlanOwnerHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "TestPlanOwnerHistory_testPlanId_idx" ON "TestPlanOwnerHistory"("testPlanId");
CREATE INDEX IF NOT EXISTS "TestPlanOwnerHistory_changedAt_idx"  ON "TestPlanOwnerHistory"("changedAt" DESC);
