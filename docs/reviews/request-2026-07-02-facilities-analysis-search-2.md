# Codex 검수 요청 — 시험/분석 관리 검색 (E2E-1 #2)

**요청일**: 2026-07-02
**요청자**: Claude Code (PM)
**리뷰 유형**: Implementation Review
**선행 문서**: 없음

---

## 변경 개요

E2E-1 UX 피드백 #2 "시험/분석 관리에 검색 기능이 없다"에 대한 대응이다. `/facilities/analysis` 페이지의 시험 계획 목록에 상태 필터(칩)만 있고 텍스트 검색이 없어 항목이 많아질수록 원하는 시험 계획을 찾기 어렵다는 실사용 피드백을 반영했다. 기존에 동일한 필요성으로 구현된 회의록 검색(`meetings/page.tsx`)·지식현황 검색(`knowledge/status`) 패턴을 그대로 따라, 클라이언트 사이드 `useState` + `Array.filter()` 방식으로 구현했다. 서버 API·DB 변경 없음.

**설계 판단 (Dennis 승인 완료)**:
- 검색 대상 필드: **프로젝트명(`projectName`) + 시료 설명(`sampleDescription`) 2필드** — 실무자가 가장 자주 찾는 "어떤 프로젝트의 어떤 샘플" 조합에 대응. 설비명·담당자명은 이번 범위 제외(Dennis 선택).
- 검색 방식: 대소문자 무시 부분 일치(`toLowerCase().includes()`), 기존 상태 필터와 AND 조합
- 실패 시 동작: 해당 없음 (서버 호출 없는 순수 클라이언트 필터, 실패 케이스 없음)
- 외부 API 전송 데이터 범위: 변경 없음 (신규 API 없음)

---

## 변경된 파일

### 1. `components/facilities/facilities-view.tsx` (수정)
- `Search` 아이콘 import 추가 (lucide-react)
- `search` state 신규 추가
- `filtered` 계산 로직을 `byStatus` → `search` 2단계로 분리 (상태 필터 → 텍스트 검색 순차 적용)
- 헤더와 등록 모달 사이에 검색 입력창 UI 추가 (placeholder: "프로젝트명, 시료 설명으로 검색")
- 목록 빈 상태 메시지에 검색 무결과 케이스("검색 결과가 없습니다.") 우선순위 추가

### 2. `scripts/verify-facilities-search-2.mjs` (신규)
- Playwright 브라우저 검증 스크립트. 자격증명은 `.env.local`(gitignore) `WITNESS_VERIFY_*` env로만 주입
- 실 DB의 `/api/test-plans` 조회 결과에서 실제 프로젝트명을 동적으로 가져와 검색어로 사용 (하드코딩 없음)

---

## 검수 요청 항목

### FS-01. 필터 조합 로직 정확성
**위치**: `components/facilities/facilities-view.tsx` — `byStatus`/`filtered` 계산부
**내용**: 상태 필터와 텍스트 검색이 AND로 정확히 조합되는지, `search`가 빈 문자열일 때 기존 상태 필터 동작이 그대로 보존되는지
**리스크**: 조합 순서 오류 시 상태 필터 칩의 카운트(`counts`)와 실제 표시 목록이 불일치할 수 있음

### FS-02. null/undefined 안전성
**위치**: `filtered` 계산부 — `t.projectName.toLowerCase()`, `t.sampleDescription.toLowerCase()`
**내용**: `types/test.ts`에서 두 필드 모두 non-nullable `string`으로 확인했으나(`projectName: string`, `sampleDescription: string`), DB에 과거 데이터로 빈 문자열 외 실제 null이 남아있을 가능성이 없는지 재확인 필요
**리스크**: null 데이터 존재 시 `.toLowerCase()` 런타임 에러로 페이지 크래시

### FS-03. 검증 스크립트의 데이터 의존성
**위치**: `scripts/verify-facilities-search-2.mjs`
**내용**: `/api/test-plans` 응답이 빈 배열일 때 `throw`로 즉시 실패 처리되는데, 이것이 오탐(false negative)인지 실제 결함 신호인지 스크립트 상에서 구분 가능한지
**리스크**: 데이터가 일시적으로 없을 때 검증 실패가 기능 결함처럼 보고될 수 있음

---

## 빌드/테스트 상태

```
npm run build → 통과 (타입 오류 0)
node scripts/verify-facilities-search-2.mjs (localhost:3000, WITNESS_VERIFY 계정) → 5/5 통과
  V1 검색창 렌더링 ✅ / V2 프로젝트명 검색 매칭 ✅ / V3 무결과 빈 상태 ✅ / V4 검색어 삭제 복구 ✅
npm test → 미실행 (기존 vitest 스위트에 이 컴포넌트 대상 테스트 없음, 신규 유닛테스트 미작성)
```

---

## 원하는 판정

- 각 항목에 대해 Critical / High / Medium / Low / OK 판정
- 전체에 대해 승인 / 조건부 승인 / 보류 판정
