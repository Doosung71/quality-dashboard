import { readFileSync } from "fs"
import { fileURLToPath } from "url"
import { dirname, join } from "path"
import postgres from "postgres"
import * as dotenv from "dotenv"

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, "../.env.local") })

const sql = postgres(process.env.DATABASE_URL_UNPOOLED, { ssl: "require" })

try {
  await sql`
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
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS "Vendor_createdById_idx" ON "Vendor"("createdById")`
  console.log("✓ Vendor 테이블 생성 완료 (dev DB)")
} catch (err) {
  console.error("Error:", err.message)
  process.exit(1)
} finally {
  await sql.end()
}
