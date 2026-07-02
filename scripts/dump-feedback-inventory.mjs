// 읽기 전용 — 피드백 전체 인벤토리 덤프 (생성일 오름차순 #번호 매기기)
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

  const posts = await page.evaluate(async () => (await (await fetch("/api/feedback")).json()))
  const list = Array.isArray(posts) ? posts : posts.posts ?? posts.feedback ?? []
  const sorted = [...list].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))

  console.log(`총 ${sorted.length}건`)
  sorted.forEach((p, i) => {
    const author = p.authorName ?? p.author?.name ?? p.userName ?? "?"
    const content = (p.content ?? p.body ?? "").replace(/\s+/g, " ")
    const replies = p.replies ?? []
    console.log(`\n=== #${i + 1} id=${p.id} 저자=${author} 답글=${replies.length} ===`)
    console.log(content)
    replies.forEach((r, j) => {
      const rAuthor = r.authorName ?? r.author?.name ?? r.userName ?? "?"
      const rContent = (r.content ?? r.body ?? "").replace(/\s+/g, " ")
      console.log(`  [답글${j + 1}] ${rAuthor}: ${rContent}`)
    })
  })
} finally {
  await browser.close()
}
