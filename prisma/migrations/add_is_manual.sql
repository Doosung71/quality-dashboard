-- QD SpecRequirement: 수동 추가 요구사항 구분 필드
ALTER TABLE "SpecRequirement" ADD COLUMN IF NOT EXISTS "isManual" BOOLEAN NOT NULL DEFAULT false;
