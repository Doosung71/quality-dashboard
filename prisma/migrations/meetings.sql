-- 회의록 시스템 마이그레이션
-- 생성일: 2026-06-11

CREATE TYPE "MeetingType" AS ENUM (
  'QUALITY_ISSUE',
  'STANDARD_REVIEW',
  'CHANGE_MANAGEMENT',
  'QUALITY_MEETING',
  'OTHER'
);

CREATE TABLE "Meeting" (
  "id"          TEXT NOT NULL,
  "title"       TEXT NOT NULL,
  "type"        "MeetingType" NOT NULL,
  "meetingDate" TIMESTAMP(3) NOT NULL,
  "body"        TEXT NOT NULL DEFAULT '',
  "issueLinks"  JSONB NOT NULL DEFAULT '[]',
  "createdById" TEXT NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Meeting_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Meeting_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "MeetingAction" (
  "id"           TEXT NOT NULL,
  "meetingId"    TEXT NOT NULL,
  "content"      TEXT NOT NULL,
  "assigneeName" TEXT NOT NULL,
  "dueDate"      TIMESTAMP(3),
  "done"         BOOLEAN NOT NULL DEFAULT false,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MeetingAction_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MeetingAction_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "Meeting_createdById_idx" ON "Meeting"("createdById");
CREATE INDEX "MeetingAction_meetingId_idx" ON "MeetingAction"("meetingId");

-- updatedAt 자동갱신 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW."updatedAt" = CURRENT_TIMESTAMP; RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "Meeting_updatedAt"
  BEFORE UPDATE ON "Meeting"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER "MeetingAction_updatedAt"
  BEFORE UPDATE ON "MeetingAction"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
