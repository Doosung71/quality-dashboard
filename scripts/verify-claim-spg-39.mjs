// 검증 — #39 클레임 SPG 입력 + 목록 필터 + 상세 인라인 편집
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
const title = `클로이검증_삭제예정_클레임SPG_${stamp}`
const spgValue = `검증SPG_${stamp}`
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

  // ① API로 SPG 포함 클레임 생성
  const create = await page.evaluate(async ({ title, spg }) => {
    const r = await fetch("/api/claims", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title, customer: "검증고객사", priority: "Mid", assignee: "검증담당자",
        description: "검증용 자동생성 클레임", spg,
      }),
    })
    return { status: r.status, body: await r.json() }
  }, { title, spg: spgValue })
  claimId = create.body?.id ?? null
  log(create.status === 201 && claimId ? "✅" : "❌", "① 클레임 생성(SPG 포함)", `status ${create.status}`)

  // ② 상세 페이지에서 SPG 표시 확인
  await page.goto(`${BASE}/claims/${claimId}`)
  await page.locator(`text=${spgValue}`).waitFor({ state: "visible", timeout: 10000 })
  log("✅", "②상세 페이지 SPG 표시")

  // ③ 목록(칸반) 페이지에서 SPG 필터 노출 + 필터링 동작
  await page.goto(`${BASE}/claims`)
  await page.locator(`text=${title}`).waitFor({ state: "visible", timeout: 10000 })
  const spgSelect = page.locator("select").filter({ hasText: "SPG 전체" })
  const hasSpgFilter = await spgSelect.isVisible().catch(() => false)
  log(hasSpgFilter ? "✅" : "❌", "③-a SPG 필터 드롭다운 노출")
  if (hasSpgFilter) {
    await spgSelect.selectOption(spgValue)
    await page.waitForTimeout(300)
    const visibleAfterFilter = await page.locator(`text=${title}`).isVisible().catch(() => false)
    log(visibleAfterFilter ? "✅" : "❌", "③-b 필터 선택 시 해당 클레임 유지 노출")
    await spgSelect.selectOption("All")
  }

  // ④ 상세 페이지 인라인 편집 → 새로고침 후 반영 확인
  await page.goto(`${BASE}/claims/${claimId}`)
  const newSpg = `수정SPG_${stamp}`
  await page.getByRole("button", { name: "수정", exact: true }).click()
  const spgInput = page.locator('input[placeholder="예: 지중케이블"]')
  await spgInput.fill(newSpg)
  const patchDone = page.waitForResponse(r => r.url().includes(`/api/claims/${claimId}`) && r.request().method() === "PUT", { timeout: 8000 })
  await page.getByRole("button", { name: "저장", exact: true }).click()
  const patchRes = await patchDone.catch(() => null)
  log(patchRes && patchRes.ok() ? "✅" : "❌", "④-a 저장 PUT 응답", patchRes ? `status ${patchRes.status()}` : "no response")
  await page.reload()
  const afterEditText = await page.locator("body").innerText()
  log(afterEditText.includes(newSpg) ? "✅" : "❌", "④-b 인라인 편집 후 새로고침 반영", newSpg)

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
