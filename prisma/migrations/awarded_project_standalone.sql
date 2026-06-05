-- 수주 프로젝트: tenderId 선택사항 + title 필드 추가 (수의계약 지원)
ALTER TABLE "AwardedProject" ADD COLUMN "title" TEXT;
ALTER TABLE "AwardedProject" ALTER COLUMN "tenderId" DROP NOT NULL;
