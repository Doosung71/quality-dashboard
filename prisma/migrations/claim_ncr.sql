-- 고객 클레임 & 부적합품(NCR) 테이블 추가

CREATE TYPE "ClaimPriority" AS ENUM ('High', 'Mid', 'Low');
CREATE TYPE "ClaimStatus"   AS ENUM ('Received', 'Investigating', 'Action', 'Verification', 'Closed');
CREATE TYPE "NcrSeverity"   AS ENUM ('Critical', 'Major', 'Minor');
CREATE TYPE "NcrStatus"     AS ENUM ('Issued', 'Disposition', 'CorrectiveAction', 'Verification', 'Closed');
CREATE TYPE "NcrDisposition" AS ENUM ('Scrap', 'Rework', 'Concession', 'TBD');

CREATE TABLE "Claim" (
    "id"          TEXT             NOT NULL,
    "claimNo"     TEXT             NOT NULL,
    "title"       TEXT             NOT NULL,
    "customer"    TEXT             NOT NULL,
    "priority"    "ClaimPriority"  NOT NULL DEFAULT 'Mid',
    "status"      "ClaimStatus"    NOT NULL DEFAULT 'Received',
    "receivedAt"  TIMESTAMP(3)     NOT NULL,
    "closedAt"    TIMESTAMP(3),
    "assignee"    TEXT             NOT NULL,
    "description" TEXT             NOT NULL,
    "timeline"    JSONB            NOT NULL DEFAULT '[]',
    "createdAt"   TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT             NOT NULL,
    CONSTRAINT "Claim_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Claim_claimNo_key" ON "Claim"("claimNo");
CREATE INDEX "Claim_status_idx"    ON "Claim"("status");
CREATE INDEX "Claim_priority_idx"  ON "Claim"("priority");
CREATE INDEX "Claim_receivedAt_idx" ON "Claim"("receivedAt" DESC);

ALTER TABLE "Claim"
    ADD CONSTRAINT "Claim_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "Ncr" (
    "id"          TEXT             NOT NULL,
    "ncrNo"       TEXT             NOT NULL,
    "title"       TEXT             NOT NULL,
    "source"      TEXT             NOT NULL,
    "severity"    "NcrSeverity"    NOT NULL DEFAULT 'Major',
    "status"      "NcrStatus"      NOT NULL DEFAULT 'Issued',
    "disposition" "NcrDisposition" NOT NULL DEFAULT 'TBD',
    "issuedDate"  TIMESTAMP(3)     NOT NULL,
    "targetDate"  TIMESTAMP(3)     NOT NULL,
    "closedDate"  TIMESTAMP(3),
    "assignee"    TEXT             NOT NULL,
    "description" TEXT             NOT NULL,
    "timeline"    JSONB            NOT NULL DEFAULT '[]',
    "createdAt"   TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT             NOT NULL,
    CONSTRAINT "Ncr_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Ncr_ncrNo_key"       ON "Ncr"("ncrNo");
CREATE INDEX "Ncr_status_idx"     ON "Ncr"("status");
CREATE INDEX "Ncr_severity_idx"   ON "Ncr"("severity");
CREATE INDEX "Ncr_issuedDate_idx" ON "Ncr"("issuedDate" DESC);

ALTER TABLE "Ncr"
    ADD CONSTRAINT "Ncr_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
