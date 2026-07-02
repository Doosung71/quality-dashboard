// 읽기+쓰기 — #35 QPA 임시저장 재확인 + 저장표시 UX 완료 답글 게시
import { config } from "dotenv"
config({ path: ".env.local" })
import { chromium } from "@playwright/test"

const BASE  = process.env.BASE_URL || "https://quality-dashboard-flax.vercel.app"
const EMAIL = process.env.WITNESS_VERIFY_EMAIL
const PASS  = process.env.WITNESS_VERIFY_PASSWORD
if (!EMAIL || !PASS) { console.error("EMAIL/PASSWORD 필요"); process.exit(1) }

const replies = [
  {
    feedbackId: "cmqex3wof000205l5zyr1hhii", // 윤경준 #35 QPA 임시저장
    content: "공정감사(QPA) 임시저장 관련 문의 확인해봤습니다. 사실 체크리스트는 점수·의견·근거 등 항목을 입력하고 다른 칸으로 이동하실 때마다 이미 자동으로 저장되고 있었습니다 — 페이지를 나갔다가 다시 들어오셔도 값이 그대로 유지됩니다. 다만 저장됐는지 눈으로 확인할 방법이 없어 불안하셨을 것 같아, 오늘 입력칸 옆에 저장 성공 시 초록 체크 표시, 실패 시 빨간 테두리로 바로 알려드리도록 개선했습니다. 사용해 보시고 여전히 불편한 부분 있으면 말씀해 주세요. 감사합니다!",
  },
]

const browser = await chromium.launch({ headless: true })
const page = await (await browser.newContext()).newPage()

try {
  await page.goto(`${BASE}/login`)
  await page.fill('input[type="email"]', EMAIL)
  await page.fill('input[type="password"]', PASS)
  await page.click('button[type="submit"]')
  await page.waitForURL(u => !u.href.includes("/login"), { timeout: 15000 })
  console.log("✅ 로그인", page.url())

  for (const { feedbackId, content } of replies) {
    const res = await page.evaluate(async ({ feedbackId, content }) => {
      const resp = await fetch(`/api/feedback/${feedbackId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      })
      return { status: resp.status, body: await resp.json() }
    }, { feedbackId, content })
    console.log(res.status === 200 || res.status === 201 ? "✅" : "❌", feedbackId, `status ${res.status}`, res.body?.id ?? res.body?.error ?? "")
  }
} finally {
  await browser.close()
}
