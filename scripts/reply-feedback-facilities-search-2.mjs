// 읽기+쓰기 — 시험/분석 관리 검색(#2) 완료 답글 게시
import { config } from "dotenv"
config({ path: ".env.local" })
import { chromium } from "@playwright/test"

const BASE  = process.env.BASE_URL || "https://quality-dashboard-flax.vercel.app"
const EMAIL = process.env.WITNESS_VERIFY_EMAIL
const PASS  = process.env.WITNESS_VERIFY_PASSWORD
if (!EMAIL || !PASS) { console.error("EMAIL/PASSWORD 필요"); process.exit(1) }

const feedbackId = "cmr0eud2k000104ib9nni9fn8"
const content = "말씀하신 시험/분석 관리 검색 기능, 오늘 정식 반영했습니다. 화면 상단에 검색창을 추가해 프로젝트명·시료 설명으로 바로 필터링할 수 있고, 기존 상태 필터(전체/시험중/준비중 등)와 함께 조합해서 쓸 수 있습니다. 소중한 의견 감사합니다!"

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
