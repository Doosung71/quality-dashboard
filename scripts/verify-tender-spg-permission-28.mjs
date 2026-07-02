// 검증 — #28 C항목(코라 검수 반영): 입찰 SPG·시장 권역은 소유자 OR 팀장 이상 편집 가능, title은 소유자 전용 유지
// 임시 계정 3개(소유자 PRACTITIONER, 비소유 TEAM_LEAD, 비소유 PRACTITIONER)는 런타임 랜덤 비밀번호로 생성 후 삭제.
import { config } from "dotenv"
config({ path: ".env.local" })
import { chromium } from "@playwright/test"
import { randomBytes } from "node:crypto"

const BASE  = process.env.BASE_URL || "http://localhost:3001"
const EMAIL = process.env.WITNESS_VERIFY_EMAIL
const PASS  = process.env.WITNESS_VERIFY_PASSWORD
if (!EMAIL || !PASS) { console.error("❌ WITNESS_VERIFY_EMAIL/PASSWORD 필요"); process.exit(1) }

const stamp = Date.now()
const results = []
const log = (i, l, d = "") => { const s = `${i} ${l}${d ? " → " + d : ""}`; console.log(s); results.push(s) }

async function login(page, email, pass) {
  await page.goto(`${BASE}/login`)
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', pass)
  await page.click('button[type="submit"]')
  await page.waitForURL(u => !u.href.includes("/login"), { timeout: 20000 })
}

async function createActiveUser(adminPage, label, role) {
  const email = `chloe-verify-28-${label}-${stamp}@example.com`
  const pass = randomBytes(12).toString("base64url")
  const reg = await adminPage.evaluate(async ({ email, pass, label }) => {
    const r = await fetch("/api/auth/register", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: `클로이검증_삭제예정_28_${label}`, email, password: pass, department: "검증" }),
    })
    return r.status
  }, { email, pass, label })
  if (reg !== 201) throw new Error(`${label} 계정 등록 실패 (status ${reg})`)

  const id = await adminPage.evaluate(async (email) => {
    const r = await fetch("/api/admin/users")
    const users = await r.json()
    return (Array.isArray(users) ? users : users.users ?? []).find(u => u.email === email)?.id ?? null
  }, email)
  if (!id) throw new Error(`${label} 계정 id 조회 실패`)

  const patch = await adminPage.evaluate(async ({ id, role }) => {
    const r = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "ACTIVE", role }),
    })
    return r.status
  }, { id, role })
  if (patch !== 200) throw new Error(`${label} 계정 ACTIVE·${role} 전환 실패 (status ${patch})`)

  return { email, pass, id }
}

const browser = await chromium.launch({ headless: true })
const adminPage = await (await browser.newContext()).newPage()
let ownerUser = null, teamLeadUser = null, otherUser = null, tenderId = null

try {
  await login(adminPage, EMAIL, PASS)
  log("✅", "관리자 로그인")

  ownerUser    = await createActiveUser(adminPage, "owner", "PRACTITIONER")
  teamLeadUser = await createActiveUser(adminPage, "teamlead", "TEAM_LEAD")
  otherUser    = await createActiveUser(adminPage, "other", "PRACTITIONER")
  log("✅", "임시 계정 3개 생성(소유자·팀장·타인)")

  // ① 소유자로 입찰 생성
  const ownerPage = await (await browser.newContext()).newPage()
  await login(ownerPage, ownerUser.email, ownerUser.pass)
  const create = await ownerPage.evaluate(async (title) => {
    const r = await fetch("/api/tenders", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, spg: "원본SPG" }),
    })
    return { status: r.status, body: await r.json() }
  }, `클로이검증_삭제예정_SPG권한_${stamp}`)
  tenderId = create.body?.tenderId ?? null
  log(create.status === 200 && tenderId ? "✅" : "❌", "① 소유자가 입찰 생성", `status ${create.status}`)
  await ownerPage.close()

  // ② 팀장(비소유자) — SPG·권역 수정 허용
  const tlPage = await (await browser.newContext()).newPage()
  await login(tlPage, teamLeadUser.email, teamLeadUser.pass)
  const tlSpgPatch = await tlPage.evaluate(async ({ id }) => {
    const r = await fetch(`/api/tenders/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ spg: "팀장수정SPG", marketRegion: "팀장수정권역" }),
    })
    return r.status
  }, { id: tenderId })
  log(tlSpgPatch === 200 ? "✅" : "❌", "② 팀장(비소유)이 SPG·권역 수정 허용", `status ${tlSpgPatch}`)

  // ③ 팀장(비소유) — title 수정은 여전히 차단(소유자 전용 유지)
  const tlTitlePatch = await tlPage.evaluate(async ({ id }) => {
    const r = await fetch(`/api/tenders/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "팀장이바꾼제목" }),
    })
    return r.status
  }, { id: tenderId })
  log(tlTitlePatch === 403 ? "✅" : "❌", "③ 팀장(비소유)의 title 수정은 403 차단", `status ${tlTitlePatch}`)
  await tlPage.close()

  // ④ 타인(비소유·PRACTITIONER) — SPG 수정도 차단
  const otherPage = await (await browser.newContext()).newPage()
  await login(otherPage, otherUser.email, otherUser.pass)
  const otherSpgPatch = await otherPage.evaluate(async ({ id }) => {
    const r = await fetch(`/api/tenders/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ spg: "타인수정시도" }),
    })
    return r.status
  }, { id: tenderId })
  log(otherSpgPatch === 403 ? "✅" : "❌", "④ 타인(PRACTITIONER, 비소유)의 SPG 수정은 403 차단", `status ${otherSpgPatch}`)
  await otherPage.close()

} catch (e) {
  log("❌", "예외", String(e))
} finally {
  if (tenderId) {
    const del = await adminPage.evaluate(async (id) => (await fetch(`/api/tenders/${id}`, { method: "DELETE" })).status, tenderId).catch(() => "err")
    log(del === 200 ? "✅" : "⚠️", "정리: 테스트 입찰 삭제", `DELETE ${del}`)
  }
  for (const u of [ownerUser, teamLeadUser, otherUser]) {
    if (u?.id) {
      const del = await adminPage.evaluate(async (id) => (await fetch(`/api/admin/users/${id}`, { method: "DELETE" })).status, u.id).catch(() => "err")
      log(del === 200 ? "✅" : "⚠️", `정리: 임시 계정 삭제(${u.email})`, `DELETE ${del}`)
    }
  }
  await browser.close()
  const failed = results.filter(r => r.startsWith("❌")).length
  console.log(`\n${failed === 0 ? "🟢 전체 통과" : `🔴 ${failed}건 실패`}`)
  process.exit(failed === 0 ? 0 : 1)
}
