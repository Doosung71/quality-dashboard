// 검증 — 클레임 검색창에 SPG 값 입력 시 검색됨 + 디바운스로 IME 리렌더링 최소화
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
const title = `클로이검증_삭제예정_SPG검색_${stamp}`
const spgValue = `검색용SPG_${stamp}`
let claimId = null

const browser = await chromium.launch({ headless: true })
const page = await (await browser.newContext()).newPage()

const replaceCalls = []
page.on("framenavigated", () => {})

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
      body: JSON.stringify({ title, customer: "검증고객사", priority: "Mid", assignee: "검증담당자", description: "검색 검증용", spg }),
    })
    return { status: r.status, body: await r.json() }
  }, { title, spg: spgValue })
  claimId = create.body?.id ?? null
  log(create.status === 201 && claimId ? "✅" : "❌", "① 클레임 생성(SPG 포함)")

  await page.goto(`${BASE}/claims`)
  const searchInput = page.locator('input[placeholder*="SPG"]')
  await searchInput.waitFor({ state: "visible", timeout: 10000 })

  // ② SPG 값으로 검색 → 즉시(디바운스 전) 필터링 결과에 노출되는지
  await searchInput.fill(spgValue)
  const visibleImmediately = await page.locator(`text=${title}`).isVisible().catch(() => false)
  log(visibleImmediately ? "✅" : "❌", "② SPG 검색어 입력 즉시 필터링(로컬 state)")

  // ③ 디바운스 후 URL에 q= 파라미터 반영 확인
  await page.waitForTimeout(1500)
  const url = new URL(page.url())
  log(url.searchParams.get("q") === spgValue ? "✅" : "❌", "③ 디바운스 후 URL 쿼리 동기화", `actual="${url.search}" expected q=${spgValue}`)

  // ④ 검색어 지우면 다시 전체 노출
  await searchInput.fill("")
  await page.waitForTimeout(100)
  const visibleAfterClear = await page.locator(`text=${title}`).isVisible().catch(() => false)
  log(visibleAfterClear ? "✅" : "❌", "④ 검색어 삭제 시 다시 노출")

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
