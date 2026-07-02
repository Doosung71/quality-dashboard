// 검증 — E2E-1 #51 RT-02(a) 관리자 판별 앱 전역 통일 (isAdmin email+role)
// V1~V4: 관리자 골든패스(링크·페이지·API), V5~V8: DIRECTOR 비관리자 차단.
// 관리자 자격증명은 gitignore된 .env.local (WITNESS_VERIFY_*).
// DIRECTOR 검증용 임시 계정은 런타임 랜덤 비밀번호로 생성 후 삭제한다.
import { config } from "dotenv"
config({ path: ".env.local" })
import { chromium } from "@playwright/test"
import { randomBytes } from "node:crypto"

const BASE  = process.env.BASE_URL || "http://localhost:3001"
const EMAIL = process.env.WITNESS_VERIFY_EMAIL
const PASS  = process.env.WITNESS_VERIFY_PASSWORD
if (!EMAIL || !PASS) { console.error("❌ WITNESS_VERIFY_EMAIL/PASSWORD 필요"); process.exit(1) }

const TEMP_EMAIL = `chloe-verify-51-${Date.now()}@example.com`
const TEMP_PASS  = randomBytes(12).toString("base64url")

const results = []
const log = (i, l, d = "") => { const s = `${i} ${l}${d ? " → " + d : ""}`; console.log(s); results.push(s) }

async function login(page, email, pass) {
  await page.goto(`${BASE}/login`)
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', pass)
  await page.click('button[type="submit"]')
  await page.waitForURL(u => !u.href.includes("/login"), { timeout: 20000 })
}

async function closeModals(page) {
  await page.waitForSelector(".fixed.inset-0.z-50", { state: "visible", timeout: 5000 }).catch(() => {})
  for (const btn of [page.getByRole("button", { name: "확인했습니다" }), page.locator('[aria-label="닫기"]').first()]) {
    if (await btn.isVisible().catch(() => false)) { await btn.click().catch(() => {}); break }
  }
  await page.waitForSelector(".fixed.inset-0.z-50", { state: "detached", timeout: 8000 }).catch(() => {})
}

const adminLink = (page) => page.locator('header a[href="/admin/users"]')
const apiStatus = (page, url) => page.evaluate(async (u) => (await fetch(u)).status, url)

const browser = await chromium.launch({ headless: true })
let tempUserId = null
const adminPage = await (await browser.newContext()).newPage()

try {
  // ---------- 관리자 골든패스 ----------
  await login(adminPage, EMAIL, PASS)
  log("✅", "관리자 로그인", adminPage.url())
  await closeModals(adminPage)

  await adminPage.goto(`${BASE}/`)
  await closeModals(adminPage)
  const v1 = await adminLink(adminPage).isVisible().catch(() => false)
  log(v1 ? "✅" : "❌", "V1 관리자 헤더에 사용자 관리 링크 표시")

  await adminPage.goto(`${BASE}/admin/users`)
  const v2 = await adminPage.getByRole("heading", { name: "사용자 관리" }).isVisible({ timeout: 15000 }).catch(() => false)
  log(v2 ? "✅" : "❌", "V2 관리자 /admin/users 접근 가능", adminPage.url())

  const v3a = await apiStatus(adminPage, "/api/admin/activity?period=all")
  const v3b = await apiStatus(adminPage, "/api/presence")
  log(v3a === 200 && v3b === 200 ? "✅" : "❌", "V3 관리자 activity·presence API 200", `activity=${v3a} presence=${v3b}`)

  // ---------- 임시 DIRECTOR 계정 준비 ----------
  const reg = await adminPage.evaluate(async ({ email, pass }) => {
    const r = await fetch("/api/auth/register", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "클로이검증_삭제예정_51", email, password: pass, department: "검증" }),
    })
    return r.status
  }, { email: TEMP_EMAIL, pass: TEMP_PASS })
  log(reg === 201 ? "✅" : "❌", "V4 임시 계정 등록(201)", `status ${reg}`)
  if (reg !== 201) throw new Error("임시 계정 등록 실패 — 이후 스킵")

  const found = await adminPage.evaluate(async (email) => {
    const r = await fetch("/api/admin/users")
    const users = await r.json()
    return (Array.isArray(users) ? users : users.users ?? []).find(u => u.email === email)?.id ?? null
  }, TEMP_EMAIL)
  tempUserId = found
  if (!tempUserId) throw new Error("임시 계정 id 조회 실패")

  const patch = await adminPage.evaluate(async ({ id }) => {
    const r = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "ACTIVE", role: "DIRECTOR" }),
    })
    return r.status
  }, { id: tempUserId })
  log(patch === 200 ? "✅" : "❌", "임시 계정 ACTIVE·DIRECTOR 전환", `status ${patch}`)

  // ---------- DIRECTOR 비관리자 차단 검증 ----------
  const dirPage = await (await browser.newContext()).newPage()
  await login(dirPage, TEMP_EMAIL, TEMP_PASS)
  log("✅", "DIRECTOR 로그인", dirPage.url())
  await closeModals(dirPage)

  await dirPage.goto(`${BASE}/`)
  await closeModals(dirPage)
  await dirPage.waitForSelector("header", { timeout: 15000 })
  const v5 = await adminLink(dirPage).count()
  log(v5 === 0 ? "✅" : "❌", "V5 DIRECTOR 헤더에 사용자 관리 링크 미노출", `count=${v5}`)

  await dirPage.goto(`${BASE}/admin/users`)
  await dirPage.waitForLoadState("networkidle")
  const v6url = new URL(dirPage.url())
  const v6 = v6url.pathname !== "/admin/users"
  log(v6 ? "✅" : "❌", "V6 DIRECTOR /admin/users → redirect", v6url.pathname)

  const v7a = await apiStatus(dirPage, "/api/admin/activity?period=all")
  const v7b = await apiStatus(dirPage, "/api/presence")
  log(v7a === 403 && v7b === 403 ? "✅" : "❌", "V7 DIRECTOR activity·presence API 403", `activity=${v7a} presence=${v7b}`)

  await dirPage.close()
} catch (e) {
  log("❌", "검증 중단", e.message)
} finally {
  // ---------- 정리: 임시 계정 삭제 ----------
  if (tempUserId) {
    const del = await adminPage.evaluate(async (id) =>
      (await fetch(`/api/admin/users/${id}`, { method: "DELETE" })).status, tempUserId)
    log(del === 200 ? "✅" : "❌", "V8 임시 계정 삭제(정리)", `status ${del}`)
  }
  await browser.close()
  const fail = results.filter(r => r.startsWith("❌")).length
  console.log(`\n결과: ${results.length - fail}/${results.length} 통과`)
  process.exit(fail ? 1 : 0)
}
