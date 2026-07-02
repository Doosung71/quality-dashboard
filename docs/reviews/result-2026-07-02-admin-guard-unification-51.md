# Codex (코라) Review: 관리자 판별 앱 전역 통일 (E2E-1 #51 RT-02(a))

**검수일**: 2026-07-02
**검수자**: Codex CLI (코라)
**요청서**: `quality-dashboard/docs/reviews/request-2026-07-02-admin-guard-unification-51.md`
**대상 영역**: `quality-dashboard` 관리자 판별 통일, header/admin page/activity/presence guard, 검증 스크립트
**검수 방식**: 정적 코드 리뷰 + diff 대조 + 검색 기반 잔여 호출 확인 + 로컬 테스트/빌드 실행

## 최종 판정

승인

Critical/High 발견 사항은 없습니다. 요청서의 A안(관리자만, DIRECTOR 제외) 및 B안(앱 전역 통일) 기준에 맞게 헤더, `/admin/users`, activity API, presence API의 관리자 판별이 `isAdmin(email, role)` 기준으로 정렬되었습니다.

남은 리스크는 요청서에 명시된 Playwright 라이브 검증을 이번 리뷰에서 재실행하지 못했다는 점입니다. 다만 정적 검토, 신규 단위 테스트, 로컬 전체 테스트, 프로덕션 빌드가 통과했고, 요청서에 `verify-admin-guard-51.mjs` 11/11 통과 증거가 포함되어 있어 완료 판정에는 지장이 없습니다.

## 검수 범위

- `app/(dashboard)/layout.tsx`
- `components/layout/dashboard-shell.tsx`
- `components/layout/header.tsx`
- `app/admin/users/page.tsx`
- `app/api/admin/activity/route.ts`
- `app/api/admin/activity/[userId]/route.ts`
- `app/api/admin/activity/trend/route.ts`
- `app/api/presence/route.ts`
- `app/api/presence/route.test.ts`
- `scripts/verify-admin-guard-51.mjs`
- 관련 기준 함수: `lib/admin.ts`

읽지 못한 지침:

- `MULTI_AGENT_KNOWLEDGE_OPS.md`: 루트에서 파일을 찾을 수 없어 검토하지 못했습니다.
- `.env`, `.env.local`, `.env.*`: 프로젝트 보안 지침에 따라 내용을 읽지 않았습니다.

## 검증 증거

- `git status --short` 확인: 요청서에 기재된 8개 수정 파일과 신규 테스트/검증 스크립트 확인
- `rg 'isAdmin\(|isAdminUser|ADMIN_EMAILS|role === "ADMIN"|role === "DIRECTOR"' app components lib scripts`: `lib/admin`의 `isAdmin(email)` role 누락 호출이 이번 admin/presence/activity 경로에 남아 있지 않음을 확인
- `git diff` 확인: header의 `role === "ADMIN" || role === "DIRECTOR"` 링크 노출 로직 제거, 서버 layout에서 `isAdmin(email, role)` 계산 후 boolean 전달
- `npm test`: 20 files, 191 passed
- `npm run build`: 통과. 기존 미사용 import/expression lint warning은 있으나 이번 변경 파일 관련 신규 오류 없음
- 요청서 기재 증거: `node scripts/verify-admin-guard-51.mjs (localhost:3001)` 11/11 통과

## 항목별 판정

### AG-01. 판별 기준 통일의 완전성

판정: OK

`app/(dashboard)/layout.tsx`에서 서버 컴포넌트가 `isAdmin(session.user.email, session.user.role)`을 계산하고 `DashboardShell`/`Header`에는 `isAdminUser` boolean만 전달합니다. `/admin/users`, activity 3개 라우트, presence 라우트도 모두 `isAdmin(email, role)`로 통일되었습니다.

검색 결과 `lib/admin`의 `isAdmin(email)` 형태가 이번 대상 경로에 잔존하지 않습니다. `lib/board-visibility.ts`의 동명 `isAdmin(role)`은 별도 board visibility helper로, 이번 사용자 관리 guard 기준과 다른 모듈입니다.

### AG-02. DIRECTOR 권한 축소의 부작용

판정: OK

`components/layout/header.tsx`는 사용자 관리 링크 노출에만 `isAdminUser`를 사용하고, `role`은 `RoleBadge` 표시용으로 유지합니다. `Sidebar`, `MainDashboard`, feedback 권한 등 DIRECTOR 전용/특권 흐름은 기존 role 기반 분기를 그대로 사용하므로 DIRECTOR의 다른 워크플로우가 이번 prop에 묶이지 않습니다.

### AG-03. allowlist 클라이언트 노출 방지

판정: OK

`components/layout/header.tsx`와 `components/layout/dashboard-shell.tsx`는 클라이언트 컴포넌트지만 `@/lib/admin`을 import하지 않습니다. `ADMIN_EMAILS`가 있는 `lib/admin.ts`는 서버 layout과 route/page guard에서만 사용되고, 클라이언트로는 boolean 결과만 전달됩니다.

### AG-04. presence·activity API role 인정의 보안 영향

판정: OK

`app/api/admin/activity/*` 및 `app/api/presence/route.ts`는 fail-closed 403 구조를 유지하면서 `ADMIN` 역할 계정을 관리자 기준에 포함합니다. 이는 기존 사용자 관리 API의 `isAdmin(email, role)` 정의와 일치하며, DIRECTOR는 신규 테스트와 요청서 E2E 증거상 403으로 차단됩니다.

### AG-05. 검증 스크립트의 자격증명 처리

판정: OK

`scripts/verify-admin-guard-51.mjs`는 관리자 자격증명을 `WITNESS_VERIFY_EMAIL/PASSWORD` env에서만 읽고 하드코딩하지 않습니다. DIRECTOR 검증 계정은 `randomBytes` 기반 런타임 비밀번호를 사용하며, `finally`에서 `tempUserId`가 있는 경우 삭제 API를 호출합니다. 등록 실패 또는 id 조회 실패 시에도 브라우저 종료와 실패 exit가 수행됩니다.

## 발견 사항

### Critical

없음.

### High

없음.

### Medium

없음.

### Low

없음.

## 반드시 수정할 항목

없음.

## 테스트/검증 제안

- 배포 전에는 요청서와 동일하게 관리자 계정과 DIRECTOR 임시 계정으로 `scripts/verify-admin-guard-51.mjs`를 한 번 더 실행해 실제 배포 환경의 세션/DB 정책과 일치하는지 확인하십시오.
- `npm run build`에서 출력된 기존 lint warning은 이번 변경 차단 요소는 아니지만, 별도 정리 대상으로 유지하는 것이 좋습니다.

## 재리뷰 필요 여부

필수 재리뷰는 필요하지 않습니다.

이번 범위는 승인 가능합니다.
