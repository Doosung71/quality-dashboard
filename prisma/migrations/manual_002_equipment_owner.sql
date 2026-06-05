-- Equipment 소유자/관리팀 필드 추가
ALTER TABLE "Equipment"
  ADD COLUMN IF NOT EXISTS "managingTeam" TEXT,
  ADD COLUMN IF NOT EXISTS "ownerId"      TEXT REFERENCES "User"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "ownerName"    TEXT;  -- 시스템 외부 담당자명 fallback

CREATE INDEX IF NOT EXISTS "Equipment_ownerId_idx" ON "Equipment"("ownerId");

-- 담당자/관리팀 변경 이력 (append-only)
CREATE TABLE IF NOT EXISTS "EquipmentOwnerHistory" (
  "id"            TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "equipmentId"   TEXT        NOT NULL REFERENCES "Equipment"("id") ON DELETE CASCADE,
  "managingTeam"  TEXT,
  "ownerId"       TEXT        REFERENCES "User"("id") ON DELETE SET NULL,
  "ownerName"     TEXT,
  "changedById"   TEXT        NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
  "note"          TEXT,
  "changedAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "EquipmentOwnerHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "EquipmentOwnerHistory_equipmentId_idx" ON "EquipmentOwnerHistory"("equipmentId");
CREATE INDEX IF NOT EXISTS "EquipmentOwnerHistory_changedAt_idx"   ON "EquipmentOwnerHistory"("changedAt" DESC);
