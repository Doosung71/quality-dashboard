// 회의록 파일첨부(#56) 골든패스 검증 — 로컬 dev 서버 대상
import { config } from "dotenv"
config({ path: ".env.local" })
import { chromium } from "@playwright/test"
import path from "node:path"

const BASE  = process.env.BASE_URL || "http://localhost:3000"
const EMAIL = process.env.WITNESS_VERIFY_EMAIL
const PASS  = process.env.WITNESS_VERIFY_PASSWORD
const TEST_FILE = process.env.MEETING_TEST_FILE
if (!EMAIL || !PASS) { console.error("EMAIL/PASSWORD 필요"); process.exit(1) }
if (!TEST_FILE) { console.error("MEETING_TEST_FILE 필요"); process.exit(1) }

let pass = 0, fail = 0
function check(label, cond) {
  if (cond) { console.log(`✅ ${label}`); pass++ }
  else      { console.log(`❌ ${label}`); fail++ }
}

const browser = await chromium.launch({ headless: true })
const page = await (await browser.newContext()).newPage()

try {
  await page.goto(`${BASE}/login`)
  await page.fill('input[type="email"]', EMAIL)
  await page.fill('input[type="password"]', PASS)
  await page.click('button[type="submit"]')
  await page.waitForURL(u => !u.href.includes("/login"), { timeout: 15000 })
  console.log("✅ 로그인", page.url())

  // 로그인 직후 뜨는 공지 모달 닫기 (있으면) — localStorage 기반이라 한 번만 닫으면 이후 안 뜸
  async function dismissNoticeModal() {
    const btn = page.locator('button:has-text("확인했습니다")').first()
    const appeared = await btn.waitFor({ state: "visible", timeout: 4000 }).then(() => true).catch(() => false)
    if (appeared) { await btn.click({ force: true }); await page.waitForTimeout(300) }
  }
  await dismissNoticeModal()

  // 이전 실행에서 남은 테스트 회의 정리
  await page.goto(`${BASE}/meetings`)
  await dismissNoticeModal()
  await page.evaluate(async () => {
    const list = await (await fetch("/api/meetings")).json()
    for (const m of list) {
      if (m.title.includes("V56 첨부파일 테스트 회의")) {
        await fetch(`/api/meetings/${m.id}`, { method: "DELETE" })
      }
    }
  })
  await page.reload()
  await dismissNoticeModal()

  // 1. 신규 회의 등록
  await page.click('button:has-text("회의 등록")')
  await page.fill('input[placeholder="회의명 *"]', "V56 첨부파일 테스트 회의")
  await page.click('form button[type="submit"]')

  const link = page.locator('a:has-text("V56 첨부파일 테스트 회의")').first()
  const linkAppeared = await link.waitFor({ state: "visible", timeout: 8000 }).then(() => true).catch(() => false)
  check("목록에 신규 회의 노출", linkAppeared)
  await link.click()
  await page.waitForURL(u => /\/meetings\/[a-z0-9]+/.test(u.href), { timeout: 10000 })
  const meetingUrl = page.url()
  const meetingId = meetingUrl.split("/meetings/")[1]

  // 2. 첨부파일 섹션 노출 확인
  const attachSectionAppeared = await page.locator('text=첨부파일').first()
    .waitFor({ state: "visible", timeout: 8000 }).then(() => true).catch(() => false)
  check("첨부파일 섹션 노출", attachSectionAppeared)

  // 3. 파일 업로드
  await page.setInputFiles('input[type="file"]', TEST_FILE)
  await page.waitForTimeout(2000)
  check("업로드 후 파일명 표시", await page.locator(`text=${path.basename(TEST_FILE)}`).count() > 0)

  // 4. 새로고침 후 영속 확인
  await page.reload()
  await dismissNoticeModal()
  await page.waitForTimeout(1000)
  check("새로고침 후 첨부파일 유지", await page.locator(`text=${path.basename(TEST_FILE)}`).count() > 0)

  // 5. API 직접 조회로도 재확인
  const apiCheck = await page.evaluate(async (id) => {
    const r = await fetch(`/api/meetings/${id}`)
    const j = await r.json()
    return Array.isArray(j.attachments) && j.attachments.length > 0
  }, meetingId)
  check("API 응답에 attachments 배열 포함", apiCheck)

  // 6. 삭제(정리)
  page.once("dialog", d => d.accept())
  await page.click('button:has-text("삭제")')
  await page.waitForTimeout(1000)

  console.log(`\n${pass} passed / ${fail} failed`)
  process.exitCode = fail > 0 ? 1 : 0
} finally {
  await browser.close()
}
