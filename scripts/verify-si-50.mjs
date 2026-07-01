// 검증 — E2E-1 #50 출장검사 서버 수량검증 (fail-closed)
// 인증 세션으로 API 직접 호출: 잘못된 수량 400, 정상 201, PUT 병합검증 400, 정리 삭제
// 자격증명은 gitignore된 .env.local (WITNESS_VERIFY_*)
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
let testId = null

try {
  await page.goto(`${BASE}/login`)
  await page.fill('input[type="email"]', EMAIL)
  await page.fill('input[type="password"]', PASS)
  await page.click('button[type="submit"]')
  await page.waitForURL(u => !u.href.includes("/login"), { timeout: 15000 })
  log("✅", "로그인", page.url())

  // 협력사 1곳 확보 (vendorId 필요)
  const vendorId = await page.evaluate(async () => {
    const r = await fetch("/api/vendors")
    const j = await r.json()
    const arr = Array.isArray(j) ? j : (j.vendors ?? j.items ?? [])
    return arr[0]?.id ?? null
  })
  log(vendorId ? "✅" : "❌", "협력사 확보", `vendorId ${vendorId}`)

  const base = {
    vendorId, vendorName: "검증용", inspectionDate: "2026-07-01",
    itemName: "클로이검증_삭제예정_50", inspector: "클로이",
  }
  const post = (body) => page.evaluate(async (b) => {
    const r = await fetch("/api/source-inspections", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b),
    })
    return { status: r.status, body: await r.json() }
  }, body)

  // ① 잘못된 수량(샘플>납품, 불량>샘플) → 400
  const bad = await post({ ...base, quantity: 10, sampleSize: 100, defectCount: 1000 })
  log(bad.status === 400 ? "✅" : "❌", "① 서버가 잘못된 수량 거부(400)", `status ${bad.status} · ${bad.body?.error ?? ""}`)

  // ② 정상 수량 → 201 (클라이언트가 조작된 defectRate:999 전송)
  const good = await post({ ...base, quantity: 100, sampleSize: 10, defectCount: 1, defectRate: 999 })
  testId = good.body?.id
  log(good.status === 201 && testId ? "✅" : "❌", "② 정상 수량 등록(201)", `status ${good.status}`)

  // ②-b 불량률 서버 재계산 확인 — 999 무시하고 (1/10)*100=10 저장돼야 함
  if (testId) {
    const rec = await page.evaluate(async (id) => (await (await fetch(`/api/source-inspections/${id}`)).json()), testId)
    log(rec?.defectRate === 10 ? "✅" : "❌", "②-b 불량률 서버 재계산", `defectRate=${rec?.defectRate} (기대 10, 클라 999 무시)`)
  }

  // ③ PUT 부분수정 — 불량만 기존 샘플(10) 초과(50) → 400 (병합검증)
  if (testId) {
    const put = await page.evaluate(async (id) => {
      const r = await fetch(`/api/source-inspections/${id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ defectCount: 50 }),
      })
      return { status: r.status, body: await r.json() }
    }, testId)
    log(put.status === 400 ? "✅" : "❌", "③ PUT 병합검증 거부(400)", `status ${put.status} · ${put.body?.error ?? ""}`)
  }
} catch (e) {
  log("❌", "예외", String(e))
} finally {
  if (testId) {
    const del = await page.evaluate(async (id) => (await fetch(`/api/source-inspections/${id}`, { method: "DELETE" })).status, testId).catch(() => "err")
    log(del === 200 ? "✅" : "⚠️", "정리: 테스트검사 삭제", `DELETE ${del}`)
  }
  await browser.close()
  const failed = results.filter(r => r.startsWith("❌")).length
  console.log(`\n${failed === 0 ? "🟢 전체 통과" : `🔴 ${failed}건 실패`}`)
  process.exit(failed === 0 ? 0 : 1)
}
