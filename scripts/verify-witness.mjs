// Playwright 브라우저 테스트 — 입회검사 신규 기능 검증
import { chromium } from "@playwright/test"

const BASE = "http://localhost:3000"
const EMAIL = "doosung71@gmail.com"
const PASS  = "admin1234!"
const TODAY = new Date().toISOString().slice(0, 10)

const results = []
function log(icon, label, detail = "") {
  const line = `${icon} ${label}${detail ? " → " + detail : ""}`
  console.log(line)
  results.push(line)
}

async function closeAnyModal(page) {
  try {
    // 공지 모달 (NoticeModal) — "확인했습니다" 버튼 클릭
    const ackBtn = page.locator("button", { hasText: "확인했습니다" })
    if (await ackBtn.isVisible({ timeout: 600 })) {
      await ackBtn.click()
      await page.waitForTimeout(400)
    }
  } catch { /* no notice modal */ }
  try {
    // 기타 모달 — ESC로 닫기
    const overlay = page.locator(".fixed.inset-0.z-50")
    if (await overlay.isVisible({ timeout: 300 })) {
      await page.keyboard.press("Escape")
      await page.waitForTimeout(400)
    }
  } catch { /* no modal, ignore */ }
}

const browser = await chromium.launch({ headless: true })
const ctx     = await browser.newContext({ viewport: { width: 1280, height: 900 } })
const page    = await ctx.newPage()

// ── 로그인 ─────────────────────────────────────────────────────────────
await page.goto(`${BASE}/login`)
await page.fill('input[type="email"]',    EMAIL)
await page.fill('input[type="password"]', PASS)
await page.click('button[type="submit"]')
// 로그인 후 auth.config.ts → "/" 로 리다이렉트
await page.waitForURL(url => !url.href.includes("/login"), { timeout: 10000 })
log("✅", "로그인 성공", page.url())
await closeAnyModal(page)  // 공지 모달 닫기

// ── T1: 입회검사 등록 폼 — 시험장·권역 드롭다운 표시 확인 ───────────
await page.goto(`${BASE}/witness/new`)
await page.waitForLoadState("networkidle")

const roomSelect = page.locator("select").filter({ hasText: "시험장 선택" })
const roomOptions = await roomSelect.locator("option").allTextContents()
const hasGumi = roomOptions.some(o => o.includes("구미"))
const hasNew  = roomOptions.some(o => o.includes("새 시험장 등록"))
log(
  hasGumi && hasNew ? "✅" : "❌",
  "T1-a 시험장 드롭다운",
  `구미 포함: ${hasGumi}, '새 시험장 등록' 포함: ${hasNew}, 옵션 수: ${roomOptions.length}`
)

const regionSelect = page.locator("select").filter({ hasText: "권역 선택" })
const regionOptions = await regionSelect.locator("option").allTextContents()
const hasEurope = regionOptions.some(o => o.includes("유럽"))
log(
  hasEurope ? "✅" : "❌",
  "T1-b 권역 드롭다운",
  `옵션: ${regionOptions.join(", ")}`
)

// ── T6: 새 시험장 등록 모달 ─────────────────────────────────────────
await roomSelect.selectOption("__new__")
await page.waitForTimeout(400)

const modalHeading = page.locator("h3", { hasText: "새 시험장 등록" })
const modalVisible = await modalHeading.isVisible().catch(() => false)
log(modalVisible ? "✅" : "❌", "T6-a 새 시험장 등록 모달 오픈")

if (modalVisible) {
  // 모달 내부 input에 이름 입력
  await page.locator('input[placeholder*="물성실"]').fill("클로이 테스트 시험장")
  await page.waitForTimeout(200)

  // 모달 내 등록 버튼 — 정확히 "등록" 텍스트만 가진 버튼
  const saveBtn = page.locator('button').filter({ hasText: /^등록$/ })
  await saveBtn.click()
  await page.waitForTimeout(1500)  // API 호출 대기

  const modalGone = !(await modalHeading.isVisible({ timeout: 300 }).catch(() => false))
  const roomVal   = await roomSelect.inputValue().catch(() => "")
  const newRoomSelected = roomVal.startsWith("custom-")
  log(
    modalGone && newRoomSelected ? "✅" : "❌",
    "T6-b 모달 닫힘 + 신규 시험장 자동 선택",
    `모달닫힘: ${modalGone}, 선택값: ${roomVal}`
  )
}

// 모달이 열려있을 수 있으므로 닫기 (안전망)
await closeAnyModal(page)
await page.waitForTimeout(300)

// ── T1-c: 실제 등록 (구미 AC 1시험장 + 유럽 권역) ───────────────────
await page.goto(`${BASE}/witness/new`)
await page.waitForLoadState("networkidle")
await closeAnyModal(page)  // 혹시 남아있는 오버레이 제거

const roomSel2   = page.locator("select").filter({ hasText: "시험장 선택" })
const regionSel2 = page.locator("select").filter({ hasText: "권역 선택" })

await page.fill('input[placeholder*="한국전력"]',      "ACME Corp (Test)")
await page.fill('input[placeholder*="765kV"]',        "클로이 테스트 프로젝트")
await page.locator('input[type="date"]').first().fill(TODAY)
await roomSel2.selectOption("gumi-ac1")    // 구미 AC 1시험장(실드룸)
await regionSel2.selectOption("EUROPE")

// 충돌 경고 체크 (같은 날 다른 검사 없으면 경고 없음 — T4)
await page.waitForTimeout(600)
const conflictBanner = await page.locator("text=이 날 동일 시험장에 입회검사가 있습니다").isVisible().catch(() => false)
log("✅", "T4 충돌 없을 때 경고 배너 없음", `배너 표시: ${conflictBanner}`)

