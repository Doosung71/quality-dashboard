// Playwright 검증 — E2E-1 #30 (입회검사 상태변경 ③-1 + 다일 캘린더 ③-3)
// 테스트 검사 1건(2일 일정)을 생성 → 두 버그 확인 → 즉시 삭제 (라이브 DB 오염 최소화)
// 자격증명은 gitignore된 .env.local 에서 로드 (하드코딩 금지 — 코라 H-01)
import { config } from "dotenv"
config({ path: ".env.local" })
import { chromium } from "@playwright/test"

const BASE  = process.env.BASE_URL || "http://localhost:3001"
// 자격증명은 환경변수로만 주입 (하드코딩 금지 — 코라 H-01)
const EMAIL = process.env.WITNESS_VERIFY_EMAIL
const PASS  = process.env.WITNESS_VERIFY_PASSWORD
if (!EMAIL || !PASS) {
  console.error("❌ 환경변수 WITNESS_VERIFY_EMAIL / WITNESS_VERIFY_PASSWORD 를 설정하세요.")
  process.exit(1)
}
const CUST  = "클로이검증_삭제예정_30"   // 다른 검사와 겹치지 않는 고유 마커

const results = []
function log(icon, label, detail = "") {
  const line = `${icon} ${label}${detail ? " → " + detail : ""}`
  console.log(line)
  results.push(line)
}

// 오늘/내일 (같은 달 유지 — 07-01 기준 07-02, 월경계는 GET 단위테스트가 커버)
function ymd(d) { return d.toISOString().slice(0, 10) }
const today = new Date()
const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)
const TODAY = ymd(today)
const TOMORROW = ymd(tomorrow)
const YEAR = today.getFullYear()
const MONTH = today.getMonth() + 1
// 오늘·내일이 같은 달에 있으면 캘린더 셀 2개, 아니면 1개(월말)
const sameMonth = tomorrow.getMonth() === today.getMonth()
const expectCells = sameMonth ? 2 : 1

async function closeAnyModal(page) {
  try {
    const ackBtn = page.locator("button", { hasText: "확인했습니다" })
    if (await ackBtn.isVisible({ timeout: 600 })) { await ackBtn.click(); await page.waitForTimeout(300) }
  } catch { /* none */ }
  try {
    const overlay = page.locator(".fixed.inset-0.z-50")
    if (await overlay.isVisible({ timeout: 300 })) { await page.keyboard.press("Escape"); await page.waitForTimeout(300) }
  } catch { /* none */ }
}

const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
const page = await ctx.newPage()
let testId = null

try {
  // ── 로그인 ──────────────────────────────────────────────────
  await page.goto(`${BASE}/login`)
  await page.fill('input[type="email"]', EMAIL)
  await page.fill('input[type="password"]', PASS)
  await page.click('button[type="submit"]')
  await page.waitForURL(url => !url.href.includes("/login"), { timeout: 10000 })
  log("✅", "로그인 성공", page.url())
  await closeAnyModal(page)

  // ── 준비: 2일짜리 테스트 검사 생성 (API) ────────────────────
  const created = await page.evaluate(async ({ cust, start, end }) => {
    const res = await fetch("/api/witness", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer: cust, projectName: "다일 캘린더 검증", inspectionDate: start,
        endDate: end, assigneeName: "클로이", region: "DOMESTIC",
      }),
    })
    return { status: res.status, body: await res.json() }
  }, { cust: CUST, start: TODAY, end: TOMORROW })
  testId = created.body?.id
  log(created.status === 201 && testId ? "✅" : "❌", "준비: 2일 테스트검사 생성",
      `status ${created.status}, id ${testId}, ${TODAY}~${TOMORROW}`)

  // ── ③-3: 캘린더에 시작일·종료일 모두 표시되는지 ─────────────
  await page.goto(`${BASE}/witness?year=${YEAR}&month=${MONTH}`)
  await page.waitForLoadState("networkidle")
  await page.waitForTimeout(1200)
  // 캘린더 항목 버튼(border-l-4)만 카운트 — 하단 요약 리스트는 <a>라 제외됨
  const cellCount = await page.locator("button", { hasText: CUST }).count()
  log(cellCount >= expectCells ? "✅" : "❌", "③-3 다일 일정 캘린더 표시",
      `표시된 셀 ${cellCount}개 (기대 ${expectCells}개: 시작일+종료일)`)

  // ── ③-1: 상세에서 상태 변경 → 저장 → 반영 확인 ──────────────
  await page.goto(`${BASE}/witness/${testId}`)
  await page.waitForLoadState("networkidle")
  await page.waitForTimeout(1500)
  await closeAnyModal(page)   // 공지 모달이 수정 버튼을 가리는 것 방지
  // 수정 진입
  await page.locator('button', { hasText: /^수정$/ }).click()
  await page.waitForTimeout(600)
  // 상태 select 특정 — "COMPLETED" 옵션을 가진 select만 상태 드롭다운
  const selects = page.locator("select")
  const nSel = await selects.count()
  let statusSelect = null
  for (let i = 0; i < nSel; i++) {
    const vals = await selects.nth(i).locator("option").evaluateAll(os => os.map(o => o.value))
    if (vals.includes("COMPLETED")) { statusSelect = selects.nth(i); break }
  }
  if (!statusSelect) throw new Error("상태 드롭다운을 찾지 못함")
  await statusSelect.selectOption("COMPLETED")
  const selVal = await statusSelect.inputValue()
  log(selVal === "COMPLETED" ? "✅" : "❌", "③-1 상태 드롭다운 COMPLETED 선택", `값=${selVal}`)
  await page.locator('button', { hasText: /^저장/ }).click()
  await page.waitForTimeout(2000)
  // 저장 실패 시 rose-600 에러 span 노출 — 실제 텍스트를 잡아 원인 표시
  const errEl = page.locator("span.text-rose-600").first()
  const errText = (await errEl.isVisible().catch(() => false)) ? await errEl.textContent().catch(() => "") : ""
  log(!errText ? "✅" : "❌", "③-1 상태 변경 저장 (에러 없음)", errText || "OK")

  // 새로고침 후 반영 확인
  await page.reload()
  await page.waitForLoadState("networkidle")
  await page.waitForTimeout(1500)
  await closeAnyModal(page)
  const verify = await page.evaluate(async (id) => {
    const res = await fetch(`/api/witness/${id}`)
    const j = await res.json()
    return j.status
  }, testId)
  log(verify === "COMPLETED" ? "✅" : "❌", "③-1 상태 DB 반영 확인 (새로고침)", `status = ${verify}`)

} catch (err) {
  log("❌", "예외 발생", String(err))
} finally {
  // ── 정리: 테스트 검사 삭제 ──────────────────────────────────
  if (testId) {
    const del = await page.evaluate(async (id) => {
      const res = await fetch(`/api/witness/${id}`, { method: "DELETE" })
      return res.status
    }, testId).catch(() => "err")
    log(del === 200 ? "✅" : "⚠️", "정리: 테스트검사 삭제", `DELETE status ${del}`)
  }
  await browser.close()
  console.log("\n── 결과 요약 ──────────────────────")
  results.forEach(r => console.log(r))
  const failed = results.filter(r => r.startsWith("❌")).length
  console.log(`\n${failed === 0 ? "🟢 전체 통과" : `🔴 ${failed}건 실패`}`)
  process.exit(failed === 0 ? 0 : 1)
}
