// 읽기+쓰기 — 노정현(협력업체 인라인등록)·김원호(회의록 본문검색) 피드백에 완료 답글 게시
import { config } from "dotenv"
config({ path: ".env.local" })
import { chromium } from "@playwright/test"

const BASE  = process.env.BASE_URL || "https://quality-dashboard-flax.vercel.app"
const EMAIL = process.env.WITNESS_VERIFY_EMAIL
const PASS  = process.env.WITNESS_VERIFY_PASSWORD
if (!EMAIL || !PASS) { console.error("❌ WITNESS_VERIFY_EMAIL/PASSWORD 필요"); process.exit(1) }

const replies = [
  {
    feedbackId: "cmr1tblvx000104l1aelr2pzx",
    content: "말씀하신 대로 공급망품질관리 > 출장검사/수입검사 등록 화면에서도 협력업체 드롭다운에 \"+ 신규업체 등록...\"이 추가되어, 목록에 없는 업체를 그 자리에서 바로 등록하고 이어서 검사 결과를 등록하실 수 있습니다(QPA 공정감사와 동일한 방식). 오늘 정식 배포했습니다. 소중한 의견 감사합니다!",
  },
  {
    feedbackId: "cmr1ucp19000104jpugd2bolr",
    content: "말씀하신 대로 품질이상/사후관리 > 회의록 목록의 검색창이 회의명뿐 아니라 회의록 본문 내용도 함께 검색하도록 개선되었습니다. 특정 단어를 입력하시면 그 단어가 본문에 포함된 회의록도 함께 조회됩니다. 오늘 정식 배포했습니다. 소중한 의견 감사합니다!",
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

  for (const r of replies) {
    const res = await page.evaluate(async ({ feedbackId, content }) => {
      const resp = await fetch(`/api/feedback/${feedbackId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      })
      return { status: resp.status, body: await resp.json() }
    }, r)
    console.log(res.status === 200 || res.status === 201 ? "✅" : "❌", r.feedbackId, `status ${res.status}`, res.body?.id ?? res.body?.error ?? "")
  }
} finally {
  await browser.close()
}
