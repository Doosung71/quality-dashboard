-- 수주 프로젝트 관리 모델 추가

CREATE TYPE "AwardedProjectStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'COMPLETED');
CREATE TYPE "ContractGapType" AS ENUM ('MATCH', 'GAP', 'RELAXED', 'NEW');

CREATE TABLE "AwardedProject" (
  "id"          TEXT NOT NULL,
  "tenderId"    TEXT NOT NULL,
  "status"      "AwardedProjectStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdById" TEXT NOT NULL,
  CONSTRAINT "AwardedProject_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AwardedProject_tenderId_key" ON "AwardedProject"("tenderId");

ALTER TABLE "AwardedProject"
  ADD CONSTRAINT "AwardedProject_tenderId_fkey"
    FOREIGN KEY ("tenderId") REFERENCES "Tender"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "AwardedProject_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ContractDocument" (
  "id"               TEXT NOT NULL,
  "projectId"        TEXT NOT NULL,
  "filename"         TEXT NOT NULL,
  "storagePath"      TEXT NOT NULL,
  "uploadedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "isAnalysisSource" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "ContractDocument_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ContractDocument"
  ADD CONSTRAINT "ContractDocument_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "AwardedProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ContractAnalysis" (
  "id"            TEXT NOT NULL,
  "projectId"     TEXT NOT NULL,
  "documentId"    TEXT,
  "status"        "AnalysisStatus" NOT NULL DEFAULT 'DRAFT',
  "submittedAt"   TIMESTAMP(3),
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "aiUsed"        TEXT,
  "ragChunkCount" INTEGER NOT NULL DEFAULT 0,
  "directorMemo"  TEXT,
  "draftOpinion"  TEXT,
  CONSTRAINT "ContractAnalysis_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ContractAnalysis"
  ADD CONSTRAINT "ContractAnalysis_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "AwardedProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ContractAnalysis_documentId_fkey"
    FOREIGN KEY ("documentId") REFERENCES "ContractDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ContractGap" (
  "id"           TEXT NOT NULL,
  "analysisId"   TEXT NOT NULL,
  "category"     TEXT NOT NULL,
  "tenderItem"   TEXT NOT NULL,
  "contractItem" TEXT NOT NULL,
  "gapType"      "ContractGapType" NOT NULL,
  "isRisk"       BOOLEAN NOT NULL DEFAULT false,
  "sourcePage"   INTEGER,
  "remark"       TEXT,
  CONSTRAINT "ContractGap_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ContractGap"
  ADD CONSTRAINT "ContractGap_analysisId_fkey"
    FOREIGN KEY ("analysisId") REFERENCES "ContractAnalysis"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ContractReviewHistory" (
  "id"         TEXT NOT NULL,
  "analysisId" TEXT NOT NULL,
  "userId"     TEXT NOT NULL,
  "action"     "ReviewAction" NOT NULL,
  "fromStatus" "AnalysisStatus" NOT NULL,
  "toStatus"   "AnalysisStatus" NOT NULL,
  "reason"     TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContractReviewHistory_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ContractReviewHistory"
  ADD CONSTRAINT "ContractReviewHistory_analysisId_fkey"
    FOREIGN KEY ("analysisId") REFERENCES "ContractAnalysis"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ContractReviewHistory_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ContractComment" (
  "id"         TEXT NOT NULL,
  "analysisId" TEXT NOT NULL,
  "authorId"   TEXT NOT NULL,
  "content"    TEXT NOT NULL,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "parentId"   TEXT,
  CONSTRAINT "ContractComment_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ContractComment"
  ADD CONSTRAINT "ContractComment_analysisId_fkey"
    FOREIGN KEY ("analysisId") REFERENCES "ContractAnalysis"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ContractComment_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ContractComment_parentId_fkey"
    FOREIGN KEY ("parentId") REFERENCES "ContractComment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
