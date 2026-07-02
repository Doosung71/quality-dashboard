// 검증 — #39 B항목(코라 검수 반영): 클레임 SPG가 knowledge_chunks 인제스트에 실제 반영되는지
// 종결 클레임 생성 → status=Closed 전환(after() 훅으로 ingestClosedClaim 실행) → DB에서 metadata.spg 확인
import { config } from "dotenv"
config({ path: ".env.local" })
import { chromium } from "@playwright/test"
import { neon } from "@neondatabase/serverless"

const BASE  = process.env.BASE_URL || "http://localhost:3001"
const EMAIL = process.env.WITNESS_VERIFY_EMAIL
const PASS  = process.env.WITNESS_VERIFY_PASSWORD
if (!EMAIL || !PASS) { console.error("❌ WITNESS_VERIFY_EMAIL/PASSWORD 필요"); process.exit(1) }
if (!process.env.DATABASE_URL_UNPOOLED) { console.error("❌ DATABASE_URL_UNPOOLED 필요 (knowledge_chunks 조회용)"); process.exit(1) }

const sql = neon(process.env.DATABASE_URL_UNPOOLED)
const results = []
const log = (i, l, d = "") => { const s = `${i} ${l}${d ? " → " + d : ""}`; console.log(s); results.push(s) }

const stamp = Date.now()
const title = `클로이검증_삭제예정_SPG인제스트_${stamp}`
const spgValue = `검증SPG인제스트_${stamp}`
let claimId = null

const browser = await chromium.launch({ headless: true })
const page = await (await browser.newContext()).newPage()

try {
  await page.goto(`${BASE}/login`)
  await page.fill('input[type="email"]', EMAIL)
  await page.fill('input[type="password"]', PASS)
  await page.click('button[type="submit"]')
  await page.waitForURL(u => !u.href.includes("/login"), { timeout: 15000 })
  log("✅", "로그인")

  // ① SPG 포함 클레임 생성
  const create = await page.evaluate(async ({ title, spg }) => {
    const r = await fetch("/api/claims", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title, customer: "검증고객사", priority: "Mid", assignee: "검증담당자",
        description: "SPG 인제스트 검증용 클레임", spg,
      }),
    })
    return { status: r.status, body: await r.json() }
  }, { title, spg: spgValue })
  claimId = create.body?.id ?? null
  log(create.status === 201 && claimId ? "✅" : "❌", "① 클레임 생성(SPG 포함)", `status ${create.status}`)

  // ② Closed 전환 → after() 훅으로 ingestClosedClaim 트리거
  const closePatch = await page.evaluate(async (id) => {
    const r = await fetch(`/api/claims/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "Closed", closedAt: new Date().toISOString().slice(0, 10) }),
    })
    return r.status
  }, claimId)
  log(closePatch === 200 ? "✅" : "❌", "② 클레임 Closed 전환", `status ${closePatch}`)

  // ③ 인제스트 완료 대기(임베딩·Claude 요약 호출) 후 knowledge_chunks 조회
  let rows = []
  for (let i = 0; i < 10; i++) {
    await new Promise(r => setTimeout(r, 2000))
    rows = await sql`SELECT source_path, metadata, chunk FROM knowledge_chunks WHERE source_path LIKE ${`claim_closed/${claimId}/%`}`
    if (rows.length > 0) break
  }
  log(rows.length > 0 ? "✅" : "❌", "③ knowledge_chunks에 인제스트됨", `${rows.length}건`)

  const metaHasSpg = rows.some(r => {
    const meta = typeof r.metadata === "string" ? JSON.parse(r.metadata) : r.metadata
    return meta?.spg === spgValue
  })
  log(metaHasSpg ? "✅" : "❌", "④ metadata.spg에 SPG 값 반영")

  const contentHasSpg = rows.some(r => typeof r.chunk === "string" && r.chunk.includes(spgValue))
  log(contentHasSpg ? "✅" : "❌", "⑤ 원문 마크다운에 SPG 라인 포함")

} catch (e) {
  log("❌", "예외", String(e))
} finally {
  if (claimId) {
    await sql`DELETE FROM knowledge_chunks WHERE source_path LIKE ${`claim_closed/${claimId}/%`}`
      .then(() => log("✅", "정리: knowledge_chunks 삭제"))
      .catch(e => log("⚠️", "정리 실패(knowledge_chunks)", String(e)))
    const del = await page.evaluate(async (id) => (await fetch(`/api/claims/${id}`, { method: "DELETE" })).status, claimId).catch(() => "err")
    log(del === 200 ? "✅" : "⚠️", "정리: 테스트 클레임 삭제", `DELETE ${del}`)
  }
  await browser.close()
  const failed = results.filter(r => r.startsWith("❌")).length
  console.log(`\n${failed === 0 ? "🟢 전체 통과" : `🔴 ${failed}건 실패`}`)
  process.exit(failed === 0 ? 0 : 1)
}
