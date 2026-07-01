// 검증 — E2E-1 #63 NCR 처리이력 시스템/사용자 분리 + 되돌리기 dedup
// 실제 브라우저에서 단계 이동 버튼을 클릭해 배지·dedup DOM을 확인한다.
// 자격증명은 gitignore된 .env.local (WITNESS_VERIFY_*). 테스트 NCR은 정리 삭제.
import { config } from "dotenv"
config({ path: ".env.local" })
import { chromium } from "@playwright/test"

const BASE  = process.env.BASE_URL || "http://localhost:3001"
const EMAIL = process.env.WITNESS_VERIFY_EMAIL
const PASS  = process.env.WITNESS_VERIFY_PASSWORD
if (!EMAIL || !PASS) { console.error("❌ WITNESS_VERIFY_EMAIL/PASSWORD 필요"); process.exit(1) }

const results = []
const log = (i, l, d = "") => { const s = `${i} ${l}${d ? " → " + d : ""}`; console.log(s); results.push(s) }

// 처리 이력 카드 내 "시스템" 배지 개수
const sysBadgeCount = (page) => page.getByText("시스템", { exact: true }).count()
// 처리 이력 항목(점) 총 개수 — 타임라인 항목 수
const timelineCount = (page) =>
  page.evaluate(() => {
    const h2 = [...document.querySelectorAll("h2")].find(h => h.textContent?.includes("처리 이력"))
    if (!h2) return -1
    const card = h2.closest("div")
    // 각 항목은 group 클래스의 flex row
    return card ? card.querySelectorAll(".group").length : -1
  })

const browser = await chromium.launch({ headless: true })
const page = await (await browser.newContext()).newPage()
let testId = null

try {
  await page.goto(`${BASE}/login`)
  await page.fill('input[type="email"]', EMAIL)
  await page.fill('input[type="password"]', PASS)
  await page.click('button[type="submit"]')
  await page.waitForURL(u => !u.href.includes("/login"), { timeout: 20000 })
  log("✅", "로그인", page.url())

  // 온보딩 모달(로그인 1회 표시)이 클릭을 가로채므로 닫는다 — 닫으면 sessionStorage에 기록돼 재표시 안 됨
  await page.locator('[aria-label="닫기"]').first().click({ timeout: 6000 }).catch(() => {})

  // 테스트 NCR 생성
  const created = await page.evaluate(async () => {
    const r = await fetch("/api/ncr", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "클로이검증_삭제예정_63", source: "검증", severity: "Minor",
        disposition: "TBD", targetDate: "2026-08-01", assignee: "클로이",
        description: "타임라인 dedup 검증용 (삭제 예정)",
      }),
    })
    return { status: r.status, body: await r.json() }
  })
  testId = created.body?.id
  log(created.status === 201 && testId ? "✅" : "❌", "테스트 NCR 생성(201)", `status ${created.status}`)
  if (!testId) throw new Error("NCR 생성 실패 — 이후 스킵")

  await page.goto(`${BASE}/ncr/${testId}`)
  await page.getByRole("heading", { name: "처리 이력" }).waitFor({ timeout: 15000 })
  // 로그인 시 뜨는 모달(시스템 공지 "확인했습니다" / 온보딩 "닫기")이 클릭을 가로채므로 닫는다.
  // 모달 마운트에 시간이 걸리므로 오버레이가 뜰 때까지 기다린 뒤 닫는다.
  await page.waitForSelector(".fixed.inset-0.z-50", { state: "visible", timeout: 6000 }).catch(() => {})
  for (const btn of [page.getByRole("button", { name: "확인했습니다" }), page.locator('[aria-label="닫기"]').first()]) {
    if (await btn.isVisible().catch(() => false)) { await btn.click().catch(() => {}); break }
  }
  await page.waitForSelector(".fixed.inset-0.z-50", { state: "detached", timeout: 8000 }).catch(() => {})

  // V1: 생성 직후 — 시스템 배지 1 (부적합 발행), 총 1건
  await page.waitForFunction(() => document.body.textContent?.includes("부적합 발행"), { timeout: 10000 })
  const v1sys = await sysBadgeCount(page)
  const v1cnt = await timelineCount(page)
  log(v1sys === 1 && v1cnt === 1 ? "✅" : "❌", "V1 생성 직후 시스템 배지 1·항목 1", `sys=${v1sys} cnt=${v1cnt}`)

  // V2: 다음 단계 → 시스템 로그 추가 (배지 2, 항목 2)
  await page.getByRole("button", { name: /다음 단계/ }).click()
  // 주의: "단계 이동"은 섹션 헤더에도 있어 항상 존재 → 타임라인 항목 수가 2가 될 때까지 대기
  await page.waitForFunction(() => {
    const h2 = [...document.querySelectorAll("h2")].find(h => h.textContent?.includes("처리 이력"))
    return h2?.closest("div")?.querySelectorAll(".group").length === 2
  }, { timeout: 10000 }).catch(() => {})
  const v2sys = await sysBadgeCount(page)
  const v2cnt = await timelineCount(page)
  log(v2sys === 2 && v2cnt === 2 ? "✅" : "❌", "V2 다음 단계 → 시스템 배지 2·항목 2", `sys=${v2sys} cnt=${v2cnt}`)

  // V3: 이전 단계(되돌리기) → dedup으로 방금 항목 제거 (배지 1, 항목 1)
  await page.getByRole("button", { name: /이전 단계/ }).click()
  await page.waitForFunction(() => {
    const h2 = [...document.querySelectorAll("h2")].find(h => h.textContent?.includes("처리 이력"))
    return h2?.closest("div")?.querySelectorAll(".group").length === 1
  }, { timeout: 10000 }).catch(() => {})
  const v3sys = await sysBadgeCount(page)
  const v3cnt = await timelineCount(page)
  log(v3sys === 1 && v3cnt === 1 ? "✅" : "❌", "V3 되돌리기 dedup → 배지 1·항목 1", `sys=${v3sys} cnt=${v3cnt}`)

  // V4: 수동 메모 추가 → 사용자 항목(배지 없음). 배지 여전히 1, 항목 2
  await page.getByPlaceholder(/처리 내용을 입력/).fill("클로이 수동 메모 검증")
  await page.getByRole("button", { name: /추가/ }).click()
  await page.waitForFunction(() => document.body.textContent?.includes("클로이 수동 메모 검증"), { timeout: 10000 })
  const v4sys = await sysBadgeCount(page)
  const v4cnt = await timelineCount(page)
  log(v4sys === 1 && v4cnt === 2 ? "✅" : "❌", "V4 수동 메모 → 배지 그대로 1·항목 2", `sys=${v4sys} cnt=${v4cnt}`)
} catch (e) {
  log("❌", "예외", String(e))
} finally {
  if (testId) {
    const del = await page.evaluate(async (id) =>
      (await fetch(`/api/ncr/${id}`, { method: "DELETE" })).status, testId).catch(() => "err")
    log(del === 200 ? "✅" : "⚠️", "정리: 테스트 NCR 삭제", `DELETE ${del}`)
  }
  await browser.close()
  const failed = results.filter(r => r.startsWith("❌")).length
  console.log(`\n${failed === 0 ? "🟢 전체 통과" : `🔴 ${failed}건 실패`}`)
  process.exit(failed === 0 ? 0 : 1)
}
