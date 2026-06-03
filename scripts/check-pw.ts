import { config } from "dotenv"
config({ path: ".env.local" })

import bcrypt from "bcryptjs"
import { neonConfig, Pool } from "@neondatabase/serverless"
neonConfig.webSocketConstructor = (globalThis as Record<string, unknown>).WebSocket as typeof WebSocket

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL! })

  const { rows } = await pool.query<{ email: string; passwordHash: string; status: string; role: string }>(
    `SELECT email, "passwordHash", status, role FROM "User" WHERE email = 'doosung71@gmail.com'`
  )

  if (!rows[0]) { console.log("❌ 사용자 없음"); return }

  const { email, passwordHash, status, role } = rows[0]
  console.log("email:", email)
  console.log("status:", status)
  console.log("role:", role)
  console.log("hash prefix:", passwordHash.slice(0, 10) + "...")

  const ok1 = await bcrypt.compare("admin1234!", passwordHash)
  console.log(`\n"admin1234!" 일치 여부: ${ok1 ? "✅ OK" : "❌ 불일치"}`)

  await pool.end()
}

main().catch(e => { console.error(e); process.exit(1) })
