-- Migration: SPG(제품군)·시장 권역 필드 추가 (E2E-1 피드백 #28·#39)
-- 자유입력 필드 — 실사용 데이터가 쌓이면 고정 목록으로 전환 예정 (Dennis 결정, 2026-07-02)
-- 2026-07-02

ALTER TABLE "Tender"
  ADD COLUMN IF NOT EXISTS "spg" TEXT,
  ADD COLUMN IF NOT EXISTS "marketRegion" TEXT;

ALTER TABLE "Claim"
  ADD COLUMN IF NOT EXISTS "spg" TEXT;
