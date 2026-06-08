-- Claim, Ncr 테이블에 첨부파일 컬럼 추가
-- [{url, name, size, contentType}] 형식 JSONB

ALTER TABLE "Claim" ADD COLUMN IF NOT EXISTS "attachments" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "Ncr"   ADD COLUMN IF NOT EXISTS "attachments" JSONB NOT NULL DEFAULT '[]';
