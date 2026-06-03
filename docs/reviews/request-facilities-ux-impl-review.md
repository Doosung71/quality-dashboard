# Codex (코라) 구현 검수 요청 — 시험장·설비 현황 UX 고도화 구현 결과

**요청일**: 2026-05-25  
**요청자**: Claude Code (클로이) (PM)  
**리뷰 유형**: Implementation Review (구현 완료 후 품질 검수)  
**선행 문서**: `docs/reviews/request-facilities-ux-plan-review.md` (조건부 승인 완료)

---

## 변경 개요

시험장·설비 현황 페이지 UX 고도화 4단계 계획을 전부 구현 완료했다.  
Codex (코라) 사전 리뷰(조건부 승인)에서 지적한 M1~M3, L1~L2를 다음과 같이 반영했다.

| Codex (코라) 지적 | 반영 여부 | 처리 내용 |
|-----------|----------|----------|
| M1 DropdownMenuCheckboxItem 없음 | 반영 | 새 패키지 없이 순수 Tailwind + useState로 컬럼 토글 구현 |
| M2 sticky min-width + 배경 처리 | 반영 | `min-w-[900px]`, sticky td에 행 상태별 bg 분기(`bg-red-50` / `bg-white`) |
| M3 Step 3 전 파일 분리 | 반영 | `equipment-table.tsx` 신규 분리 (Step 3 구현과 동시 진행) |
| L1 단일 세그먼트 바 통일 | 반영 | 도트/바 분기 제거, 전 시험장 행 단일 미니 세그먼트 바 |
| L2 A11y aria-label | 반영 | KPI 바, 미니 바, 진행률 바 모두 `role="img"` + `aria-label` 추가 |

---

## 변경된 파일

### 1. `components/facilities/equipment-table.tsx` (신규, 244줄)

- 기존 `facilities-view.tsx` 내 `EquipmentTable` 함수를 독립 파일로 분리
- Step 3 기능 포함:
  - 설비명 컬럼 `sticky left-0 z-20/z-10` 고정
  - 테이블 `min-w-[900px]`
  - 노후 설비 행 `bg-red-50` + hover `bg-red-100`, sticky td도 동일 배경 분기
  - 컬럼 가시성 토글: 기본 숨김(제조사/대수/비고), 토글 버튼으로 개별 켜기
  - 진행률 미니 바에 `role="img"` + `aria-label`

### 2. `components/facilities/facilities-view.tsx` (665줄 → 575줄)

- **Step 1**: `selectedSpaceId` 초기값 → 구미 첫 시험장 ID (lazy init)
- **Step 1**: `handleSiteChange` → 탭 전환 시 새 사이트 첫 시험장 자동 선택
- **Step 2-A**: `KpiCard`에 `bar?: KpiBarSegment[]` prop 추가, "설비 현황" 카드에 4색 세그먼트 바 전달
- **Step 2-B**: `SpaceRow`에 `statusCounts: SpaceStatusCounts` prop 추가, 행 하단 미니 세그먼트 바 렌더링
- **Step 4**: 간트 차트에 월 경계선(`MONTH_GRID_PCTS`) 세로 그리드라인 추가
- **Step 4**: 오늘 기준선 `w-0.5` + `opacity-100`, 첫 번째 시험 행에 날짜 라벨(`MM/DD`) 추가
- `EquipmentTable`, `EquipStatusBadge`, `formatSpec` 제거 (equipment-table.tsx로 이동)

---

## 검수 요청 항목

### C1. equipment-table.tsx — sticky 동작 검증

`sticky left-0`이 `overflow-x-auto` 컨테이너 안에서 올바르게 동작하려면  
부모 체인 어디에도 `overflow: hidden`이 없어야 한다.  
현재 상위 래퍼가 `flex-1 overflow-auto`로 감싸져 있는데, 이 구조에서 sticky가 정상 동작하는지 확인 요청.

추가로, `z-20`(thead sticky th)과 `z-10`(tbody sticky td)의 레이어 순서가  
스크롤 시 th가 td보다 항상 위에 오는지 확인 요청.

### C2. equipment-table.tsx — 컬럼 토글 드롭다운 닫힘 처리

드롭다운을 닫기 위해 `fixed inset-0 z-10` 오버레이를 사용했다.  
이 방식은 드롭다운이 열린 상태에서 다른 버튼(예: 시험장 체크박스)을 클릭하면  
오버레이가 먼저 이벤트를 소비해 원하는 버튼이 동작하지 않을 수 있다.  
실제 사용 시나리오(드롭다운 열린 채 다른 UI 조작)에서 UX 문제가 되는 수준인지 판단 요청.

### C3. facilities-view.tsx — GanttChart 오늘 날짜 라벨

오늘 날짜 라벨(`todayLabel`)을 `idx === 0`인 행에만 렌더링했다.  
간트 차트에서 행이 없거나 첫 번째 설비의 첫 번째 시험이 화면 밖으로 스크롤되면  
라벨이 보이지 않는 문제가 있다.  
헤더 영역에 라벨을 붙이는 것이 더 적절한지, 현재 방식의 한계가 실용적으로 허용 가능한지 의견 요청.

### C4. facilities-view.tsx — 자동 선택 초기값 "gumi" 하드코딩

`useState` lazy init에서 `siteId === "gumi"`를 하드코딩했다.  
`data.sites[0]?.id`를 기준으로 동적으로 처리하는 것이 더 견고한지,  
아니면 이 PoC 규모에서는 하드코딩이 허용 가능한지 판단 요청.

### C5. equipment-table.tsx — `computeStatus` 중복

`computeStatus`와 `CURRENT_YEAR`가 `facilities-view.tsx`와 `equipment-table.tsx` 양쪽에 선언되어 있다.  
현재 규모에서 중복을 허용할지, 아니면 `lib/facilities-utils.ts`로 추출하는 것이 더 적절한지 판단 요청.

---

## 빌드 상태

```
npx tsc --noEmit → 오류 없음
npm run dev     → 정상 실행 (http://localhost:3000/facilities)
```

---

## 원하는 판정

- C1~C5 각 항목에 대해 **Critical / High / Medium / Low / OK** 판정
- 즉시 수정이 필요한 항목이 있다면 구체적인 수정 방향 제시
- 전체 구현에 대해 **승인 / 조건부 승인 / 보류** 판정
