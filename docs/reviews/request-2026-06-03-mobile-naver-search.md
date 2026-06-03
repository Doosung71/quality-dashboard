# Codex 검수 요청 — 모바일 반응형 전면 수정 + Naver Search API 통합

**요청일**: 2026-06-03  
**요청자**: Claude Code (클로이)  
**리뷰 유형**: Implementation Review  
**선행 문서**: `docs/research/2026-06-03_detail_pages_improvement.md`

---

## 변경 개요

앤(Antigravity)의 리서치 문서를 기반으로 모바일 환경에서 발생하던 레이아웃 깨짐 문제를 전면 수정했다.
Tailwind v4의 `hidden lg:flex` 동적 클래스 조합이 Antigravity IDE 환경에서 미작동하는 버그를 발견하고 `max-lg:hidden` 패턴으로 교체했다.
또한 Vercel 서버 IP에서 DuckDuckGo HTML 스크래핑이 전면 차단됨을 확인하고, 전 프로젝트의 웹 검색 기능을 Naver Search API로 일괄 교체했다.

---

## 변경된 파일

### 1. `lib/naver-search.ts` (신규)
- Naver Search API 공용 유틸 — `naverSearchResults()`, `naverSearchText()` 두 함수 제공
- 뉴스(최신 날짜순) + 웹 결과 병렬 조회, HTML 엔티티 스트리핑
- 환경변수(`NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`) 미설정 시 빈 결과 반환 (에러 없음)
- 타임아웃 7초, AbortController 사용

### 2. `app/api/intelligence/websearch/route.ts` (수정)
- DDG HTML 스크래핑 전체 제거
- `naverSearchResults()` 호출로 교체
- 환경변수 미설정 시 503 + 안내 메시지 반환

### 3. `app/api/knowledge/search/route.ts` (수정)
- `searchWebDuckDuckGo()` 함수 제거
- `naverSearchResults(query, 5)` 호출로 교체
- `WebSearchResult` 타입을 `import type` alias로 교체

### 4. `app/api/tenders/[id]/analyze/route.ts` (수정)
- `searchWebForTender()` 내부 구현 → `naverSearchText(query, 5)` 위임

### 5. `app/api/tenders/[id]/reanalyze/route.ts` (수정)
- 동일하게 `naverSearchText()` 위임

### 6. `app/api/analysis/[id]/requirements/suggest/route.ts` (수정)
- `searchWebForRequirement()` 내부 구현 → `naverSearchText(query, 5)` 위임

### 7. `components/facilities/equipment-table.tsx` (수정)
- `block md:hidden` 모바일 카드 뷰 추가 (900px 고정 테이블 대체)
- `hidden md:block` 데스크톱 테이블 유지
- 노후 설비 카드에도 `animate-neon-alert` 적용 유지

### 8. `components/vendors/vendors-view.tsx` (수정)
- VendorDrawer 임원진 조직도: `grid-cols-3` → `grid-cols-2 sm:grid-cols-3`
- 인원 현황 그리드 동일하게 수정

### 9. `components/claims/claim-detail.tsx` (수정)
- Footer padding: `p-6` → `px-4 py-4 sm:px-6`
- 단계 이동 버튼: `px-0.5 text-center` 추가

### 10. `components/layout/header.tsx` (수정)
- 역할 배지 `hidden sm:block` 제거 → 항상 표시
- 레이블 `hidden md:block` → `hidden lg:block`
- 헤더 `overflow-hidden`, `shrink-0` 추가

### 11. `components/board/board-client.tsx` (수정)
- 패널 전환: `hidden lg:flex` → `flex + max-lg:hidden` 방식으로 교체
- 모바일 "← 목록으로" 뒤로가기 버튼 추가 (`lg:hidden`)

### 12. `app/dashboard/page.tsx` (수정)
- 독립 헤더 우측 nav: 텍스트 `hidden md:flex` 처리
- 아이콘만 표시 (도움말, 피드백), `px-3 md:px-6`

### 13. `app/(dashboard)/board/page.tsx` (수정)
- 관련 페이지 연동

---

## 검수 요청 항목

