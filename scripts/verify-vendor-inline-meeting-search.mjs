// 검증 — 출장/수입검사 협력업체 인라인등록(sentinel→모달) + 회의록 본문검색
// 자격증명은 gitignore된 .env.local (WITNESS_VERIFY_*)
// 생성한 테스트 데이터는 종료 시 정리(vendor는 API에 DELETE가 없어 prisma 직접 삭제)
import { config } from "dotenv"
config({ path: ".env.local" })
import { chromium } from "@playwright/test"
import { neon } from "@neondatabase/serverless"

const BASE  = process.env.BASE_URL || "http://localhost:3001"
const EMAIL = process.env.WITNESS_VERIFY_EMAIL
const PASS  = process.env.WITNESS_VERIFY_PASSWORD
if (!EMAIL || !PASS) { console.error("❌ WITNESS_VERIFY_EMAIL/PASSWORD 필요"); process.exit(1) }
if (!process.env.DATABASE_URL) { console.error("❌ DATABASE_URL 필요 (vendor 정리용)"); process.exit(1) }

const sql = neon(process.env.DATABASE_URL)
const results = []
const log = (i, l, d = "") => { const s = `${i} ${l}${d ? " → " + d : ""}`; console.log(s); results.push(s) }

const stamp = Date.now()
const vendorNameSource   = `클로이검증_삭제예정_인라인_출장_${stamp}`
const vendorNameIncoming = `클로이검증_삭제예정_인라인_수입_${stamp}`
const vendorLocation     = "테스트소재지_경기도"

const createdVendorIds = []
let createdMeetingId = null

const browser = await chromium.launch({ headless: true })
const page = await (await browser.newContext()).newPage()

