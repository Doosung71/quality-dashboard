-- 협력업체 감사 & 출장검사 테이블 생성

CREATE TYPE "AuditType" AS ENUM ('INITIAL', 'PERIODIC', 'FOLLOW_UP', 'SPECIAL');
CREATE TYPE "AuditStatus" AS ENUM ('PLANNED', 'COMPLETED');
CREATE TYPE "FindingSeverity" AS ENUM ('CRITICAL', 'MAJOR', 'MINOR', 'OBSERVATION');
CREATE TYPE "FindingStatus" AS ENUM ('OPEN', 'CLOSED');
CREATE TYPE "InspectionResult" AS ENUM ('PASS', 'FAIL', 'CONDITIONAL_PASS');

CREATE TABLE "SupplierAudit" (
  "id"           TEXT NOT NULL PRIMARY KEY,
  "vendorId"     TEXT NOT NULL,
  "vendorName"   TEXT NOT NULL,
  "auditDate"    TIMESTAMP(3) NOT NULL,
  "auditType"    "AuditType" NOT NULL DEFAULT 'PERIODIC',
  "auditor"      TEXT NOT NULL,
  "location"     TEXT,
  "overallGrade" TEXT,
  "totalScore"   INTEGER,
  "status"       "AuditStatus" NOT NULL DEFAULT 'PLANNED',
  "summary"      TEXT,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdById"  TEXT NOT NULL REFERENCES "User"("id")
);

CREATE TABLE "AuditFinding" (
  "id"          TEXT NOT NULL PRIMARY KEY,
  "auditId"     TEXT NOT NULL REFERENCES "SupplierAudit"("id") ON DELETE CASCADE,
  "category"    TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "severity"    "FindingSeverity" NOT NULL DEFAULT 'MINOR',
  "requirement" TEXT,
  "status"      "FindingStatus" NOT NULL DEFAULT 'OPEN',
  "dueDate"     TIMESTAMP(3),
  "response"    TEXT,
  "closedAt"    TIMESTAMP(3),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "SourceInspection" (
  "id"             TEXT NOT NULL PRIMARY KEY,
  "vendorId"       TEXT NOT NULL,
  "vendorName"     TEXT NOT NULL,
  "inspectionDate" TIMESTAMP(3) NOT NULL,
  "location"       TEXT,
  "itemName"       TEXT NOT NULL,
  "itemCode"       TEXT,
  "quantity"       INTEGER NOT NULL,
  "sampleSize"     INTEGER,
  "result"         "InspectionResult" NOT NULL DEFAULT 'PASS',
  "defectCount"    INTEGER,
  "defectRate"     DOUBLE PRECISION,
  "inspector"      TEXT NOT NULL,
  "notes"          TEXT,
  "status"         TEXT NOT NULL DEFAULT 'DRAFT',
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdById"    TEXT NOT NULL REFERENCES "User"("id")
);

CREATE INDEX "SupplierAudit_vendorId_idx" ON "SupplierAudit"("vendorId");
CREATE INDEX "SupplierAudit_auditDate_idx" ON "SupplierAudit"("auditDate");
CREATE INDEX "AuditFinding_auditId_idx" ON "AuditFinding"("auditId");
CREATE INDEX "SourceInspection_vendorId_idx" ON "SourceInspection"("vendorId");
CREATE INDEX "SourceInspection_inspectionDate_idx" ON "SourceInspection"("inspectionDate");
