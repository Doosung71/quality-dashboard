// 검증 — #35 QPA 체크리스트 "임시저장" 재확인 (윤경준: 결과 입력 시 임시저장 기능 요청)
// 가설: 항목별 onBlur 자동저장(PATCH /items/[itemNo])이 이미 동작 → 실제로 저장 안 되는지 재현 확인
// 자격증명은 gitignore된 .env.local (WITNESS_VERIFY_*), DATABASE_URL은 정리용
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
const vendorName = `클로이검증_삭제예정_QPA_${stamp}`
let auditId = null

const browser = await chromium.launch({ headless: true })
const page = await (await browser.newContext()).newPage()

const patchResponses = []
page.on("response", res => {
  if (res.url().includes("/items/") && res.request().method() === "PATCH") {
    patchResponses.push({ url: res.url(), status: res.status() })
  }
})

try {
  await page.goto(`${BASE}/login`)
  await page.fill('input[type="email"]', EMAIL)
  await page.fill('input[type="password"]', PASS)
  await page.click('button[type="submit"]')
  await page.waitForURL(u => !u.href.includes("/login"), { timeout: 15000 })
  log("✅", "로그인", page.url())

  // ① 테스트용 QPA 감사 생성
  const create = await page.evaluate(async (vName) => {
    const r = await fetch("/api/qpa-audits", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vendorId: "verify-temp-vendor",
        vendorName: vName,
        auditDate: new Date().toISOString().slice(0, 10),
        location: "검증용", partName: "검증용",
      }),
    })
    return { status: r.status, body: await r.json() }
  }, vendorName)
  auditId = create.body?.id ?? null
  log(create.status === 201 && auditId ? "✅" : "❌", "① 테스트 QPA 감사 생성", `status ${create.status}`)

  // ② 상세 페이지 → 체크리스트 탭 이동
  await page.goto(`${BASE}/vendors/qpa/${auditId}`)
  await page.locator('button:has-text("체크리스트")').click()
  await page.locator("table").first().waitFor({ state: "visible", timeout: 10000 })
  log("✅", "② 체크리스트 탭 로드")

  // 헬퍼: PATCH 응답 도착까지 최대 8초 폴링(Next dev 첫 컴파일 지연 대비)
  async function waitForPatch(sinceIdx, timeoutMs = 8000) {
    const start = Date.now()
    while (Date.now() - start < timeoutMs) {
      if (patchResponses.length > sinceIdx) return patchResponses.slice(sinceIdx)
      await page.waitForTimeout(200)
    }
    return patchResponses.slice(sinceIdx)
  }

  // ③ 첫 항목 점수 입력 + blur → 자동저장 트리거
  const scoreInput = page.locator('table input[type="number"]').first()
  const commentInput = page.locator('table input[placeholder="의견 입력"]').first()
  const idx3 = patchResponses.length
  await scoreInput.fill("3")
  await commentInput.fill(`검증코멘트_${stamp}`)
  await commentInput.blur()
  const patched3 = await waitForPatch(idx3)
  const failedPatches = patched3.filter(r => r.status >= 400)
  log(patched3.length >= 1 ? "✅" : "❌", "③ blur 시 PATCH 요청 발생", `${patched3.length}건, 실패 ${failedPatches.length}건`)

  // ④ 새로고침(서버에서 재조회) 후 값 유지 확인 — "임시저장"의 핵심 질문
  await page.reload()
  await page.locator('button:has-text("체크리스트")').click()
  await page.locator("table").first().waitFor({ state: "visible", timeout: 10000 })
  const scoreAfterReload   = await page.locator('table input[type="number"]').first().inputValue()
  const commentAfterReload = await page.locator('table input[placeholder="의견 입력"]').first().inputValue()
  log(scoreAfterReload === "3" ? "✅" : "❌", "④-a 새로고침 후 점수 유지", `"${scoreAfterReload}" (기대 "3")`)
  log(commentAfterReload === `검증코멘트_${stamp}` ? "✅" : "❌", "④-b 새로고침 후 의견 유지", `"${commentAfterReload}"`)

  // ⑤ DB 직접 조회로 재확인 (UI 캐시가 아닌 실제 영속화 확인)
  const dbRow = await sql`
    SELECT score, comment FROM "QpaAuditItem"
    WHERE "auditId" = ${auditId} ORDER BY "itemNo" ASC LIMIT 1
  `
  log(dbRow[0]?.score === 3 ? "✅" : "❌", "⑤ DB 직접조회 점수 일치", JSON.stringify(dbRow[0]))

  // ⑥ 타이핑만 하고 명시적 blur 없이 즉시 다른 탭 클릭(요약) — 실사용 패턴 재현.
  //    새로고침+DB 직접조회로 진짜 저장 여부를 판정(네트워크 리스너는 보조지표로만 사용)
  const scoreInput2 = page.locator('table input[type="number"]').nth(1)
  const idx6 = patchResponses.length
  await scoreInput2.fill("5")
  await page.locator('button:has-text("요약")').click()
  const patched6 = await waitForPatch(idx6)

  await page.reload()
  await page.locator('button:has-text("체크리스트")').click()
  await page.locator("table").first().waitFor({ state: "visible", timeout: 10000 })
  const score2AfterReload = await page.locator('table input[type="number"]').nth(1).inputValue()
  const dbRow2 = await sql`
    SELECT score FROM "QpaAuditItem"
    WHERE "auditId" = ${auditId} ORDER BY "itemNo" ASC OFFSET 1 LIMIT 1
  `
  log(patched6.length >= 1 ? "✅" : "⚠️", "⑥-a 탭 전환 클릭이 blur 유발(네트워크 관측)", `PATCH ${patched6.length}건`)
  log(score2AfterReload === "5" && dbRow2[0]?.score === 5 ? "✅" : "❌", "⑥-b 탭 전환만으로 실제 DB 저장됨(핵심 판정)", `UI="${score2AfterReload}" DB=${dbRow2[0]?.score}`)

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
