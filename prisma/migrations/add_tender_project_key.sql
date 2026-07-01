-- Migration: Tender project_key 연결 키 추가 (Q1 entity-linking — 고리④ 과거이력 surface)
-- 2026-07-01
-- Tender에 nullable projectKey 컬럼 추가. 기존 행은 NULL 유지(backfill 없음, fail-open).
-- NCR·Claim의 add_project_key.sql과 동일 패턴. 입찰의 키로 같은 project_key의
-- 종결 NCR·클레임·verified_lesson을 입찰 상세에 자동 surface한다.

ALTER TABLE "Tender"
  ADD COLUMN IF NOT EXISTS "projectKey" TEXT;

-- 같은 키의 과거이력 조회 가속용 부분 인덱스
CREATE INDEX IF NOT EXISTS "Tender_projectKey_idx" ON "Tender"("projectKey") WHERE "projectKey" IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────
-- 적용 (신규/스테이징 환경): Prisma schema와 DB 컬럼이 어긋나면 projectKey
-- 저장·조회가 런타임에서 실패하므로, 배포 전 반드시 적용한다.
--   npx prisma db execute --file prisma/migrations/add_tender_project_key.sql --schema prisma/schema
--   (또는 Neon SQL Editor에 본 파일 내용 붙여넣기 실행)
-- 운영 적용: (미적용 — Dennis 직접 실행 예정)
--
-- 검증 쿼리 (컬럼 + 부분 인덱스 존재 확인):
--   SELECT table_name, column_name FROM information_schema.columns
--     WHERE column_name = 'projectKey' AND table_name = 'Tender';
--   SELECT indexname FROM pg_indexes WHERE indexname = 'Tender_projectKey_idx';
-- ─────────────────────────────────────────────────────────────────────
