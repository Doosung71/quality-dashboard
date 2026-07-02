// 읽기+쓰기 — #56 회의록 첨부 완료 답글 + #42 QPA NA기준 설명 답글 게시
import { config } from "dotenv"
config({ path: ".env.local" })
import { chromium } from "@playwright/test"

const BASE  = process.env.BASE_URL || "https://quality-dashboard-flax.vercel.app"
const EMAIL = process.env.WITNESS_VERIFY_EMAIL
const PASS  = process.env.WITNESS_VERIFY_PASSWORD
if (!EMAIL || !PASS) { console.error("EMAIL/PASSWORD 필요"); process.exit(1) }

const replies = [
  {
    feedbackId: "cmquje2wg000104l2g8uecrz1", // 백승환 #56 회의록 파일첨부
    content: "말씀하신 회의록 파일첨부 기능, 오늘 정식 반영했습니다. 회의록 상세 페이지에 첨부파일 섹션이 추가되어, 다른 화면(NCR·클레임·검사 등)과 동일하게 드래그 앤 드랍으로 파일을 첨부하실 수 있습니다(PDF·이미지·Word·Excel·ZIP, 최대 20MB, 5개까지). 소중한 의견 감사합니다!",
  },
  {
    feedbackId: "cmqko0mf8000005l3o7onzt79", // 안진철 #42 QPA NA 만점기준
    content: "문의하신 QPA NA 처리 시 만점 기준 관련해서 코드를 다시 확인해봤습니다. 이미 시스템이 자동으로 처리하고 있었습니다 — 특정 항목을 NA로 체크하면 그 항목의 배점이 총점 계산(분모)에서 자동으로 제외되어, 만점 기준이 함께 재조정됩니다. 즉 NA 처리한 항목은 최종 점수·퍼센트 계산에 영향을 주지 않으니 헷갈리지 않으셔도 됩니다. 안내가 부족했던 점 죄송하고, 그래도 이상하게 보이는 부분 있으면 다시 말씀해 주세요. 감사합니다!",
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
