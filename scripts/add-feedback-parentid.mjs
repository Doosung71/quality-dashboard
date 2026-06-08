import { neon } from '@neondatabase/serverless'
import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: join(__dirname, '..', '.env.local') })

const sql = neon(process.env.DATABASE_URL)
await sql`ALTER TABLE "FeedbackReply" ADD COLUMN IF NOT EXISTS "parentId" TEXT;`
console.log('✅ parentId column added to FeedbackReply')
