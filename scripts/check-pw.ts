import { config } from "dotenv"
config({ path: ".env.local" })

import bcrypt from "bcryptjs"
import { neonConfig, Pool } from "@neondatabase/serverless"
neonConfig.webSocketConstructor = (globalThis as Record<string, unknown>).WebSocket as typeof WebSocket

async function main() {
  // 자격증명은 환경변수로만 주입 (하드코딩 금지 — 코라 H-01)
  const checkEmail = process.env.CHECK_EMAIL
  const checkPassword = process.env.CHECK_PASSWORD
  if (!checkEmail || !checkPassword) {
    console.error("❌ 환경변수 CHECK_EMAIL / CHECK_PASSWORD 를 설정하세요.")
    process.exit(1)
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL! })

  const { rows } = await pool.query<{ email: string; passwordHash: string; status: string; role: string }>(
    `SELECT email, "passwordHash", status, role FROM "User" WHERE email = $1`,
    [checkEmail]
  )

  if (!rows[0]) { console.log("❌ 사용자 없음"); return }

  const { email, passwordHash, status, role } = rows[0]
  console.log("email:", email)
  console.log("status:", status)
  console.log("role:", role)
  console.log("hash prefix:", passwordHash.slice(0, 10) + "...")

  const ok1 = await bcrypt.compare(checkPassword, passwordHash)
  console.log(`\n입력 비밀번호 일치 여부: ${ok1 ? "✅ OK" : "❌ 불일치"}`)

  await pool.end()
}

main().catch(e => { console.error(e); process.exit(1) })
