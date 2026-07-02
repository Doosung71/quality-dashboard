// 검증 — E2E-1 #52 지식/규격 현황 재설계 (트리→칩 통일, 페이지 단일 스크롤, 상세 중첩 스크롤 제거)
// 자격증명은 gitignore된 .env.local (WITNESS_VERIFY_*). 읽기 전용 — 데이터 생성 없음.
import { config } from "dotenv"
config({ path: ".env.local" })
import { chromium } from "@playwright/test"

const BASE  = process.env.BASE_URL || "http://localhost:3001"
const EMAIL = process.env.WITNESS_VERIFY_EMAIL
const PASS  = process.env.WITNESS_VERIFY_PASSWORD
if (!EMAIL || !PASS) { console.error("❌ WITNESS_VERIFY_EMAIL/PASSWORD 필요"); process.exit(1) }
// 코라 Medium 반영: 필수 모드에서는 V6/V7 스킵을 실패로 집계 (프로덕션 검증용)
const REQUIRE_CONTENT_CHECK = process.env.REQUIRE_CONTENT_CHECK === "1"

const results = []
const log = (i, l, d = "") => { const s = `${i} ${l}${d ? " → " + d : ""}`; console.log(s); results.push(s) }

// main 콘텐츠 내부의 자체 스크롤 요소 수 (shell 사이드바 제외)
const innerScrollCount = (page) =>
  page.evaluate(() => {
    const main = document.querySelector("main")
    if (!main) return -1
    return [...main.querySelectorAll("*")].filter(el => {
      const s = getComputedStyle(el)
      return (s.overflowY === "auto" || s.overflowY === "scroll") && el.scrollHeight > el.clientHeight
    }).length
  })

const browser = await chromium.launch({ headless: true })
const page = await (await browser.newContext()).newPage()

try {
  await page.goto(`${BASE}/login`)
  await page.fill('input[type="email"]', EMAIL)
  await page.fill('input[type="password"]', PASS)
  await page.click('button[type="submit"]')
  await page.waitForURL(u => !u.href.includes("/login"), { timeout: 20000 })
  log("✅", "로그인", page.url())

  // 공지/온보딩 모달 닫기
  await page.waitForSelector(".fixed.inset-0.z-50", { state: "visible", timeout: 5000 }).catch(() => {})
  for (const btn of [page.getByRole("button", { name: "확인했습니다" }), page.locator('[aria-label="닫기"]').first()]) {
    if (await btn.isVisible().catch(() => false)) { await btn.click().catch(() => {}); break }
  }

  // V1: 현황 페이지 로드 + KPI + 트리 패널 부재
  await page.goto(`${BASE}/knowledge/status`)
  await page.getByRole("main").getByRole("heading", { name: "지식/규격 현황" }).waitFor({ timeout: 15000 })
  await page.waitForFunction(() => document.body.textContent?.includes("매칭 문서가 발견되었습니다"), { timeout: 20000 })
  const hasTree = await page.getByText("지식 분류 트리").count()
  log(hasTree === 0 ? "✅" : "❌", "V1 트리 패널 제거 확인", `treeText=${hasTree}`)

  // V2: 대분류 칩 표시 + 클릭 필터링
  const stdChip = page.getByRole("button", { name: /^규격/ }).first()
  const v2visible = await stdChip.isVisible()
  await stdChip.click()
  const subChip = await page.getByRole("button", { name: /국제규격/ }).count()
  log(v2visible && subChip > 0 ? "✅" : "❌", "V2 대분류 칩 클릭 → 소분류 칩 표시", `국제규격 칩=${subChip}`)

  // V3: 목록 화면 main 내부 자체 스크롤 0 (페이지 단일 스크롤)
  const v3 = await innerScrollCount(page)
  log(v3 === 0 ? "✅" : "❌", "V3 목록 화면 내부 스크롤 0 (페이지 스크롤만)", `count=${v3}`)

  // V4: 검색 무결과 빈 상태
  await page.getByPlaceholder(/규격명, 번호/).fill("존재하지않는검색어XYZ123")
  const v4 = await page.getByText("매칭되는 지식 자산이 없습니다").isVisible({ timeout: 5000 }).catch(() => false)
  log(v4 ? "✅" : "❌", "V4 검색 무결과 빈 상태 표시")

  // V5: 검색 후 Enter → 상세 페이지 이동
  await page.getByPlaceholder(/규격명, 번호/).fill("IEC")
  await page.waitForTimeout(300)
  await page.getByPlaceholder(/규격명, 번호/).press("Enter")
  await page.waitForURL(u => u.pathname.startsWith("/knowledge/status/"), { timeout: 15000 })
  log("✅", "V5 검색 Enter → 상세 페이지 이동", decodeURIComponent(new URL(page.url()).pathname))

  // V6: 내용(sourcePath) 있는 문서 상세로 이동 → 내용 박스 자체 스크롤 없음
  const withContent = await page.evaluate(async () => {
    const d = await (await fetch("/api/knowledge/assets")).json()
    return d.assets?.find((a) => a.sourcePath)?.id ?? null
  })
  if (withContent) {
    await page.goto(`${BASE}/knowledge/status/${encodeURIComponent(withContent)}`)
  }
  const viewBtn = page.getByRole("button", { name: /내용 보기/ })
  if (withContent && await viewBtn.isVisible({ timeout: 15000 }).catch(() => false)) {
    await viewBtn.click()
    await page.waitForFunction(() => {
      const b = [...document.querySelectorAll("button")].find(x => x.textContent?.includes("내용 접기"))
      return !!b
    }, { timeout: 20000 })
    const v6 = await innerScrollCount(page)
    log(v6 === 0 ? "✅" : "❌", "V6 상세 내용 확장 후 내부 스크롤 0 (중첩 제거)", `count=${v6}`)

    // V7: ⤢ 크게 보기 모달
    await page.locator('button[title="크게 보기"]').click()
    const v7 = await page.locator(".fixed.inset-0").isVisible({ timeout: 5000 }).catch(() => false)
    log(v7 ? "✅" : "❌", "V7 크게 보기 모달 열림")
  } else {
    const diag = await page.evaluate(async () => {
      const d = await (await fetch("/api/knowledge/assets")).json()
      const total = d.assets?.length ?? -1
      const withSp = d.assets?.filter((a) => a.sourcePath).length ?? -1
      return `assets=${total} withSourcePath=${withSp}`
    })
    log(REQUIRE_CONTENT_CHECK ? "❌" : "⚠️", "V6/V7 스킵 — 내용 보기 문서 없음", `id=${withContent} ${diag}${REQUIRE_CONTENT_CHECK ? " (필수 모드: 실패 처리)" : ""}`)
  }
} catch (e) {
  log("❌", "검증 중단", e.message)
} finally {
  await browser.close()
  const fail = results.filter(r => r.startsWith("❌")).length
  console.log(`\n결과: ${results.length - fail}/${results.length} 통과`)
  process.exit(fail ? 1 : 0)
}
