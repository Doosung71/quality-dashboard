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

-- ─────────────────────────────────────────────────────────────────────
-- 적용 (신규/스테이징 환경): Prisma schema와 DB 컬럼이 어긋나면 projectKey
-- 저장 API가 런타임에서 실패하므로, 배포 전 반드시 적용한다.
--   npx prisma db execute --file prisma/migrations/add_project_key.sql --schema prisma/schema
--   (또는 Neon SQL Editor에 본 파일 내용 붙여넣기 실행)
-- 운영 적용: 2026-06-20 (4 queries executed successfully)
--
-- 검증 쿼리 (컬럼 + 부분 인덱스 존재 확인):
--   SELECT table_name, column_name FROM information_schema.columns
--     WHERE column_name = 'projectKey' AND table_name IN ('Ncr','Claim');
--   SELECT indexname FROM pg_indexes
--     WHERE indexname IN ('Ncr_projectKey_idx','Claim_projectKey_idx');
-- ─────────────────────────────────────────────────────────────────────
