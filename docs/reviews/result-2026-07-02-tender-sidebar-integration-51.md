# Codex (코라) Review: 입찰 목록(/dashboard) 사이드바 통합 (E2E-1 #51, 범위 C)

**검수일**: 2026-07-02
**검수자**: Codex CLI (코라)
**요청서**: `quality-dashboard/docs/reviews/request-2026-07-02-tender-sidebar-integration-51.md`
**대상 영역**: `quality-dashboard` 입찰 목록 라우트 그룹 이동 및 DashboardShell 통합
**검수 방식**: 정적 코드 리뷰 + staged diff 대조 + 요청서 빌드/브라우저 검증 증거 확인

## 최종 판정

조건부 승인

Critical/High 발견 사항은 없습니다. RT-01의 라우트 그룹 이동과 `/tender/[id]`의 `/dashboard` 복귀 경로는 요청 범위 C에 맞게 구현되어 있고, `/dashboard`는 이제 `DashboardShell`의 sidebar/header/presence/notice shell 안에서 렌더링됩니다.

다만 RT-02 헤더 기능 이관에는 Medium 1건이 남습니다. shell header가 사용자 관리 링크를 `DIRECTOR`에게도 노출하지만 실제 `/admin/users` 페이지는 이메일 allowlist만 통과시키고, 이동 전 입찰 헤더에 있던 PENDING 사용자 수 배지는 shell에서 대체되지 않습니다. 핵심 #51 완료를 막는 High는 아니지만, 운영 UX/권한 일관성 후속 수정이 필요합니다.

## 검수 범위

- `app/(dashboard)/layout.tsx`
- `components/layout/dashboard-shell.tsx`
- `components/layout/header.tsx`
- `components/layout/sidebar.tsx`
- `app/(dashboard)/dashboard/page.tsx`
- `app/(dashboard)/dashboard/BackButton.tsx`
- `app/tender/[id]/page.tsx`
- 비교용 staged diff: `app/dashboard/*` -> `app/(dashboard)/dashboard/*`
- 관련 권한 확인: `lib/admin.ts`, `app/admin/users/page.tsx`, `app/api/admin/users/route.ts`

읽지 못한 지침:

- `MULTI_AGENT_KNOWLEDGE_OPS.md`: 루트에서 파일을 찾을 수 없어 검토하지 못했습니다.
- `.env`, `.env.local`, `.env.*`: 프로젝트 보안 지침에 따라 읽지 않았습니다.

## 검증 증거

- `quality-dashboard` 기준 `git status --short --untracked-files=all`: `app/dashboard/*` -> `app/(dashboard)/dashboard/*` rename 6건, 요청서 untracked 1건
- `git diff --cached --stat -- "app/dashboard" "app/(dashboard)/dashboard"`: 6 files changed, 2 insertions, 82 deletions
- `git diff --cached --name-status`: `BackButton`, `TenderCard`, `TenderList`, `TenderThread`, `UploadForm`은 R100, `page.tsx`는 R077
- 요청서 기재 증거: `npm run build` 통과, 로컬 브라우저 검증 4/4 통과
- 독립 빌드/브라우저 검증은 실행하지 않았습니다. 산출물 생성을 피하기 위해 요청서의 검증 기록을 참고했습니다.

## 항목별 판정

### RT-01. 라우트 그룹 이동의 정확성

판정: OK

`app/dashboard/*`가 `app/(dashboard)/dashboard/*`로 이동되어 URL 세그먼트는 여전히 `/dashboard`입니다. `git ls-files` 기준 기존 `app/dashboard/*` tracked 파일은 남지 않고, 새 경로만 존재합니다. `app/(dashboard)/layout.tsx`가 `DashboardShell`로 children을 감싸므로 `/dashboard`는 shell 내부로 들어갑니다.

사이드바는 `components/layout/sidebar.tsx:40-44`에서 프로젝트 관리 하위 `href: "/dashboard"`를 유지합니다. 입찰 상세도 `app/tender/[id]/page.tsx:103`, `app/tender/[id]/page.tsx:160`에서 not-found redirect와 뒤로가기 링크 모두 `/dashboard`를 유지합니다.

### RT-02. 헤더 기능 이관 완전성

판정: Medium

