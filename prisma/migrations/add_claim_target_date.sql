-- 클레임 목표 처리기한 컬럼 추가 (D-Day 뱃지용)
ALTER TABLE "Claim" ADD COLUMN IF NOT EXISTS "targetDate" TIMESTAMP(3);
