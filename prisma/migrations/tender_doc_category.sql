-- 입찰 문서 카테고리 컬럼 추가 (신동기 차장 E2E-1 피드백)
ALTER TABLE "TenderDocument" ADD COLUMN IF NOT EXISTS "category" TEXT;
