// 읽기+쓰기 — 파일 첨부 드래그앤드랍(#37) 완료 답글 게시
import { config } from "dotenv"
config({ path: ".env.local" })
import { chromium } from "@playwright/test"

const BASE  = process.env.BASE_URL || "https://quality-dashboard-flax.vercel.app"
const EMAIL = process.env.WITNESS_VERIFY_EMAIL
const PASS  = process.env.WITNESS_VERIFY_PASSWORD
if (!EMAIL || !PASS) { console.error("EMAIL/PASSWORD 필요"); process.exit(1) }

const feedbackId = "cmqehcqpa000104lb5tt4lfag"
const content = "말씀하신 파일 업로드 드래그 앤 드랍 기능, 오늘 정식 반영했습니다. 여러 파일 동시 선택은 이미 가능했었고, 이번에 파일 첨부 영역에 마우스로 파일을 끌어다 놓아도 바로 업로드되도록 추가했습니다(NCR·클레임·입회검사·자산관리 등 첨부파일이 있는 화면 전체 적용). 확인이 늦어져 죄송합니다. 소중한 의견 감사합니다!"

const browser = await chromium.launch({ headless: true })
const page = await (await browser.newContext()).newPage()

try {
  await page.goto(`${BASE}/login`)
  await page.fill('input[type="email"]', EMAIL)
  await page.fill('input[type="password"]', PASS)
  await page.click('button[type="submit"]')
  await page.waitForURL(u => !u.href.includes("/login"), { timeout: 15000 })
  console.log("✅ 로그인", page.url())

  const res = await page.evaluate(async ({ feedbackId, content }) => {
    const resp = await fetch(`/api/feedback/${feedbackId}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    })
    return { status: resp.status, body: await resp.json() }
  }, { feedbackId, content })
  console.log(res.status === 200 || res.status === 201 ? "✅" : "❌", feedbackId, `status ${res.status}`, res.body?.id ?? res.body?.error ?? "")
} finally {
  await browser.close()
}
