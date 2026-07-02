// 검증 — #35 후속: QPA 체크리스트 저장 성공/실패 시각 피드백(체크 아이콘 / 빨간 테두리)
import { config } from "dotenv"
config({ path: ".env.local" })
import { chromium } from "@playwright/test"
import { neon } from "@neondatabase/serverless"

const BASE  = process.env.BASE_URL || "http://localhost:3001"
const EMAIL = process.env.WITNESS_VERIFY_EMAIL
const PASS  = process.env.WITNESS_VERIFY_PASSWORD
if (!EMAIL || !PASS) { console.error("❌ WITNESS_VERIFY_EMAIL/PASSWORD 필요"); process.exit(1) }
if (!process.env.DATABASE_URL) { console.error("❌ DATABASE_URL 필요 (정리용)"); process.exit(1) }

const sql = neon(process.env.DATABASE_URL)
const results = []
const log = (i, l, d = "") => { const s = `${i} ${l}${d ? " → " + d : ""}`; console.log(s); results.push(s) }

const stamp = Date.now()
const vendorName = `클로이검증_삭제예정_QPA인디케이터_${stamp}`
let auditId = null

const browser = await chromium.launch({ headless: true })
const page = await (await browser.newContext()).newPage()

try {
  await page.goto(`${BASE}/login`)
  await page.fill('input[type="email"]', EMAIL)
  await page.fill('input[type="password"]', PASS)
  await page.click('button[type="submit"]')
  await page.waitForURL(u => !u.href.includes("/login"), { timeout: 15000 })
  log("✅", "로그인")

  const create = await page.evaluate(async (vName) => {
    const r = await fetch("/api/qpa-audits", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vendorId: "verify-temp-vendor", vendorName: vName,
        auditDate: new Date().toISOString().slice(0, 10),
        location: "검증용", partName: "검증용",
      }),
    })
    return { status: r.status, body: await r.json() }
  }, vendorName)
  auditId = create.body?.id ?? null
  log(create.status === 201 && auditId ? "✅" : "❌", "① 테스트 QPA 감사 생성", `status ${create.status}`)

  await page.goto(`${BASE}/vendors/qpa/${auditId}`)
  await page.locator('button:has-text("체크리스트")').click()
  await page.locator("table").first().waitFor({ state: "visible", timeout: 10000 })

  // ② 정상 저장 → 체크 아이콘 표시 → 2초 후 사라짐
  const commentInput = page.locator('table input[placeholder="의견 입력"]').first()
  const commentWrapper = commentInput.locator("..")
  await commentInput.fill(`검증코멘트_${stamp}`)
  await commentInput.blur()
  const successIconAppeared = await commentWrapper.locator("svg.lucide-circle-check").waitFor({ state: "visible", timeout: 8000 }).then(() => true).catch(() => false)
  log(successIconAppeared ? "✅" : "❌", "② 저장 성공 시 체크 아이콘 표시")

  const iconFaded = await commentWrapper.locator("svg.lucide-circle-check").waitFor({ state: "hidden", timeout: 4000 }).then(() => true).catch(() => false)
  log(iconFaded ? "✅" : "❌", "②-b 체크 아이콘 2초 내 사라짐")

  // ③ 저장 실패 시뮬레이션(PATCH를 500으로 가로채기) → 빨간 테두리 + 경고 아이콘
  await page.route(`**/api/qpa-audits/${auditId}/items/*`, route => route.fulfill({ status: 500, body: "{}" }))
  const evidenceInput = page.locator('table input[placeholder="근거"]').first()
  const evidenceWrapper = evidenceInput.locator("..")
  await evidenceInput.fill(`검증근거실패_${stamp}`)
  await evidenceInput.blur()
  const errorIconAppeared = await evidenceWrapper.locator("svg.lucide-circle-alert, svg.lucide-alert-circle").waitFor({ state: "visible", timeout: 5000 }).then(() => true).catch(() => false)
  log(errorIconAppeared ? "✅" : "❌", "③ 저장 실패 시 경고 아이콘 표시")

  const borderClass = await evidenceInput.getAttribute("class")
  log(borderClass?.includes("border-rose-400") ? "✅" : "❌", "③-b 저장 실패 시 빨간 테두리", borderClass)

  await page.unroute(`**/api/qpa-audits/${auditId}/items/*`)

  // ④ 실패했던 값이 DB에는 저장되지 않았는지 확인 (에러 표시가 정직한지)
  const dbCheck = await sql`
    SELECT evidence FROM "QpaAuditItem" WHERE "auditId" = ${auditId} ORDER BY "itemNo" ASC LIMIT 1
  `
  log(dbCheck[0]?.evidence !== `검증근거실패_${stamp}` ? "✅" : "❌", "④ 실패 표시된 값은 실제 DB 미반영", JSON.stringify(dbCheck[0]))

} catch (e) {
  log("❌", "예외", String(e))
} finally {
  if (auditId) {
    await sql`DELETE FROM "QpaAudit" WHERE id = ${auditId}`
      .then(() => log("✅", "정리: 테스트 QPA 감사 삭제(cascade)", auditId))
      .catch(e => log("⚠️", "정리 실패", String(e)))
  }
  await browser.close()
  const failed = results.filter(r => r.startsWith("❌")).length
  console.log(`\n${failed === 0 ? "🟢 전체 통과" : `🔴 ${failed}건 실패`}`)
  process.exit(failed === 0 ? 0 : 1)
}
