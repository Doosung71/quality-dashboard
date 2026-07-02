-- Meeting 테이블에 첨부파일 컬럼 추가 (피드백 #56)
-- [{url, name, size, contentType}] 형식 JSONB

ALTER TABLE "Meeting" ADD COLUMN IF NOT EXISTS "attachments" JSONB NOT NULL DEFAULT '[]';
