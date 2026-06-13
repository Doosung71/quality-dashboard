-- 입회검사 (Witness Inspection) 테이블 생성

CREATE TYPE "WitnessStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE "VoCCategory"   AS ENUM ('DEFECT', 'REQUIREMENT', 'SCHEDULE', 'DOCUMENT', 'OTHER');
CREATE TYPE "VoCPriority"   AS ENUM ('HIGH', 'NORMAL', 'LOW');
CREATE TYPE "VoCStatus"     AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED');

CREATE TABLE "WitnessInspection" (
  "id"             TEXT        NOT NULL PRIMARY KEY,
  "inspNo"         TEXT        NOT NULL UNIQUE,
  "customer"       TEXT        NOT NULL,
  "projectName"    TEXT        NOT NULL,
  "projectNumber"  TEXT,
  "productName"    TEXT,
  "inspectionDate" TIMESTAMP(3) NOT NULL,
  "endDate"        TIMESTAMP(3),
  "location"       TEXT,
  "assigneeId"     TEXT        NOT NULL,
  "assigneeName"   TEXT        NOT NULL,
  "status"         "WitnessStatus" NOT NULL DEFAULT 'SCHEDULED',
  "result"         "InspectionResult",
  "description"    TEXT,
  "notes"          TEXT,
  "attachments"    JSONB       NOT NULL DEFAULT '[]',
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdById"    TEXT        NOT NULL,
  FOREIGN KEY ("createdById") REFERENCES "User"("id")
);

CREATE TABLE "WitnessVoC" (
  "id"           TEXT        NOT NULL PRIMARY KEY,
  "inspectionId" TEXT        NOT NULL,
  "content"      TEXT        NOT NULL,
  "category"     "VoCCategory"  NOT NULL DEFAULT 'OTHER',
  "priority"     "VoCPriority"  NOT NULL DEFAULT 'NORMAL',
  "status"       "VoCStatus"    NOT NULL DEFAULT 'OPEN',
  "response"     TEXT,
  "dueDate"      TIMESTAMP(3),
  "closedAt"     TIMESTAMP(3),
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("inspectionId") REFERENCES "WitnessInspection"("id") ON DELETE CASCADE
);

CREATE INDEX "WitnessInspection_inspectionDate_idx" ON "WitnessInspection"("inspectionDate");
CREATE INDEX "WitnessVoC_inspectionId_idx" ON "WitnessVoC"("inspectionId");