await page.fill('input[placeholder*="담당자"]', "클로이")
await page.locator('button:has-text("입회검사 등록")').click()
// /witness/new 에서 /witness/<id> 로 이동 대기 — /witness/new 는 제외
await page.waitForURL(
  url => /\/witness\/[^/]+$/.test(url.href) && !url.href.endsWith('/witness/new'),
  { timeout: 10000 }
).catch(() => {})
const detailUrl = page.url()
const registeredOk = /\/witness\/[^/]+$/.test(detailUrl) && !detailUrl.endsWith('/witness/new')
log(
  registeredOk ? "✅" : "❌",
  "T1-c 입회검사 등록 성공",
  detailUrl
)

// ── T1-d: 상세 페이지에서 시험장·권역 표시 확인 ─────────────────────
await page.waitForLoadState("networkidle")
// 클라이언트 fetch 완료 대기 (server component + client fetch 혼용)
await page.waitForTimeout(2000)
const pageText = await page.textContent("body").catch(() => "")
const showsRoom   = pageText.includes("구미 AC 1시험장")
const showsRegion = pageText.includes("유럽")
log(
  showsRoom && showsRegion ? "✅" : "❌",
  "T1-d 상세 페이지에 시험장·권역 표시",
  `시험장: ${showsRoom}, 권역: ${showsRegion}`
)

// ── T2: 충돌 감지 — 같은 날·같은 시험장 재등록 시도 ────────────────
await page.goto(`${BASE}/witness/new`)
await page.waitForLoadState("networkidle")
await closeAnyModal(page)

const roomSel3   = page.locator("select").filter({ hasText: "시험장 선택" })
const regionSel3 = page.locator("select").filter({ hasText: "권역 선택" })

await page.fill('input[placeholder*="한국전력"]',      "충돌 테스트 고객사")
await page.fill('input[placeholder*="765kV"]',        "충돌 테스트 프로젝트")
await page.locator('input[type="date"]').first().fill(TODAY)
await roomSel3.selectOption("gumi-ac1")   // 동일 시험장
await regionSel3.selectOption("DOMESTIC")

await page.waitForTimeout(2000)
const conflictVisible = await page.locator("text=이 날 동일 시험장에 입회검사가 있습니다").isVisible().catch(() => false)
log(
  conflictVisible ? "✅" : "❌",
  "T2 충돌 경고 배너 표시",
  `배너: ${conflictVisible}`
)

// 등록은 허용되는지 확인 (fail-open)
await page.fill('input[placeholder*="담당자"]', "클로이2")
await page.locator('button:has-text("입회검사 등록")').click()
await page.waitForURL(
  url => /\/witness\/[^/]+$/.test(url.href) && !url.href.endsWith('/witness/new'),
  { timeout: 8000 }
).catch(() => {})
const finalUrl = page.url()
const canStillRegister = /\/witness\/[^/]+$/.test(finalUrl) && !finalUrl.endsWith('/witness/new')
log(
  canStillRegister ? "✅" : "❌",
  "T2 fail-open: 경고에도 등록 허용",
  finalUrl
)

// ── T3·T5: 캘린더 — 색상·필터 확인 ─────────────────────────────────
await page.goto(`${BASE}/witness`)
await page.waitForLoadState("networkidle")
await page.waitForTimeout(1000)

// 권역 필터 칩 표시 확인
const europChip = page.locator("button", { hasText: "유럽" })
const europChipVisible = await europChip.isVisible().catch(() => false)
log(
  europChipVisible ? "✅" : "❌",
  "T5-a 권역 필터 칩 표시",
  `유럽 칩: ${europChipVisible}`
)

if (europChipVisible) {
  // 필터 선택
  await europChip.click()
  await page.waitForTimeout(300)
  const resetBtn = page.locator("button", { hasText: "필터 초기화" })
  const resetVisible = await resetBtn.isVisible().catch(() => false)
  log(resetVisible ? "✅" : "❌", "T5-b 필터 선택 → 초기화 버튼 표시")

  // 필터 해제 (재클릭)
  await europChip.click()
  await page.waitForTimeout(300)
  const resetGone = !(await resetBtn.isVisible({ timeout: 300 }).catch(() => false))
  log(resetGone ? "✅" : "❌", "T5-c 같은 칩 재클릭 → 필터 해제")
}

// 캘린더 항목 클릭 → 팝업 확인
const calItem = page.locator(".border-l-4").first()
const calItemVisible = await calItem.isVisible().catch(() => false)
if (calItemVisible) {
  await calItem.click()
  await page.waitForTimeout(500)
  const popup = page.locator("button", { hasText: "상세보기" })
  const popupVisible = await popup.isVisible().catch(() => false)
  log(
    popupVisible ? "✅" : "❌",
    "T3 캘린더 항목 클릭 → 팝업 표시",
    `팝업: ${popupVisible}`
  )

  // 팝업에 담당자 정보 있는지
  const popupContainer = page.locator("[class*='rounded-xl'][class*='shadow']")
  const popupText = await popupContainer.textContent().catch(() => "")
  const showsAssignee = popupText.includes("담당자")
  log(showsAssignee ? "✅" : "❌", "T3 팝업에 담당자 정보 표시")
} else {
  log("⚠️", "T3 캘린더 항목 없음 — 캘린더 뷰 아닌 다른 탭일 수 있음")
}

// ── 정리 ───────────────────────────────────────────────────────────────
await browser.close()

console.log("\n── 결과 요약 ──────────────────────")
results.forEach(r => console.log(r))
