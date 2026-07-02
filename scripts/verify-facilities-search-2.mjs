// 검증 — E2E-1 #2 시험/분석 관리 검색 (프로젝트명 + 시료 설명 클라이언트 필터)
// 자격증명은 gitignore된 .env.local (WITNESS_VERIFY_*). 읽기 전용 — 데이터 생성 없음.
import { config } from "dotenv"
config({ path: ".env.local" })
import { chromium } from "@playwright/test"

const BASE  = process.env.BASE_URL || "http://localhost:3000"
const EMAIL = process.env.WITNESS_VERIFY_EMAIL
const PASS  = process.env.WITNESS_VERIFY_PASSWORD
if (!EMAIL || !PASS) { console.error("❌ WITNESS_VERIFY_EMAIL/PASSWORD 필요"); process.exit(1) }

const results = []
const log = (i, l, d = "") => { const s = `${i} ${l}${d ? " → " + d : ""}`; console.log(s); results.push(s) }

const browser = await chromium.launch({ headless: true })
const page = await (await browser.newContext()).newPage()

try {
  await page.goto(`${BASE}/login`)
  await page.fill('input[type="email"]', EMAIL)
  await page.fill('input[type="password"]', PASS)
  await page.click('button[type="submit"]')
  await page.waitForURL(u => !u.href.includes("/login"), { timeout: 20000 })
  log("✅", "로그인", page.url())

  // 공지/온보딩 모달 닫기
  await page.waitForSelector(".fixed.inset-0.z-50", { state: "visible", timeout: 5000 }).catch(() => {})
  for (const btn of [page.getByRole("button", { name: "확인했습니다" }), page.locator('[aria-label="닫기"]').first()]) {
    if (await btn.isVisible().catch(() => false)) { await btn.click().catch(() => {}); break }
  }

  await page.goto(`${BASE}/facilities/analysis`)
  await page.getByPlaceholder("프로젝트명, 시료 설명으로 검색").waitFor({ timeout: 15000 })
  log("✅", "V1 검색창 렌더링 확인")

  // 실 데이터에서 프로젝트명 하나 확보 (같은 세션 쿠키로 API 조회)
  // FS-03 반영: HTTP status / 배열 여부 / 길이 0을 분리해 "환경 준비 실패"와 "기능 실패"를 구분한다
  const apiCheck = await page.evaluate(async () => {
    const res = await fetch("/api/test-plans")
    const body = await res.json().catch(() => null)
    return { status: res.status, isArray: Array.isArray(body), length: Array.isArray(body) ? body.length : 0, body }
  })
  if (apiCheck.status !== 200) throw new Error(`환경 준비 실패 — /api/test-plans HTTP ${apiCheck.status} (권한/세션 문제 가능성)`)
  if (!apiCheck.isArray) throw new Error(`환경 준비 실패 — /api/test-plans 응답이 배열이 아님: ${JSON.stringify(apiCheck.body).slice(0, 200)}`)
  if (apiCheck.length === 0) throw new Error("환경 준비 실패 — test-plans 데이터 0건 (검증 계정 seed 데이터 필요)")
  const sample = apiCheck.body[0]
  const keyword = sample.projectName.slice(0, Math.min(4, sample.projectName.length))
  const expectedCount = apiCheck.body.filter(t =>
    t.projectName.toLowerCase().includes(keyword.toLowerCase()) ||
    (t.sampleDescription ?? "").toLowerCase().includes(keyword.toLowerCase())
  ).length

  // V2: 프로젝트명 일부로 검색 → 표시된 카드 수가 API 기준 기대 매칭 건수와 정확히 일치
  await page.getByPlaceholder("프로젝트명, 시료 설명으로 검색").fill(keyword)
  await page.waitForTimeout(300)
  const shownCount = await page.locator('[class*="space-y-3"] > div').count().catch(() => -1)
  const matched = await page.getByText(sample.projectName, { exact: false }).first().isVisible().catch(() => false)
  log(matched && shownCount === expectedCount ? "✅" : "❌",
    "V2 프로젝트명 검색 → 매칭 건수 정확히 일치",
    `keyword="${keyword}" expected=${expectedCount} shown=${shownCount}`)

  // V3: 검색 무결과 빈 상태
  await page.getByPlaceholder("프로젝트명, 시료 설명으로 검색").fill("존재하지않는검색어XYZ999")
  const v3 = await page.getByText("검색 결과가 없습니다.").isVisible({ timeout: 5000 }).catch(() => false)
  log(v3 ? "✅" : "❌", "V3 검색 무결과 빈 상태 표시")

  // V4: 검색어 삭제 → 원상 복구
  await page.getByPlaceholder("프로젝트명, 시료 설명으로 검색").fill("")
  await page.waitForTimeout(300)
  const restored = await page.getByText("검색 결과가 없습니다.").isVisible().catch(() => false)
  log(!restored ? "✅" : "❌", "V4 검색어 삭제 → 전체 목록 복구")
} catch (e) {
  log("❌", "검증 중단", e.message)
} finally {
  await browser.close()
  const fail = results.filter(r => r.startsWith("❌")).length
  console.log(`\n결과: ${results.length - fail}/${results.length} 통과`)
  process.exit(fail ? 1 : 0)
}
