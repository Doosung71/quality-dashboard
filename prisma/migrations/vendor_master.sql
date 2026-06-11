-- migration: vendor_master
-- 동적 협력업체 등록을 위한 Vendor 마스터 테이블
-- vendors.json의 정적 데이터와 병행 운영. 신규 등록 업체만 DB에 저장.

CREATE TABLE IF NOT EXISTS "Vendor" (
  "id"          TEXT        NOT NULL,
  "name"        TEXT        NOT NULL,
  "location"    TEXT        NOT NULL DEFAULT '',
  "mainItem"    TEXT        NOT NULL DEFAULT '',
  "status"      TEXT        NOT NULL DEFAULT 'NORMAL',
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdById" TEXT        NOT NULL,
  CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Vendor_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Vendor_createdById_idx" ON "Vendor"("createdById");
