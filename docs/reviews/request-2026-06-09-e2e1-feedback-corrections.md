# Codex 검수 요청 — E2E-1 피드백 시정 조치 (UI/UX 5건)

**요청일**: 2026-06-09  
**요청자**: Claude Code (클로이, PM)  
**리뷰 유형**: Implementation Review  
**선행 문서**: 없음 (신규 구현)

---

## 변경 개요

E2E-1 사용자 피드백 시정 조치로 quality-dashboard 5개 커밋을 적용했다.
클레임·NCR 상세 페이지의 텍스트 오버플로 버그 수정, 사이드바 전면 재구성(품질 프로세스 흐름 순),
자산 관리 명칭 구체화, 시험/분석 관리 페이지 리팩토링, 시험 계획 수정 모달 기능 보강으로 구성된다.
모든 변경은 quality-dashboard 단일 레포에 집중되어 있으며 프로덕션 배포 완료 상태다.

---

## 변경된 파일

### 1. `app/(dashboard)/claims/[id]/ClaimDetailPage.tsx` (수정) — 커밋 `60833ea`
- 제목 flex 컨테이너에 `min-w-0` 추가, 뒤로 가기 링크에 `shrink-0` 추가
- `<h1>` 클래스에 `break-all` 적용
- 인포 그리드 `<p>` 태그 전체에 `wrap-break-word` 적용 (Tailwind v4 클래스)
- 뱃지 행에 `flex-wrap` 추가

### 2. `app/(dashboard)/ncr/[id]/NCRDetailPage.tsx` (수정) — 커밋 `60833ea`
- ClaimDetailPage와 동일 패턴 적용
- 조건부 className 라인: `${isOverdue ? "text-rose-600 animate-pulse" : "text-slate-800"} wrap-break-word` 형태로 병합

### 3. `components/layout/sidebar.tsx` (수정) — 커밋 `0d65247`
- `NavItem.href` 를 선택(optional)으로 변경 — `href` 없는 그룹 헤더는 `<div>` 렌더
- `ALL_NAV` 전면 재구성: 6개 섹션 (대시보드·프로젝트·입고품질·시험품질보증·품질이상사후·기준정보지원)
- 하단 고정 소통 채널 영역(게시판·피드백) 유지
- **인사·면담 접근 역할**: `["DIRECTOR", "ADMIN"]` — TEAM_LEAD 제외
- 방어 필터: `.filter(item => item.href !== undefined || (item.children && item.children.length > 0))`

### 4. `components/layout/header.tsx` (수정) — 커밋 `b40eb51`
- `titles` 맵: `"/assets": "시험설비/계측기 관리"` 업데이트

### 5. `components/facilities/facilities-view.tsx` (수정) — 커밋 `d3572b9`, `2f7b40a`
- **제거**: KPI 카드, 시험장 사이트탭 패널(좌), 가동 시험 패널(우), 간트 차트, SpaceRow, ActiveTestsPanel
- **추가**: 상태 필터 칩(전체·시험중·준비중·지연·완료 + 건수), 시험 계획 카드 리스트
- **등록 모달**: 기존 `TestPlanForm` 재활용 — `data` prop(FacilitiesData)은 TestPlanForm 내부 설비 브라우저를 위해 유지
- **수정 모달**: `EditForm`에 `equipmentId` 추가 → 수정 모달 상단에 설비 드롭다운 배치, PATCH에 포함
- **409 충돌 처리**: `saveError` state로 충돌 메시지 모달 내 표시 (native `confirm()` 미사용)
- **카드 담당/관리팀**: 항상 표시 — 미설정 시 "미지정" 회색 텍스트

### 6. `app/(dashboard)/facilities/page.tsx` (수정) — 커밋 `d3572b9`
- `<h1>` 제거, 설명 텍스트 변경: "인증·양산·개발 시험 계획 등록 및 진행 현황 관리"

---

## 검수 요청 항목

### R-1. Tailwind v4 클래스 `wrap-break-word` 유효성
**위치**: `app/(dashboard)/claims/[id]/ClaimDetailPage.tsx`, `ncr/[id]/NCRDetailPage.tsx`  
**내용**: `break-words` 대신 `wrap-break-word`를 사용했다. IDE 린터가 `break-words`를 Tailwind v4 비권장으로 경고해 교체했으나, `wrap-break-word`가 실제 Tailwind v4 공식 클래스인지, 또는 브라우저에서 동작하는지 확인  
**리스크**: 클래스명이 틀리면 CSS가 적용되지 않아 오버플로 재발

