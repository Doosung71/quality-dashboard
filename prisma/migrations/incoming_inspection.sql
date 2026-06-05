-- 수입검사 (Incoming Inspection) 테이블 추가
CREATE TABLE "IncomingInspection" (
    "id"             TEXT        NOT NULL,
    "vendorId"       TEXT        NOT NULL,
    "vendorName"     TEXT        NOT NULL,
    "poNumber"       TEXT,
    "receiptDate"    TIMESTAMP(3) NOT NULL,
    "inspectionDate" TIMESTAMP(3) NOT NULL,
    "itemName"       TEXT        NOT NULL,
    "itemCode"       TEXT,
    "quantity"       INTEGER     NOT NULL,
    "sampleSize"     INTEGER,
    "result"         "InspectionResult" NOT NULL DEFAULT 'PASS',
    "defectCount"    INTEGER,
    "defectRate"     DOUBLE PRECISION,
    "inspector"      TEXT        NOT NULL,
    "notes"          TEXT,
    "status"         TEXT        NOT NULL DEFAULT 'DRAFT',
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById"    TEXT        NOT NULL,

    CONSTRAINT "IncomingInspection_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "IncomingInspection_vendorId_idx" ON "IncomingInspection"("vendorId");
CREATE INDEX "IncomingInspection_inspectionDate_idx" ON "IncomingInspection"("inspectionDate");
CREATE INDEX "IncomingInspection_result_idx" ON "IncomingInspection"("result");

ALTER TABLE "IncomingInspection"
    ADD CONSTRAINT "IncomingInspection_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
