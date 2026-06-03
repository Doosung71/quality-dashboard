# Codex (코라) Plan Review Request — 시험장·설비 현황 UX 고도화 계획

**요청일**: 2026-05-25  
**요청자**: Claude Code (클로이) (PM)  
**리뷰 유형**: Plan Review (구현 전 설계 검토)

---

## 변경 목적

시험장·설비 현황 페이지의 UX/UI를 고도화한다.  
Gemini 리서치(`docs/research/result-facilities-ux-enhancement.md`) 결과를 반영하여 수립한 4단계 계획(`docs/specs/facilities-ux-enhancement-plan.md`)의 기술적 리스크와 구현 가능성을 검토받고자 한다.

---

## 리뷰 대상 문서

- `docs/specs/facilities-ux-enhancement-plan.md` — 전체 고도화 계획
- `components/facilities/facilities-view.tsx` — 현재 구현 파일 (약 665줄, 단일 파일)

---

## 계획 요약

### Step 1 — 자동 선택
- 탭 전환 시 첫 번째 시험장 자동 선택
- `useState` 초기값 변경 + 사이트 전환 핸들러 수정

### Step 2 — KPI 시각화 + 리스트 미니 바
- KPI 카드 하단에 4색 세그먼트 바 (Tailwind flex + overflow-hidden)
- 시험장 리스트 행에 설비 상태 미니 바 (설비 5개 이하: 도트, 초과: 세그먼트 바)

### Step 3 — 설비 테이블 고도화
- 설비명 컬럼 `sticky left-0` 고정
- 컬럼 가시성 토글 드롭다운 (shadcn/ui `DropdownMenuCheckboxItem`)
- 기본 숨김 컬럼: 제조사 / 대수 / 비고
- 노후 설비 행 `bg-red-50` 강조

### Step 4 — 간트 차트 개선
- 월별 세로 그리드라인 추가 (CSS 방식, 라이브러리 없음)
- 오늘 기준선 시각 강화 (굵기, 날짜 라벨)

---

## 실행한 테스트

구현 전 계획 리뷰 단계이므로 테스트 없음.  
현재 `npm run build` 기준 타입 오류 없음.

---

## 특별히 봐야 할 리스크

### R1. 단일 파일 비대화 (현재 665줄)
Step 1~4 추가 후 파일이 800~900줄 이상으로 커질 수 있다.  
→ 컴포넌트 분리가 필요한 시점인지, 어떤 단위로 분리하는 것이 적절한지 검토 요청.

### R2. sticky 컬럼과 테이블 스타일 충돌
`sticky left-0`은 테이블이 `overflow-x-auto` 컨테이너 안에 있을 때만 동작한다.  
현재 `<div className="overflow-x-auto">` 래퍼가 이미 있으나, `bg-white`와 `z-index` 설정이 올바르게 동작하는지 확인이 필요하다.

### R3. 컬럼 가시성 토글 상태 관리
컬럼 토글은 `useState`로 관리 예정.  
`facilities-view.tsx`는 이미 `activeSite`, `selectedSpaceId`, `checkedSpaceIds` 등 여러 상태를 관리하고 있다.  
→ 상태 관리 복잡도 증가가 유지보수에 문제를 주는 수준인지 검토 요청.

### R4. 미니 세그먼트 바 분기 로직
"설비 5개 이하 도트, 초과 세그먼트 바" 분기 기준이 적절한지, 아니면 단일 방식으로 통일하는 것이 더 나은지 의견 요청.

### R5. 접근성 (A11y)
Gemini가 지적한 색약 대응 — 모든 색상 바에 툴팁 또는 aria-label 필요.  
현재 코드에 aria 속성이 거의 없다. 이번 고도화에 포함해야 할 수준인지(MVP 시연용 기준), 혹은 별도 이슈로 분리할지 검토 요청.

---

## 원하는 판정

- 4단계 계획 중 **구현 순서 조정이 필요한 항목**이 있는가?
- **R1 파일 분리**: 지금 해야 하는가, Step 4 완료 후 해야 하는가?
- **R2~R4** 각 리스크의 심각도 판단 (Critical / High / Medium / Low)
- **Step 3 컬럼 토글**: shadcn/ui DataTable 패턴 전면 도입 vs 간단한 useState 토글 중 이 프로젝트 규모에 더 적합한 것은?
- 전체 계획에 대해 **승인 / 조건부 승인 / 보류** 판정