### R-2. 사이드바 비링크 그룹 헤더 방어 필터 완전성
**위치**: `components/layout/sidebar.tsx` — `navItems` 필터 체인  
**내용**: `item.href === undefined` 이면서 `item.children`이 역할 필터 후 빈 배열이 되는 경우(예: TEAM_LEAD 로그인 시 인사·면담 자식이 사라져 기준정보및지원 그룹이 빈 헤더로 남을 가능성) 방어 필터가 올바르게 처리하는지 확인  
**리스크**: 빈 그룹 헤더가 렌더되어 사이드바에 내용 없는 섹션 레이블만 표시될 수 있음

### R-3. 인사·면담 역할 접근 제어 누락 경로
**위치**: `components/layout/sidebar.tsx` L87, `app/(dashboard)/hr/page.tsx` (미수정)  
**내용**: 사이드바 NavItem의 `roles: ["DIRECTOR", "ADMIN"]`은 메뉴를 숨기지만, `/hr` 페이지 자체의 서버 사이드 역할 가드가 TEAM_LEAD 직접 URL 접근을 차단하는지 확인  
**리스크**: 메뉴 숨김만으로는 URL 직접 접근 차단 불가 — `requireActiveSession` + 역할 체크 미적용 시 TEAM_LEAD도 접근 가능

### R-4. FacilitiesView `data` prop 사용 필요성 검증
**위치**: `components/facilities/facilities-view.tsx`, `components/assets/test-plan-form.tsx`  
**내용**: 리팩토링 후 뷰 자체에서는 `FacilitiesData`를 사용하지 않는다. `data` prop을 `TestPlanForm`의 `facilitiesData`로 전달하는 것이 실제로 필요한지, 또는 `TestPlanForm`이 내부적으로 필요하지 않은데 prop이 유지되고 있는지 확인  
**리스크**: 불필요 prop 유지 시 타입 의존성 및 데이터 흐름 불명확

### R-5. PATCH 수정 모달 `saveError` 리셋 타이밍
**위치**: `components/facilities/facilities-view.tsx` — `handleSave`, 닫기 버튼 핸들러  
**내용**: 저장 성공 시 `setSaveError(null)` 호출, 취소/X 버튼에도 `setSaveError(null)` 추가됨. 단, 다른 카드의 수정 모달을 연속으로 여는 경우(`openEdit`) `saveError`가 초기화되지 않아 이전 에러 메시지가 잔류하는지 확인  
**리스크**: 잔류 에러 메시지로 사용자 혼란 유발

### R-6. 설비 변경 시 충돌 검사 기간 기준
**위치**: `app/api/test-plans/[id]/route.ts` — `PATCH` 핸들러 (기존 코드, 이번 변경 아님)  
**내용**: 수정 모달에서 `equipmentId`만 변경하고 날짜를 변경하지 않는 경우, API가 현재 DB의 `plannedStart`/`plannedEnd`를 기준으로 충돌 검사를 수행하는지 확인 (코드상 `current` 조회 후 병합 로직 존재)  
**리스크**: 날짜 병합 누락 시 충돌 미감지

---

## 빌드/테스트 상태

```
quality-dashboard — vercel --prod 배포 → READY (빌드 1m 31s)
  ✓ Compiled successfully in 31.2s (Turbopack)
  Warning: 기존 파일 unused var/import 경고 다수 — 이번 변경 파일과 무관
  Error: 없음

tsc --noEmit — 변경 파일(facilities-view.tsx) 관련 타입 오류 없음
  (validator.ts 296번 기존 오류는 .next/ 생성 파일 — 이번 변경과 무관)
```

E2E 수동 검증: `/facilities` 카드 목록·필터 정상, 수정 모달 설비 드롭다운 노출 확인 (스크린샷 Dennis 확인)

---

## 원하는 판정

- R-1~R-6 각 항목에 대해 **Critical / High / Medium / Low / OK** 판정
- 전체에 대해 **승인 / 조건부 승인 / 보류** 판정
- R-3(인사·면담 역할 가드)은 현재 `/hr` page.tsx 코드를 직접 확인해 판단해 줄 것
