// 읽기 전용 — 프로덕션에 Meeting.attachments 배포 반영 여부만 확인 (쓰기 없음)
import { config } from "dotenv"
config({ path: ".env.local" })
import { chromium } from "@playwright/test"

const BASE  = "https://quality-dashboard-flax.vercel.app"
const EMAIL = process.env.WITNESS_VERIFY_EMAIL
const PASS  = process.env.WITNESS_VERIFY_PASSWORD

const browser = await chromium.launch({ headless: true })
const page = await (await browser.newContext()).newPage()
try {
  await page.goto(`${BASE}/login`)
  await page.fill('input[type="email"]', EMAIL)
  await page.fill('input[type="password"]', PASS)
  await page.click('button[type="submit"]')
  await page.waitForURL(u => !u.href.includes("/login"), { timeout: 15000 })
  console.log("로그인", page.url())

  const list = await page.evaluate(async () => (await (await fetch("/api/meetings")).json()))
  const withAttachField = typeof list[0]?.attachments !== "undefined"
  console.log(list.length, "건, attachments 필드 존재:", withAttachField)
  if (list[0]) {
    await page.goto(`${BASE}/meetings/${list[0].id}`)
    await page.waitForTimeout(1500)
    const hasSection = await page.locator('text=첨부파일').count()
    console.log("첨부파일 섹션 렌더:", hasSection > 0)
  }
} finally { await browser.close() }
