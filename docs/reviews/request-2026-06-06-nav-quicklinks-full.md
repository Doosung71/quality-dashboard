# Codex 검수 요청 — 사이드바 메뉴명 전면 개편 + 실무자 퀵 링크 재구성

**요청일**: 2026-06-06
**요청자**: Claude Code (PM)
**리뷰 유형**: Implementation Review
**선행 문서**: `docs/reviews/request-2026-06-06-quicklinks-nav-sync.md` (코라 조건부 승인 — 라벨 동기화 4개 항목 + 권한 맵 갱신 + 그룹 헤더 '품질 이슈' → '품질 비용 관리' 포함 이번에 반영 완료)

---

## 변경 개요

오늘(2026-06-06) 사이드바·헤더 메뉴명을 전면 개편하고(커밋 `862a4e6`~`22df3af`), 실무자 대시보드의 퀵 링크 위젯도 사이드바 구조·순서와 완전히 일치하도록 재구성했다(커밋 `a491241`~`ccd739a`). 추가로 퀵 링크 "수주 프로젝트" 항목이 등록 모달을 자동 오픈하도록 URL 파라미터 기반 흐름을 구현했다(커밋 `7d0fad0`).

---

## 변경된 파일

### 1. `components/layout/sidebar.tsx` (수정)
- 메뉴 1depth 라벨 변경: 품질 이슈 → 품질 비용 관리, 자산 → 자산 관리, 프로젝트 → 프로젝트 관리, 시험 장비 → 시험 및 품질 보증, 품질 지식 → 지식 관리
- 메뉴 순서 변경: 품질 비용 관리 → 자산 관리 → 입고품질관리 → 프로젝트 관리 → 시험 및 품질 보증 → 지식 관리 → 외부 정보 → 인사·면담
- 2depth "검사 업무" → "입고품질관리" (href 유지: `/vendors`)
- 2depth "입찰 검토" → "입찰 프로젝트" (href 유지: `/dashboard`)

### 2. `components/layout/header.tsx` (수정)
- `titles` 맵 동기화: `/vendors` → "입고품질관리", `/assets` → "자산 관리", `/projects` → "프로젝트 관리", `/facilities` → "시험 및 품질 보증", `/knowledge` → "지식 관리"

### 3. `app/(dashboard)/MainDashboard.tsx` (수정)
- 실무자 퀵 링크 섹션 전면 재편:
  - 순서: 품질 비용 관리 → 자산 관리 → 입고품질관리 → 프로젝트 관리 → 시험 및 품질 보증 → 지식 관리
  - 기존 "도구" 2×2 그리드 해체 → 각 영역 독립 섹션화
  - "프로젝트 관리" 섹션에 입찰 프로젝트 + 수주 프로젝트 하위 링크 신설
  - 수주 프로젝트 href: `/projects` → `/projects/awarded?create=1`
- DIRECTOR 전용 권한 맵 칩 라벨 갱신: Q-Cost → 품질비용관리, 공급망관리 → 입고품질관리, QKM → 지식 관리, 시험장 → 시험·품질보증, 입찰검토 → 입찰프로젝트
- 입찰 프로젝트 링크 색상: `bg-slate-900`(다크) → `bg-indigo-50`(라이트) — 다른 링크와 시각적 균형

### 4. `app/(dashboard)/projects/CreateProjectButton.tsx` (수정)
- `autoOpen?: boolean` prop 추가
- `useEffect`로 마운트 시 `handleOpen()` 자동 호출 (deps: `[autoOpen]`, eslint-disable 주석 처리)

### 5. `app/(dashboard)/projects/awarded/page.tsx` (수정)
- `searchParams: Promise<Record<string, string>>` 파라미터 추가 (Next.js 15 App Router 방식)
- `params.create === "1"` 감지 → `autoOpen={true}` 전달

---

## 검수 요청 항목

### A. header.tsx titles 맵 완전성
**위치**: `components/layout/header.tsx`
**내용**: sidebar.tsx의 모든 href에 대응하는 헤더 타이틀이 titles 맵에 누락 없이 존재하는지 확인. 특히 신규 추가된 `/assets`, `/projects` 경로 포함 여부
**리스크**: 해당 경로 진입 시 헤더가 빈 문자열이나 이전 이름으로 표시될 수 있음

### B. autoOpen useEffect 의존성 처리
**위치**: `app/(dashboard)/projects/CreateProjectButton.tsx` — `useEffect` 블록
**내용**: `useEffect(() => { if (autoOpen) handleOpen() }, [autoOpen])` 에서 `handleOpen`이 deps에 없고 `eslint-disable` 주석으로 무시. `handleOpen`은 상태 초기화만 수행하므로 deps 누락이 실질적 버그로 이어지지 않는지 확인
**리스크**: `handleOpen` 내부에서 참조하는 클로저 변수가 stale해질 경우 모달 초기화 오동작 가능

### C. searchParams Promise await 처리
**위치**: `app/(dashboard)/projects/awarded/page.tsx`
**내용**: Next.js 15에서 `searchParams`가 `Promise`로 변경됨. `const params = await searchParams` 처리가 올바른지, 빌드·런타임에서 타입 오류 없이 작동하는지 확인
**리스크**: 잘못된 타입 선언 시 런타임에서 `params.create` 접근 실패 가능

### D. ?create=1 URL 잔류 UX 이슈
**위치**: `app/(dashboard)/projects/CreateProjectButton.tsx`, `awarded/page.tsx`
**내용**: 사용자가 `/projects/awarded?create=1` 진입 후 모달을 닫고 뒤로가기 없이 페이지에 머물거나 새로고침 시 모달이 재오픈되는지 확인
**리스크**: 새로고침 시 모달 재오픈으로 의도치 않은 UX 발생 가능. URL에서 `create` 파라미터 제거 처리가 필요한지 판단 요청

### E. 퀵 링크 섹션 누락 여부
**위치**: `app/(dashboard)/MainDashboard.tsx` L703–L820 퀵 링크 블록
**내용**: 현재 퀵 링크에 포함된 섹션(품질 비용 관리·자산 관리·입고품질관리·프로젝트 관리·시험 및 품질 보증·지식 관리)이 실무자에게 필요한 모든 영역을 커버하는지 확인. 외부 정보(`/intelligence`)·인사면담(`/hr`) 링크 제외가 적절한지
**리스크**: 실무자가 자주 쓰는 경로가 빠져 있으면 접근성 저하

---

## 빌드/테스트 상태

```
npm run build → ✓ Compiled successfully (Turbopack, 5.0s)
                ✓ Generating static pages (56/56)
                Warning만 존재, Error 없음
```

빌드 경고(unused vars) 다수 존재하나 기존 파일 경고이며 이번 변경과 무관.

---

## 원하는 판정

- A~E 각 항목에 대해 Critical / High / Medium / Low / OK 판정
- 전체에 대해 **승인 / 조건부 승인 / 보류** 판정
- D항목(URL 잔류 UX)은 즉시 수정 필요 여부를 명확히 판단해 줄 것