### R-01. `max-lg:hidden` Tailwind v4 호환성
**위치**: `components/board/board-client.tsx` L519, L611  
**내용**: `max-lg:hidden` 이 Tailwind v4 에서 정상 컴파일되는지, 그리고 `flex flex-col` 과 조합 시 모바일에서 `display: none` 이 올바르게 적용되는지 확인  
**리스크**: Tailwind v4에서 `max-*` variant 지원 범위 확인 필요. CSS 우선순위 충돌 가능성

### R-02. `naverSearchResults()` 병렬 fetch 에러 처리
**위치**: `lib/naver-search.ts` L46-68  
**내용**: `Promise.all([newsRes, webRes])` 에서 둘 중 하나가 throw 할 경우 전체가 실패하는지 확인. 현재 `try/catch` 가 outer에만 있음  
**리스크**: 네이버 API 한쪽(뉴스 or 웹)만 일시 장애 시 전체 검색이 빈 배열 반환될 수 있음

### R-03. `WebSearchResult` 타입 alias 호환성
**위치**: `app/api/knowledge/search/route.ts` L3  
**내용**: `export type WebSearchResult = import("@/lib/naver-search").NaverSearchResult` — 이 패턴이 Next.js App Router 빌드에서 문제 없이 re-export 되는지 확인  
**리스크**: 타입만 re-export할 때 isolatedModules 설정에 따라 빌드 오류 발생 가능

### R-04. equipment-table 모바일 카드 뷰 — 데이터 완전성
**위치**: `components/facilities/equipment-table.tsx` L52-108  
**내용**: 모바일 카드에서 `formatSpec()`, `computeStatus()`, `CURRENT_YEAR` 등 헬퍼가 테이블과 동일하게 적용되는지, 누락 컬럼(제조사, 비고 등)이 의도적으로 생략된 것인지 확인  
**리스크**: 모바일 사용자가 일부 정보(제조사, 비고)를 볼 수 없음 — UX 결정 사항인지 버그인지 판단 필요

### R-05. board-client `showRight` 로직 — 엣지 케이스
**위치**: `components/board/board-client.tsx` L513  
**내용**: `showRight = !!selectedId || showNewPost` — 모바일에서 게시글 선택 후 "목록으로" 버튼 클릭 시 `selectedId = null, showNewPost = false` 로 정상 초기화되는지, 뒤로가기(Android 하드웨어) 시 상태가 꼬이지 않는지 확인  
**리스크**: 모바일 브라우저 history.back()이 React 상태를 초기화하지 않아 UX 혼란 가능

### R-06. Naver API 키 서버사이드 노출 방지
**위치**: `lib/naver-search.ts` L8-9  
**내용**: `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`이 `process.env`에서만 참조되며 클라이언트 번들에 포함되지 않는지 확인. 파일이 `"use client"` 없이 순수 서버 유틸로만 사용되는지 확인  
**리스크**: Next.js에서 lib 파일이 클라이언트 컴포넌트에서 import 될 경우 env 값이 노출됨

### R-07. 입찰검토 헤더 `overflow-hidden` — 콘텐츠 클리핑
**위치**: `app/dashboard/page.tsx` L105  
**내용**: `overflow-hidden` 추가 후 드롭다운 메뉴나 툴팁이 있다면 헤더 영역에서 잘릴 수 있음. 현재 헤더 안에 오버플로우 요소가 없는지 확인  
**리스크**: 향후 헤더에 알림 드롭다운 추가 시 클리핑 문제 발생 가능

---

## 빌드/테스트 상태

```
npm run build → ✅ 성공 (타입 에러 없음, Warning 5개는 기존 미사용 변수)
npx tsc --noEmit → ✅ 출력 없음 (오류 없음)
```

Warning 목록 (기존부터 존재, 이번 변경과 무관):
- `app/(dashboard)/board/page.tsx`: `requireActiveSession` unused
- `components/vendors/vendors-view.tsx`: `idx` unused
- `lib/knowledge.test.ts`: `values` unused
- `lib/permissions.ts`: `_role`, `_section` unused

---

## 원하는 판정

- **R-01 ~ R-07** 각 항목에 대해 Critical / High / Medium / Low / OK 판정
- **전체** 승인 / 조건부 승인 / 보류 판정
- Critical 항목 발생 시 수정 방향 제안 포함 (클로이가 즉시 수정)
