-- Migration: project_key 연결 키 추가 (Q1 Tender 생애주기 entity-linking)
-- 2026-06-20
-- Ncr·Claim에 nullable projectKey 컬럼 추가. 기존 행은 NULL 유지(backfill 없음, fail-open).

ALTER TABLE "Ncr"
  ADD COLUMN IF NOT EXISTS "projectKey" TEXT;

ALTER TABLE "Claim"
  ADD COLUMN IF NOT EXISTS "projectKey" TEXT;

-- autocomplete 조회(DISTINCT projectKey) 가속용 부분 인덱스
CREATE INDEX IF NOT EXISTS "Ncr_projectKey_idx" ON "Ncr"("projectKey") WHERE "projectKey" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "Claim_projectKey_idx" ON "Claim"("projectKey") WHERE "projectKey" IS NOT NULL;
