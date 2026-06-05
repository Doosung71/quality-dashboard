-- facilities.prisma 모델 수동 마이그레이션
-- Equipment + TestPlan 테이블 신규 생성
-- prisma db push가 knowledge_chunks 드롭을 시도하므로 직접 SQL 적용

CREATE TABLE IF NOT EXISTS "Equipment" (
  "id"             TEXT        NOT NULL,
  "hallId"         TEXT,
  "yardId"         TEXT,
  "siteId"         TEXT        NOT NULL,
  "category"       TEXT        NOT NULL DEFAULT '시험설비',
  "name"           TEXT        NOT NULL,
  "type"           TEXT        NOT NULL,
  "spec"           JSONB       NOT NULL DEFAULT '{}',
  "maker"          TEXT        NOT NULL DEFAULT '',
  "makerCountry"   TEXT,
  "yearIntroduced" INTEGER     NOT NULL,
  "quantity"       INTEGER     NOT NULL DEFAULT 1,
  "status"         TEXT        NOT NULL DEFAULT 'normal',
  "replacedById"   TEXT,
  "replacesId"     TEXT,
  "notes"          TEXT        NOT NULL DEFAULT '',
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "Equipment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TestPlan" (
  "id"                TEXT        NOT NULL,
  "equipmentId"       TEXT        NOT NULL,
  "testCategory"      TEXT        NOT NULL,
  "projectName"       TEXT        NOT NULL,
  "sampleType"        TEXT        NOT NULL DEFAULT 'cable',
  "sampleDescription" TEXT        NOT NULL DEFAULT '',
  "plannedStart"      TEXT        NOT NULL,
  "plannedEnd"        TEXT        NOT NULL,
  "actualStart"       TEXT,
  "actualEnd"         TEXT,
  "status"            TEXT        NOT NULL DEFAULT '준비중',
  "progress"          INTEGER     NOT NULL DEFAULT 0,
  "logs"              JSONB       NOT NULL DEFAULT '[]',
  "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "TestPlan_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TestPlan_equipmentId_fkey"
    FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "Equipment_siteId_idx"    ON "Equipment"("siteId");
CREATE INDEX IF NOT EXISTS "Equipment_hallId_idx"    ON "Equipment"("hallId");
CREATE INDEX IF NOT EXISTS "Equipment_yardId_idx"    ON "Equipment"("yardId");
CREATE INDEX IF NOT EXISTS "TestPlan_equipmentId_idx" ON "TestPlan"("equipmentId");
CREATE INDEX IF NOT EXISTS "TestPlan_status_idx"     ON "TestPlan"("status");
