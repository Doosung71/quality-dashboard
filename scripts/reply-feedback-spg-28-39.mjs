// 읽기+쓰기 — #28 입찰 SPG·권역·작성자 필터 + #39 클레임 SPG 완료 답글 게시
import { config } from "dotenv"
config({ path: ".env.local" })
import { chromium } from "@playwright/test"

const BASE  = process.env.BASE_URL || "https://quality-dashboard-flax.vercel.app"
const EMAIL = process.env.WITNESS_VERIFY_EMAIL
const PASS  = process.env.WITNESS_VERIFY_PASSWORD
if (!EMAIL || !PASS) { console.error("EMAIL/PASSWORD 필요"); process.exit(1) }

const replies = [
  {
    feedbackId: "cmqehc1up000004lb4n66qfml", // 김정문 #28 입찰 SPG·권역·작성자 필터
    content: "입찰 프로젝트 SPG·시장 권역·작성자 필터 요청 반영했습니다. 입찰 등록 시 SPG(제품군)·시장 권역을 입력하실 수 있고, 목록에서 SPG·권역·작성자 기준으로 필터링하실 수 있습니다. 저희 내부 SPG 분류가 아직 고정되어 있지 않아 우선 자유롭게 입력하시도록 했고, 데이터가 쌓이면 고정 목록으로 정리할 예정입니다. 검색창에 SPG나 권역 값을 입력해서 찾으실 수도 있습니다. 사용해 보시고 불편한 점 있으면 말씀해 주세요. 감사합니다!",
  },
  {
    feedbackId: "cmqit5d77000104lbyig964w8", // 이동수 #39 클레임 SPG 구분
    content: "고객클레임 SPG 구분 요청 반영했습니다. 클레임 등록 시 SPG를 입력하실 수 있고, 클레임 진행 보드에서 SPG 기준으로 필터링하실 수 있습니다. 검색창에 SPG 값을 입력해도 찾아집니다. SPG 분류 기준은 아직 고정 목록이 없어 자유 입력으로 시작했고, 데이터가 쌓이면 정리해서 고정 목록으로 만들 예정입니다. 확인해 보시고 다른 의견 있으면 말씀해 주세요. 감사합니다!",
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
