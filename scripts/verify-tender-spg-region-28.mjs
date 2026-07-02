// 검증 — #28 입찰 SPG·시장 권역·작성자 필터 + 상세 인라인 편집
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
const title = `클로이검증_삭제예정_SPG_${stamp}`
const spgValue = `검증SPG_${stamp}`
const regionValue = `검증권역_${stamp}`
let tenderId = null

const browser = await chromium.launch({ headless: true })
const page = await (await browser.newContext()).newPage()

try {
  await page.goto(`${BASE}/login`)
  await page.fill('input[type="email"]', EMAIL)
  await page.fill('input[type="password"]', PASS)
  await page.click('button[type="submit"]')
  await page.waitForURL(u => !u.href.includes("/login"), { timeout: 15000 })
  log("✅", "로그인")

  // ① API로 SPG·시장권역 포함 입찰 생성
  const create = await page.evaluate(async ({ title, spg, marketRegion }) => {
    const r = await fetch("/api/tenders", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, spg, marketRegion }),
    })
    return { status: r.status, body: await r.json() }
  }, { title, spg: spgValue, marketRegion: regionValue })
  tenderId = create.body?.tenderId ?? null
  log(create.status === 200 && tenderId ? "✅" : "❌", "① 입찰 생성(SPG·권역 포함)", `status ${create.status}`)

  // ② 대시보드 목록에서 SPG·권역 뱃지 노출 확인
  await page.goto(`${BASE}/dashboard`)
  await page.locator(`text=${title}`).waitFor({ state: "visible", timeout: 10000 })
  const cardText = await page.locator(`li:has-text("${title}")`).first().innerText()
  log(cardText.includes(spgValue) ? "✅" : "❌", "②-a 카드에 SPG 뱃지 노출")
  log(cardText.includes(regionValue) ? "✅" : "❌", "②-b 카드에 시장권역 뱃지 노출")

  // ③ SPG 필터 선택 → 해당 입찰만 노출
  const spgSelect = page.locator("select").filter({ hasText: "SPG 전체" })
  await spgSelect.selectOption(spgValue)
  const filteredVisible = await page.locator(`text=${title}`).isVisible().catch(() => false)
  log(filteredVisible ? "✅" : "❌", "③ SPG 필터 선택 시 해당 입찰 노출 유지")

  // ④ 무관한 SPG 값 필터 선택 시 안 보여야 함(다른 옵션이 있을 때만 검증)
  const spgOptionCount = await spgSelect.locator("option").count()
  if (spgOptionCount > 2) {
    const otherValue = await spgSelect.locator("option").nth(1).getAttribute("value")
    if (otherValue && otherValue !== spgValue) {
      await spgSelect.selectOption(otherValue)
      const hiddenNow = !(await page.locator(`text=${title}`).isVisible().catch(() => false))
      log(hiddenNow ? "✅" : "❌", "④ 다른 SPG 필터 선택 시 검증용 입찰 숨김")
    } else {
      log("⚠️", "④ 스킵(다른 SPG 옵션 없음)")
    }
  } else {
    log("⚠️", "④ 스킵(SPG 옵션이 검증값 1개뿐)")
  }
  await spgSelect.selectOption("__all__")

  // ⑤ 상세 페이지에서 SPG·권역 표시 확인
  await page.goto(`${BASE}/tender/${tenderId}`)
  await page.locator(`text=${spgValue}`).waitFor({ state: "visible", timeout: 10000 })
  const detailText = await page.locator("body").innerText()
  log(detailText.includes(spgValue) && detailText.includes(regionValue) ? "✅" : "❌", "⑤ 상세 페이지 SPG·권역 표시")

  // ⑥ 인라인 편집으로 값 변경 → 새로고침 후 반영 확인
  const newSpg = `수정SPG_${stamp}`
  await page.getByRole("button", { name: "편집", exact: true }).click()
  const spgInput = page.locator('input[placeholder*="SPG"]')
  await spgInput.fill(newSpg)
  const patchDone = page.waitForResponse(r => r.url().includes(`/api/tenders/${tenderId}`) && r.request().method() === "PATCH", { timeout: 8000 })
  await page.getByRole("button", { name: "저장", exact: true }).click()
  const patchRes = await patchDone.catch(() => null)
  log(patchRes && patchRes.ok() ? "✅" : "❌", "⑥-a 저장 PATCH 응답", patchRes ? `status ${patchRes.status()}` : "no response")
  await page.reload()
  const afterEditText = await page.locator("body").innerText()
  log(afterEditText.includes(newSpg) ? "✅" : "❌", "⑥ 인라인 편집 후 새로고침 반영", newSpg)

} catch (e) {
  log("❌", "예외", String(e))
} finally {
  if (tenderId) {
    const del = await page.evaluate(async (id) => (await fetch(`/api/tenders/${id}`, { method: "DELETE" })).status, tenderId).catch(() => "err")
    log(del === 200 ? "✅" : "⚠️", "정리: 테스트 입찰 삭제", `DELETE ${del}`)
  }
  await browser.close()
  const failed = results.filter(r => r.startsWith("❌")).length
  console.log(`\n${failed === 0 ? "🟢 전체 통과" : `🔴 ${failed}건 실패`}`)
  process.exit(failed === 0 ? 0 : 1)
}