try {
  await page.goto(`${BASE}/login`)
  await page.fill('input[type="email"]', EMAIL)
  await page.fill('input[type="password"]', PASS)
  await page.click('button[type="submit"]')
  await page.waitForURL(u => !u.href.includes("/login"), { timeout: 15000 })
  log("✅", "로그인", page.url())

  // ① 출장검사 — sentinel → 모달 → 등록 → 자동선택 + 검사장소 자동채움
  await page.goto(`${BASE}/vendors/inspections/new`)
  await page.locator("form select").first().selectOption("__new__")
  const modalVisible1 = await page.locator('h2:has-text("신규업체 등록")').isVisible().catch(() => false)
  log(modalVisible1 ? "✅" : "❌", "① 출장검사 sentinel → 모달 오픈")

  // 빈 이름 제출 → 클라이언트 검증 차단
  await page.locator('button:has-text("업체 등록")').click()
  const emptyBlocked = await page.locator("text=업체명은 필수입니다").isVisible().catch(() => false)
  log(emptyBlocked ? "✅" : "❌", "①-b 빈 업체명 제출 차단")

  await page.fill('input[placeholder*="한국케이블"]', vendorNameSource)
  await page.fill('input[placeholder*="안산시"]', vendorLocation)
  await page.locator('button:has-text("업체 등록")').click()
  const modalClosed1 = await page.locator('h2:has-text("신규업체 등록")').waitFor({ state: "hidden", timeout: 8000 }).then(() => true).catch(() => false)
  log(modalClosed1 ? "✅" : "❌", "①-c 등록 성공 → 모달 닫힘")

  const selectedLabel1 = await page.locator("form select").first().evaluate(el => el.selectedOptions[0]?.textContent ?? "")
  log(selectedLabel1.includes(vendorNameSource) ? "✅" : "❌", "①-d 신규업체 드롭다운 자동선택", selectedLabel1)

  const locationVal = await page.locator('input[placeholder*="울산"]').inputValue().catch(() => "")
  log(locationVal === vendorLocation ? "✅" : "❌", "①-e 검사장소 자동채움", `"${locationVal}" (기대 "${vendorLocation}")`)

  const v1rows = await sql`SELECT id FROM "Vendor" WHERE name = ${vendorNameSource} LIMIT 1`
  if (v1rows[0]) createdVendorIds.push(v1rows[0].id)
  log(v1rows[0] ? "✅" : "❌", "①-f DB에 협력업체 생성 확인")

  // ② 수입검사 — sentinel → 모달 → 등록 → 자동선택 (위치 자동채움 없음, 필드 자체가 없음)
  await page.goto(`${BASE}/vendors/incoming/new`)
  const selects2 = page.locator("form select")
  await selects2.first().selectOption("__new__")
  const modalVisible2 = await page.locator('h2:has-text("신규업체 등록")').isVisible().catch(() => false)
  log(modalVisible2 ? "✅" : "❌", "② 수입검사 sentinel → 모달 오픈")

  await page.fill('input[placeholder*="한국케이블"]', vendorNameIncoming)
  await page.locator('button:has-text("업체 등록")').click()
  const modalClosed2 = await page.locator('h2:has-text("신규업체 등록")').waitFor({ state: "hidden", timeout: 8000 }).then(() => true).catch(() => false)
  log(modalClosed2 ? "✅" : "❌", "②-b 등록 성공 → 모달 닫힘")

  const selectedLabel2 = await page.locator("form select").first().evaluate(el => el.selectedOptions[0]?.textContent ?? "")
  log(selectedLabel2.includes(vendorNameIncoming) ? "✅" : "❌", "②-c 신규업체 드롭다운 자동선택", selectedLabel2)

  const v2rows = await sql`SELECT id FROM "Vendor" WHERE name = ${vendorNameIncoming} LIMIT 1`
  if (v2rows[0]) createdVendorIds.push(v2rows[0].id)
  log(v2rows[0] ? "✅" : "❌", "②-d DB에 협력업체 생성 확인")

  // ③ 중복 업체명 → 409 에러, 폼 상태 유지(모달 안 닫힘)
  await page.goto(`${BASE}/vendors/incoming/new`)
  const selects3 = page.locator("form select")
  await selects3.first().selectOption("__new__")
  await page.fill('input[placeholder*="한국케이블"]', vendorNameIncoming)
  await page.locator('button:has-text("업체 등록")').click()
  const dupError = await page.locator("text=이미 등록된 업체명입니다").waitFor({ state: "visible", timeout: 8000 }).then(() => true).catch(() => false)
  const modalStillOpen = await page.locator('h2:has-text("신규업체 등록")').isVisible().catch(() => false)
  log(dupError && modalStillOpen ? "✅" : "❌", "③ 중복 업체명 등록 시도 → 409 에러 + 모달 유지")

  // ④ 회의록 본문 검색 — 제목엔 없고 본문에만 있는 키워드로 검색
  const uniqueKeyword = `클로이검증키워드${stamp}`
  const meetingCreate = await page.evaluate(async (kw) => {
    const r = await fetch("/api/meetings", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "클로이검증_삭제예정_회의록검색",
        type: "OTHER",
        meetingDate: new Date().toISOString().slice(0, 10),
        body: `본문 내용 중간에 ${kw} 라는 단어가 포함되어 있습니다.`,
      }),
    })
    return { status: r.status, body: await r.json() }
  }, uniqueKeyword)
  createdMeetingId = meetingCreate.body?.id ?? null
  log(meetingCreate.status === 201 && createdMeetingId ? "✅" : "❌", "④ 검증용 회의록 생성", `status ${meetingCreate.status}`)

  await page.goto(`${BASE}/meetings`)
  await page.locator("input[placeholder*=\"회의명\"]").waitFor({ state: "visible", timeout: 10000 })
  await page.fill('input[placeholder*="회의명"]', uniqueKeyword)
  const foundByBody = await page.locator(`text=클로이검증_삭제예정_회의록검색`).waitFor({ state: "visible", timeout: 5000 }).then(() => true).catch(() => false)
  log(foundByBody ? "✅" : "❌", "④-b 본문 키워드로 검색 시 노출됨")

  await page.fill('input[placeholder*="회의명"]', "존재하지않는키워드_zzz_999")
  await page.waitForTimeout(500)
  const notFoundIrrelevant = !(await page.locator(`text=클로이검증_삭제예정_회의록검색`).isVisible().catch(() => false))
  log(notFoundIrrelevant ? "✅" : "❌", "④-c 무관한 키워드로는 노출 안 됨")

} catch (e) {
  log("❌", "예외", String(e))
} finally {
  for (const id of createdVendorIds) {
    await sql`DELETE FROM "Vendor" WHERE id = ${id}`.then(() => log("✅", "정리: 테스트 협력업체 삭제", id)).catch(e => log("⚠️", "정리 실패(협력업체)", String(e)))
  }
  if (createdMeetingId) {
    const del = await page.evaluate(async (id) => (await fetch(`/api/meetings/${id}`, { method: "DELETE" })).status, createdMeetingId).catch(() => "err")
    log(del === 200 ? "✅" : "⚠️", "정리: 테스트 회의록 삭제", `DELETE ${del}`)
  }
  await browser.close()
  const failed = results.filter(r => r.startsWith("❌")).length
  console.log(`\n${failed === 0 ? "🟢 전체 통과" : `🔴 ${failed}건 실패`}`)
  process.exit(failed === 0 ? 0 : 1)
}
