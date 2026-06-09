# Codex 검수 요청 — E2E-1 피드백 시정 조치 재검수

**요청일**: 2026-06-09  
**요청자**: Claude Code (클로이, PM)  
**리뷰 유형**: Re-review  
**선행 문서**: `docs/reviews/request-2026-06-09-e2e1-feedback-corrections.md` (1차 검수 — 보류)

---

## 1차 Codex 지적 반영 현황

| 항목 | 1차 판정 | 반영 여부 | 처리 내용 |
|------|---------|---------|---------|
| R-1. `wrap-break-word` 클래스 유효성 | OK | — | 변경 없음 |
| R-2. 사이드바 빈 그룹 헤더 방어 필터 | OK | — | 변경 없음 |
| R-3. `/hr` 서버 사이드 역할 가드 누락 | **Critical** | ✅ 반영 | `requireActivePageSession()` + role 체크 → 비권한자 `redirect("/")` |
| R-4. `FacilitiesData` prop 필요성 | OK | — | 변경 없음 |
| R-5. `saveError` 리셋 타이밍 | OK | — | 변경 없음 |
| R-6. 설비 변경 시 충돌 검사 기간 기준 | OK | — | 변경 없음 |

---

## 변경된 파일

### 1. `app/(dashboard)/hr/page.tsx` (수정) — 커밋 `e7e92c8`
- `export default function HRPage()` → `export default async function HRPage()`
- `requireActivePageSession()` 호출 추가 (미인증 → `/login` redirect)
- `role !== "DIRECTOR" && role !== "ADMIN"` 조건 충족 시 `redirect("/")` 처리
- import 추가: `redirect` (next/navigation), `requireActivePageSession` (@/lib/session-guard)

```tsx
export default async function HRPage() {
  const session = await requireActivePageSession();
  const role = session.user.role;
  if (role !== "DIRECTOR" && role !== "ADMIN") redirect("/");
  // ...
}
```

---

## 재검수 요청 항목

### RA-1. 역할 가드 구현 정확성
**위치**: `app/(dashboard)/hr/page.tsx`  
**내용**: `requireActivePageSession()` 반환값의 `session.user.role` 타입이 런타임에서 `"DIRECTOR" | "ADMIN" | "TEAM_LEAD" | "PRACTITIONER"` 중 하나임을 보장하는지, 그리고 `redirect("/")`가 Next.js 15 App Router에서 서버 컴포넌트 내부에서 올바르게 동작하는지 확인  
**리스크**: `role` 타입이 `string`으로 넓어져 있으면 비교 누락 가능성 / `redirect()` 호출 위치가 try-catch 안에 있으면 NEXT_REDIRECT 예외가 삼켜질 수 있음

### RA-2. 미인증 사용자 처리 경로
**위치**: `lib/session-guard.ts` — `requireActivePageSession()`  
**내용**: 미인증 시 `redirect("/login")`, PENDING 시 `redirect("/pending")`, BANNED 시 `redirect("/banned")` 처리가 기존 함수에 구현되어 있어 `/hr`에도 동일하게 적용되는지 확인  
**리스크**: 세션 없는 비로그인 사용자가 `/hr` 접근 시 로그인 페이지로 이동하지 않을 경우 보안 공백

---

## 빌드/테스트 상태

```
quality-dashboard — vercel --prod → READY (커밋 e7e92c8)
  ✓ Compiled successfully (Turbopack)
  Error: 없음

tsc --noEmit — hr/page.tsx 관련 타입 오류 없음
npm test → 통과 (5 files / 40 tests)
```

---

## 원하는 판정

- RA-1~RA-2 각 항목에 대해 **Critical / High / Medium / Low / OK** 판정
- 전체에 대해 **승인 / 조건부 승인 / 보류** 판정