로그아웃, 프로필, 도움말, 사용자 관리 링크 자체는 shell header에서 대체됩니다. `/dashboard` 제목도 `components/layout/header.tsx:35`에 "입찰 프로젝트"로 매핑되어 있습니다. 피드백은 shell header 우측이 아니라 sidebar 하단 소통 채널에서 제공됩니다.

남은 문제는 사용자 관리 액션의 완전 이관입니다. 기존 입찰 헤더는 `isAdmin(session.user.email)`일 때만 사용자 관리 링크와 PENDING 사용자 수 배지를 보여줬습니다. 현재 shell header는 `components/layout/header.tsx:107-108`에서 `role === "ADMIN" || role === "DIRECTOR"`인 경우 사용자 관리 링크를 보여주지만, 실제 페이지는 `app/admin/users/page.tsx:10`에서 `isAdmin(session.user.email)`만 검사합니다. `lib/admin.ts:4-5`는 role 인자를 받을 때만 ADMIN role을 인정하므로, shell에서 보이는 링크와 페이지 접근 조건이 어긋납니다. 또한 PENDING 배지는 shell header에 대체 구현이 없어 관리자가 `/dashboard`에서 즉시 대기 수를 볼 수 없게 됩니다.

이는 핵심 사이드바 통합을 깨는 문제는 아니지만, 제거된 자체 헤더의 "사용자관리 배지" 기능 이관은 불완전합니다.

### RT-03. 미사용 코드/변수 정리

판정: Low

`app/(dashboard)/dashboard/page.tsx:30`, `:63-79`, `:105` 이후에서 `session`은 여전히 role 기반 결재 대기 패널 분기에 사용됩니다. 헤더 전용 import와 `pendingUserCount`, `roleLabel` 제거도 staged diff 기준 정리되어 있습니다.

다만 `app/(dashboard)/dashboard/BackButton.tsx`는 이동 후 현재 import 사용처가 없습니다. build를 막지는 않지만 dead file로 남아 있어 후속 삭제가 적절합니다.

### RT-04. 레이아웃 회귀

판정: OK

`DashboardShell`은 `components/layout/dashboard-shell.tsx:64-68`에서 sidebar 폭만큼 `lg:ml-14/56`을 적용하고, main 영역에 `p-4 lg:p-6`를 제공합니다. 이동된 `/dashboard` page는 `app/(dashboard)/dashboard/page.tsx:82-83`에서 `max-w-5xl mx-auto` 콘텐츠 래퍼만 남기므로 standalone 시절의 `main`/sticky header 중첩은 제거됐습니다.

`/tender/[id]`는 `(dashboard)` 그룹 밖에 그대로 있고 자체 전체화면 header를 유지합니다. 이는 요청서의 범위 C 설계 결정과 일치하므로 회귀로 보지 않습니다.

## 발견 사항

### Critical

없음.

### High

없음.

### Medium

1. `components/layout/header.tsx:107-108`, `app/admin/users/page.tsx:10`, `lib/admin.ts:4-5`: shell header는 `DIRECTOR`에게 사용자 관리 링크를 보여주지만 실제 `/admin/users` page는 이메일 allowlist만 통과시킵니다. 또한 기존 `/dashboard` 헤더의 PENDING 사용자 수 배지가 shell에서 대체되지 않았습니다. 핵심 라우트 통합은 안전하지만, 헤더 기능 이관 완전성은 보강이 필요합니다.

### Low

1. `app/(dashboard)/dashboard/BackButton.tsx`: `/dashboard` page에서 import가 제거된 뒤 미사용 파일로 남았습니다. 빌드 차단은 아니지만 후속 삭제 대상입니다.

## 반드시 수정할 항목

없음.

Critical/High 발견 사항은 없으므로 E2E-1 #51 범위 C 완료 진행은 가능합니다.

## 테스트/검증 제안

- 관리자 계정과 부문장 계정으로 `/dashboard` header의 사용자 관리 링크가 실제 접근 정책과 일치하는지 확인하십시오.
- PENDING 사용자 수 배지를 shell header에 공통 기능으로 되살릴지, 아니면 사용자 관리 페이지 내부 확인으로 정책을 정리할지 결정하십시오.
- 미사용 `BackButton.tsx` 삭제 후 `npm run build`를 재실행하십시오.

## 재리뷰 필요 여부

필수 재리뷰는 필요하지 않습니다.

Medium 사용자 관리 링크/배지 정책을 수정하면 간단 재리뷰를 권장합니다.
