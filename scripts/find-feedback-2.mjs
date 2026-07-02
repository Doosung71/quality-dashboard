// 읽기 전용 — #2 시험/분석 관리 검색 피드백 원문 조회 (feedbackId 확보용)
import { config } from "dotenv"
config({ path: ".env.local" })
import { chromium } from "@playwright/test"

const BASE  = process.env.BASE_URL || "https://quality-dashboard-flax.vercel.app"
const EMAIL = process.env.WITNESS_VERIFY_EMAIL
const PASS  = process.env.WITNESS_VERIFY_PASSWORD
if (!EMAIL || !PASS) { console.error("EMAIL/PASSWORD 필요"); process.exit(1) }

const browser = await chromium.launch({ headless: true })
const page = await (await browser.newContext()).newPage()

try {
  await page.goto(`${BASE}/login`)
  await page.fill('input[type="email"]', EMAIL)
  await page.fill('input[type="password"]', PASS)
  await page.click('button[type="submit"]')
  await page.waitForURL(u => !u.href.includes("/login"), { timeout: 15000 })
  console.log("✅ 로그인", page.url())

  const posts = await page.evaluate(async () => (await (await fetch("/api/feedback")).json()))
  const list = Array.isArray(posts) ? posts : posts.posts ?? posts.feedback ?? []
  const hits = list.filter(p => {
    const t = `${p.content ?? p.body ?? ""} ${p.title ?? ""}`
    return t.includes("시험") && (t.includes("검색") || t.includes("분석"))
  })
  console.log(`총 ${list.length}건 중 후보 ${hits.length}건`)
  for (const h of hits) {
    console.log("----")
    console.log("id:", h.id)
    console.log("author:", h.authorName ?? h.author?.name ?? h.userName)
    console.log("content:", (h.content ?? h.body ?? "").slice(0, 200))
    console.log("replies:", (h.replies ?? []).length)
  }
} finally {
  await browser.close()
}
