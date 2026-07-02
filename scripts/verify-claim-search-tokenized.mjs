// 검증 — 클레임 검색어 다중 단어(제목·SPG 각기 다른 필드) AND 매칭
import { config } from "dotenv"
config({ path: ".env.local" })
import { chromium } from "@playwright/test"

const BASE  = process.env.BASE_URL || "http://localhost:3001"
const EMAIL = process.env.WITNESS_VERIFY_EMAIL
const PASS  = process.env.WITNESS_VERIFY_PASSWORD
if (!EMAIL || !PASS) { console.error("❌ WITNESS_VERIFY_EMAIL/PASSWORD 필요"); process.exit(1) }

const results = []
const log = (i, l, d = "") => { const s = `${i} ${l}${d ? " → " + d : ""}`; console.log(s); results.push(s) }

const stamp = Date.now()
const title = `클로이검증_삭제예정_토큰검색_345kV_${stamp}`
const spgValue = `전력기기SPG_${stamp}`
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

  const create = await page.evaluate(async ({ title, spg }) => {
    const r = await fetch("/api/claims", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, customer: "검증고객사", priority: "Mid", assignee: "검증담당자", description: "토큰검색 검증용", spg }),
    })
    return { status: r.status, body: await r.json() }
  }, { title, spg: spgValue })
  claimId = create.body?.id ?? null
  log(create.status === 201 && claimId ? "✅" : "❌", "① 클레임 생성(제목엔 345kV, SPG엔 전력기기SPG)")

  await page.goto(`${BASE}/claims`)
  const searchInput = page.locator('input[placeholder*="SPG"]')
  await searchInput.waitFor({ state: "visible", timeout: 10000 })

  // ② 제목 단어 + SPG 단어를 공백으로 조합 → AND 매칭으로 찾아져야 함
  await searchInput.fill(`${spgValue} 345kV`)
  await page.waitForTimeout(200)
  const found = await page.locator(`text=${title}`).isVisible().catch(() => false)
  log(found ? "✅" : "❌", "② 서로 다른 필드(SPG+제목) 단어 조합 검색 성공")

  // ③ 존재하지 않는 추가 단어를 붙이면 매칭 안 됨(AND 조건 정상 동작)
  await searchInput.fill(`${spgValue} 존재하지않는단어xyz`)
  await page.waitForTimeout(200)
  const notFound = !(await page.locator(`text=${title}`).isVisible().catch(() => false))
  log(notFound ? "✅" : "❌", "③ 무관한 단어 추가 시 미노출(AND 조건 확인)")

} catch (e) {
  log("❌", "예외", String(e))
} finally {
  if (claimId) {
    const del = await page.evaluate(async (id) => (await fetch(`/api/claims/${id}`, { method: "DELETE" })).status, claimId).catch(() => "err")
    log(del === 200 ? "✅" : "⚠️", "정리: 테스트 클레임 삭제", `DELETE ${del}`)
  }
  await browser.close()
  const failed = results.filter(r => r.startsWith("❌")).length
  console.log(`\n${failed === 0 ? "🟢 전체 통과" : `🔴 ${failed}건 실패`}`)
  process.exit(failed === 0 ? 0 : 1)
}
