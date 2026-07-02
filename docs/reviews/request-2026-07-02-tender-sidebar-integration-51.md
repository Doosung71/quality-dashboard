# Codex 검수 요청 — 입찰 목록(/dashboard) 사이드바 통합 (E2E-1 #51, 범위 C)

**요청일**: 2026-07-02
**요청자**: Claude Code (PM)
**리뷰 유형**: Implementation Review
**선행 문서**: 없음

---

## 변경 개요

E2E-1 피드백 #51(임일혁 부장): "입찰검토에서 뒤로가기 하면 프로젝트관리가 아닌
대시보드로 이탈한다." 근본 원인은 입찰 모듈(`/dashboard` 입찰 목록, `/tender/[id]`
상세)이 `app/(dashboard)/layout.tsx`의 사이드바 shell **그룹 밖**에 있어, 뒤로가기로
`/dashboard`에 착지해도 사이드바가 없어 "이탈"한 것처럼 보이는 것.

Dennis 승인 범위 **C(핵심만)**: **입찰 목록(`/dashboard`)만 사이드바 shell에 통합**하고,
입찰 상세(`/tender/[id]`)는 집중형 전체화면(문서 분석 뷰)으로 그대로 둔다. 이제
뒤로가기가 사이드바 있는 목록으로 착지해 "이탈" 느낌이 해소된다.

핵심 구현: `app/dashboard/`를 `app/(dashboard)/dashboard/`로 이동. `(dashboard)`는
URL 세그먼트가 없는 라우트 그룹이므로 **URL은 `/dashboard` 그대로**이며, 이제
`app/(dashboard)/layout.tsx`(DashboardShell = Sidebar + Header + NoticeModal + presence)가
자동으로 감싼다. 페이지의 **자체 sticky 헤더와 `<main>` 래퍼를 제거**하고 콘텐츠만 남겼다.

---

## 변경된 파일

### 1. `app/(dashboard)/dashboard/*` (이동 — 기존 `app/dashboard/*`)
- `page.tsx`, `BackButton.tsx`, `TenderCard.tsx`, `TenderList.tsx`, `TenderThread.tsx`, `UploadForm.tsx` 를 `git mv`로 이동(히스토리·상대 임포트 보존). URL 불변(`/dashboard`).

### 2. `app/(dashboard)/dashboard/page.tsx` (수정 — 84줄 삭제)
- 자체 `<header>`(로고·전사대시보드·도움말·피드백·사용자관리·프로필·로그아웃) 전체 제거 → shell Header가 대체.
- 최상위 `<main className="min-h-screen …">` 래퍼 제거 → shell이 `<main className="flex-1 p-4 lg:p-6">` 제공. 콘텐츠 래퍼를 `<div className="max-w-5xl mx-auto">`로 단순화.
- 헤더 전용 코드 제거: import(`signOut`·`isAdmin`·`BackButton`·lucide 6종), `roleLabel` 상수, `pendingUserCount` 쿼리.
- 콘텐츠(히어로 카드·업로드 폼·결재 대기 패널·입찰 목록)와 데이터 로직은 무변경.

---

## 검수 요청 항목

### RT-01. 라우트 그룹 이동의 정확성 (최우선)
**위치**: `app/(dashboard)/dashboard/`, `app/(dashboard)/layout.tsx`
**내용**: `app/dashboard/` → `app/(dashboard)/dashboard/` 이동 후 URL이 `/dashboard`로 동일하게 유지되는지, 라우트 충돌/중복이 없는지. 사이드바 링크(`/dashboard`=입찰프로젝트)·`/tender/[id]` 뒤로가기(`href="/dashboard"`)가 그대로 동작하는지.
**리스크**: 라우트 충돌 시 500/404. build는 `/dashboard` 단일 라우트로 통과(17kB).

### RT-02. 헤더 기능 이관 완전성
**위치**: `page.tsx`(헤더 제거) vs `components/layout/header.tsx`·`sidebar.tsx`
**내용**: 제거한 자체 헤더의 기능(로그아웃·프로필·도움말·피드백·사용자관리 배지)이 shell Header/Sidebar로 모두 커버되는지. 누락된 액션이 없는지. `header.tsx` titles 맵에 `/dashboard`→"입찰 프로젝트" 이미 존재.
**리스크**: 관리자 pending 배지 등 특정 액션이 shell에 없으면 기능 후퇴.

### RT-03. 미사용 코드/변수 정리
**위치**: `page.tsx`
**내용**: `session`은 여전히 사용(role 분기·requireActivePageSession)되나, 헤더에서만 쓰던 `session.user.email/name/nickname` 참조 제거로 남은 참조가 유효한지. `BackButton.tsx`는 이제 미사용 파일(임포트 제거)로 남음 — 삭제 대상인지 의견.
**리스크**: 낮음. build/lint 통과.

### RT-04. 레이아웃 회귀
**위치**: `page.tsx` 콘텐츠 래퍼
**내용**: shell의 `p-4 lg:p-6` + `max-w-5xl mx-auto`로 입찰 목록이 정상 배치되는지(이중 패딩·정렬 문제 없는지). `/tender/[id]`는 의도적으로 shell 밖 전체화면 유지 — 이것이 범위 C의 설계 결정(회귀 아님)임을 확인.
**리스크**: 시각 회귀.

---

## 빌드/테스트 상태

```
npm run build → 통과. /dashboard(17kB) 단일 라우트, /tender/[id](24.4kB) standalone 유지.
로컬 브라우저 검증(dev 3001) 4/4:
  ✅ /dashboard 사이드바 shell 렌더(/ncr·/claims 메뉴 링크 존재)
  ✅ 입찰 목록/업로드 콘텐츠 렌더
  ✅ 옛 standalone "AI 입찰검토 시스템" 헤더 제거(잔존 0)
  ✅ client 예외 0 (pageerror 0)
```

---

## 원하는 판정

- RT-01 ~ RT-04 각 Critical / High / Medium / Low / OK
- 전체 승인 / 조건부 승인 / 보류
- 특히 RT-01(라우트 이동)·RT-02(헤더 기능 이관) 안전 확인
