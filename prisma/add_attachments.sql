-- Add attachments column to all modules (safe: only adds columns, no drops)
ALTER TABLE "Equipment"          ADD COLUMN IF NOT EXISTS "attachments" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "EquipmentRepair"    ADD COLUMN IF NOT EXISTS "attachments" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "IncomingInspection" ADD COLUMN IF NOT EXISTS "attachments" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "SourceInspection"   ADD COLUMN IF NOT EXISTS "attachments" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "SupplierAudit"      ADD COLUMN IF NOT EXISTS "attachments" JSONB NOT NULL DEFAULT '[]';
