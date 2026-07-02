# Codex 검수 요청 — 관리자 판별 앱 전역 통일 (E2E-1 #51 RT-02(a) 후속)

**요청일**: 2026-07-02
**요청자**: Claude Code (PM)
**리뷰 유형**: Implementation Review
**선행 문서**: `docs/reviews/result-2026-07-02-tender-sidebar-integration-51.md` (RT-02 Medium 지적)

---

## 변경 개요

#51 사이드바 통합 검수에서 코라가 지적한 RT-02 Medium 후속 조치다. 관리자 판별이 앱 전역에서 3갈래(헤더=`role ADMIN||DIRECTOR`, 페이지=`isAdmin(email)`, API=`isAdmin(email, role)`)로 갈라져 있어, DIRECTOR에게 사용자 관리 링크가 보이지만 클릭하면 홈으로 튕기는 불일치가 있었다. 기준점을 사용자관리 API의 `isAdmin(email, role)`(allowlist 이메일 OR ADMIN 역할)로 정하고 전 사용처를 통일했다.

**설계 판단 (Dennis 승인 완료)**:
- 접근 기준: **A안 — 관리자만** (DIRECTOR 제외, 최소권한 원칙). 권한 확대 없음.
- 수정 범위: **B안 — 앱 전역 통일** (헤더 + 페이지 + activity 3라우트 + presence)
- 실패 시 동작: fail-closed 유지 (페이지 redirect("/"), API 403)
- 헤더 판별: 서버 레이아웃에서 `isAdmin(email, role)` 계산 후 불리언 prop 전달 — 클라이언트 번들에 ADMIN_EMAILS allowlist 노출 방지
- 외부 API 전송 데이터 범위: 변경 없음

**RT-02(b) PENDING 배지 전역 복원**은 세션53에서 스코프/성능 부담으로 보류 확정 — 이번 범위 아님.

---

## 변경된 파일

### 1. `app/(dashboard)/layout.tsx` (수정)
- 서버 레이아웃에서 `isAdmin(session.user.email, session.user.role)` 계산 → `isAdminUser` prop으로 DashboardShell에 전달

### 2. `components/layout/dashboard-shell.tsx` (수정)
- `isAdminUser: boolean` prop 추가, Header로 전달만 (로직 없음)

### 3. `components/layout/header.tsx` (수정)
- 기존 `const isAdmin = role === "ADMIN" || role === "DIRECTOR"` 제거 → `isAdminUser` prop으로 사용자 관리 링크 노출 결정
- `role`은 RoleBadge 표시용으로 유지

### 4. `app/admin/users/page.tsx` (수정)
- 가드 `isAdmin(session.user.email)` → `isAdmin(session.user.email, session.user.role)` — ADMIN 역할 계정도 페이지 접근 가능 (동일 데이터 API와 정합)

### 5~7. `app/api/admin/activity/route.ts` · `[userId]/route.ts` · `trend/route.ts` (수정)
- 가드에 role 인자 추가 (각 1줄)

### 8. `app/api/presence/route.ts` (수정)
- 가드에 role 인자 추가 (1줄)

### 9. `app/api/presence/route.test.ts` (신규)
- 가드 단위 테스트 5케이스: 세션 없음 403 / PRACTITIONER 403 / **DIRECTOR 403** / **ADMIN 역할(비-allowlist) 200** / allowlist 이메일 200
- `lib/admin`은 목킹하지 않고 실제 함수로 검증 (auth만 목킹)

### 10. `scripts/verify-admin-guard-51.mjs` (신규)
- Playwright 브라우저 검증. 관리자 자격증명은 `.env.local`(gitignore) `WITNESS_VERIFY_*` env로만 주입
- DIRECTOR 검증용 임시 계정은 **런타임 랜덤 비밀번호**(crypto.randomBytes) 생성 → 검증 후 삭제(V8)

---

## 검수 요청 항목

### AG-01. 판별 기준 통일의 완전성
**위치**: 전체 diff
**내용**: `isAdmin(email)` role 인자 누락 호출이 남아 있지 않은지, 헤더/페이지/API 판별 조건이 완전히 일치하는지
**리스크**: 한 곳이라도 남으면 RT-02와 동일한 링크-접근 불일치 재발

### AG-02. DIRECTOR 권한 축소의 부작용
**위치**: `components/layout/header.tsx`
**내용**: 기존에 DIRECTOR에게 보이던 링크가 사라지는 것이 의도된 변경(Dennis A안 승인)임을 전제로, DIRECTOR가 사용해야 할 다른 기능이 이 prop에 얽혀 있지 않은지
**리스크**: DIRECTOR 계정의 기존 워크플로우 회귀

### AG-03. allowlist 클라이언트 노출 방지
**위치**: `app/(dashboard)/layout.tsx`, `components/layout/header.tsx`
**내용**: `lib/admin.ts`가 클라이언트 컴포넌트에서 import되지 않는 구조가 유지되는지 (서버에서 불리언만 전달)
**리스크**: ADMIN_EMAILS가 브라우저 번들에 노출

### AG-04. presence·activity API role 인정의 보안 영향
**위치**: `app/api/presence/route.ts`, `app/api/admin/activity/*`
**내용**: ADMIN **역할** 계정이 접속현황·활동현황에 접근 가능해지는 것이 `isAdmin` 정의(관리자=allowlist OR ADMIN 역할)와 정합적인지
**리스크**: 의도치 않은 데이터 접근 범위 확대 (단, ADMIN 역할 부여는 관리자만 가능)

### AG-05. 검증 스크립트의 자격증명 처리
**위치**: `scripts/verify-admin-guard-51.mjs`
**내용**: 하드코딩 자격증명 없음(#30 H-01 재발 방지), 임시 계정 정리(finally 블록) 누락 경로 없음
**리스크**: 자격증명 유출 또는 라이브 DB 잔여 데이터

---

## 빌드/테스트 상태

```
npm test → 20 files, 191 passed (신규 5케이스 포함)
npm run build → 통과
node scripts/verify-admin-guard-51.mjs (localhost:3001) → 11/11 통과
  V1 관리자 헤더 링크 표시 ✅ / V2 /admin/users 접근 ✅ / V3 activity·presence 200 ✅
  V5 DIRECTOR 링크 미노출 ✅ / V6 /admin/users redirect ✅ / V7 API 403 ✅ / V8 임시계정 삭제 ✅
```

---

## 원하는 판정

- 각 항목에 대해 Critical / High / Medium / Low / OK 판정
- 전체에 대해 승인 / 조건부 승인 / 보류 판정
