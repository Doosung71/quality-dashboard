// 검증 — 피드백 게시판 등록순 번호(#N)가 실제 createdAt 오름차순 기준과 일치하는지
import { config } from "dotenv"
config({ path: ".env.local" })
import { chromium } from "@playwright/test"

const BASE  = process.env.BASE_URL || "http://localhost:3001"
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
  await page.waitForURL(u => !u.href.includes("/login"), { timeout: 15000 })
  log("✅", "로그인")

  // ① API로 전체 피드백을 createdAt 오름차순 정렬해 기대 seq 계산
  const expected = await page.evaluate(async () => {
    const r = await fetch("/api/feedback")
    const list = await r.json()
    const sorted = [...list].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    const map = {}
    sorted.forEach((f, i) => { map[f.id] = i + 1 })
    return map
  })
  log(Object.keys(expected).length > 0 ? "✅" : "❌", "① 피드백 전체 조회", `${Object.keys(expected).length}건`)

  // ② #28(김정문 SPG요청) id로 화면에 표시된 번호 확인
  const id28 = "cmqehc1up000004lb4n66qfml"
  const id39 = "cmqit5d77000104lbyig964w8"
  log(expected[id28] === 28 ? "✅" : "⚠️", "②-a 서버 계산 seq(#28 예상)", `실제=${expected[id28]}`)
  log(expected[id39] === 39 ? "✅" : "⚠️", "②-b 서버 계산 seq(#39 예상)", `실제=${expected[id39]}`)

  // ③ 화면에서 실제 렌더된 배지 확인
  await page.goto(`${BASE}/feedback`)
  await page.waitForSelector('text=피드백 게시판', { timeout: 10000 })
  // 스크롤하며 목표 카드 찾기 (최신순이라 #28·#39는 아래쪽에 있을 수 있음)
  let found28 = false, found39 = false, badge28 = "", badge39 = ""
  for (let i = 0; i < 40 && !(found28 && found39); i++) {
    if (!found28) {
      const card = page.locator(`text=SPG별, 또는 사업부`).first()
      if (await card.isVisible().catch(() => false)) {
        const cardRoot = card.locator("xpath=ancestor::div[contains(@class,'rounded-2xl')][1]")
        badge39 = await cardRoot.locator("span.font-mono").first().innerText().catch(() => "")
        found39 = !!badge39
      }
    }
    const card28 = page.locator(`text=지중, 해저 등 SPG별`).first()
    if (await card28.isVisible().catch(() => false)) {
      const cardRoot = card28.locator("xpath=ancestor::div[contains(@class,'rounded-2xl')][1]")
      badge28 = await cardRoot.locator("span.font-mono").first().innerText().catch(() => "")
      found28 = !!badge28
    }
    if (found28 && found39) break
    await page.mouse.wheel(0, 1500)
    await page.waitForTimeout(150)
  }
  log(badge28 === `#${expected[id28]}` ? "✅" : "❌", "③-a 화면 배지(#28)", `표시="${badge28}" 기대="#${expected[id28]}"`)
  log(badge39 === `#${expected[id39]}` ? "✅" : "❌", "③-b 화면 배지(#39)", `표시="${badge39}" 기대="#${expected[id39]}"`)

} catch (e) {
  log("❌", "예외", String(e))
} finally {
  await browser.close()
  const failed = results.filter(r => r.startsWith("❌")).length
  console.log(`\n${failed === 0 ? "🟢 전체 통과" : `🔴 ${failed}건 실패`}`)
  process.exit(failed === 0 ? 0 : 1)
}
