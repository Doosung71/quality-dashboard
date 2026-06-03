# Codex (코라) Implementation Review — 시험장·설비 현황 UX 고도화 구현 결과

**리뷰일**: 2026-05-25  
**리뷰 유형**: Implementation Review (구현 완료 후 품질 검수)  
**요청 문서**: `docs/reviews/request-facilities-ux-impl-review.md`  
**대상 구현**:
- `components/facilities/facilities-view.tsx`
- `components/facilities/equipment-table.tsx`
- `data/tests.json`
- `types/test.ts`

---

## 최종 판정

**조건부 승인 / COMMENT**

Critical / High 수준의 차단 이슈는 발견하지 못했다. 다만 간트 오늘 라벨 구현은 실제 코드가 요청서 설명과 다르게 동작하며, 한국 시간 기준 날짜 오차 가능성도 있어 수정 후 진행하는 것이 좋다.

---

## 검증 결과

- `npx tsc --noEmit`: 통과
- `npm run lint`: 통과
- `npm run build`: 사용자 중단으로 완료 확인 못 함
- 브라우저 자동화 검증: Playwright 미설치, Browser 자동화 도구 미노출로 미수행
- 검수 방식: 코드 및 diff 기반 정적 검수

---

## Medium

### 1. 간트 오늘 날짜 라벨이 설비 그룹마다 반복되고, 한국 시간 오전에는 날짜가 하루 어긋날 수 있음

**위치**
- `components/facilities/facilities-view.tsx`

**관련 코드**
- `todayStr = new Date().toISOString().slice(0, 10)`
- `{idx === 0 && (... todayLabel ...)}`

**내용**

요청서에는 오늘 날짜 라벨이 `idx === 0`인 첫 번째 행에만 렌더링된다고 되어 있으나, 실제 코드는 `equipsWithTests.map(... eqTests.map((t, idx) => ...))` 구조다. 따라서 `idx === 0`은 전체 첫 행이 아니라 각 설비별 첫 시험 행을 의미한다.

그 결과 오늘 날짜 라벨이 설비 그룹마다 반복 표시될 수 있다. 또한 `new Date().toISOString()`은 UTC 날짜를 사용하므로 한국 시간 오전 00:00~08:59에는 화면의 오늘 날짜가 전날로 계산될 수 있다.

**리스크**

간트 차트의 기준선 라벨이 중복되어 시각적으로 어수선해지고, 시연 시 실제 날짜와 다른 라벨이 표시될 수 있다.

**권장 수정**

오늘 기준선과 날짜 라벨은 행 내부가 아니라 차트 본문 또는 월 헤더의 단일 오버레이로 렌더링한다. 날짜 계산은 로컬 날짜 기준 헬퍼를 사용한다.

예시 방향:

```tsx
function getLocalDateString(date = new Date()) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
```

---

### 2. `computeStatus` 중복은 현재는 동작하지만 품질 규칙상 추출하는 편이 안전함

**위치**
- `components/facilities/facilities-view.tsx`
- `components/facilities/equipment-table.tsx`

**내용**

`CURRENT_YEAR`와 `computeStatus`가 두 파일에 각각 선언되어 있다. 현재 구현은 같은 기준을 쓰므로 즉시 버그는 아니지만, 설비 상태 계산은 프로젝트 코딩 규칙에 명시된 핵심 도메인 규칙이다.

**리스크**

향후 기준 연도 또는 노후/정상 기준이 바뀔 때 한쪽만 수정되어 KPI, 리스트, 테이블의 상태가 서로 달라질 수 있다.

**권장 수정**

`lib/facility-utils.ts` 또는 `lib/facilities-utils.ts`로 `CURRENT_YEAR`, `computeStatus`, 필요 시 `ComputedStatus`를 추출해 두 컴포넌트가 같은 함수를 import하도록 한다.

---

## Low

### 1. sticky 컬럼 구조는 대체로 적절하나 hover 배경 일관성이 약함

**위치**
- `components/facilities/equipment-table.tsx`

**내용**

`overflow-x-auto`, `table min-w-[900px]`, `thead th z-20`, `tbody td z-10` 구성은 sticky 컬럼의 기본 요건을 충족한다. 상위 상세 패널의 `flex-1 overflow-auto`는 세로 스크롤 컨테이너 역할이며, 현재 코드만 보면 sticky left 동작을 차단하는 구조로 보이지 않는다.

다만 sticky `td` 배경은 `bg-red-50` 또는 `bg-white`로 고정되어 있어 행 hover 시 첫 번째 sticky 셀만 hover 배경이 따라가지 않는다.

**권장 수정**

시각 완성도를 높이려면 row hover 시 sticky 셀에도 같은 hover 배경이 적용되도록 `group` 패턴을 사용한다.

---

### 2. 컬럼 토글 닫힘 오버레이는 일반적인 방식이나, 클릭 1회가 닫힘 전용으로 소비됨

**위치**
- `components/facilities/equipment-table.tsx`

**내용**

`fixed inset-0 z-10` 오버레이와 `absolute z-20` 메뉴 조합은 메뉴 외부 클릭으로 닫는 일반적인 구현이다. 메뉴가 열려 있을 때 다른 UI를 클릭하면 첫 클릭은 오버레이가 소비하고 메뉴만 닫힌다.

**판정**

이 동작은 드롭다운 UI에서 허용 가능한 수준이다. 현재 PoC에서는 보류 없이 승인 가능하다.

**개선 선택지**

더 정교하게 처리하려면 focus/blur 기반 닫힘, Escape 키 처리, 또는 기존 headless menu 컴포넌트 도입을 검토한다. 단, 새 패키지 추가는 사용자 승인 대상이다.

---

### 3. 자동 선택의 `gumi` 하드코딩은 PoC에서는 허용 가능하나 쉽게 개선 가능함

**위치**
- `components/facilities/facilities-view.tsx`

**내용**

`activeSite`와 `selectedSpaceId` 초기값이 모두 `gumi`에 묶여 있다. 현재 PoC 데이터가 구미·동해 고정이라면 동작상 문제는 낮다.

**권장 수정**

데이터 레이어 전환이나 사이트 순서 변경을 고려하면 `data.sites[0]?.id` 기준으로 초기화하는 편이 더 견고하다. 수정 난이도도 낮으므로 다음 정리 작업에 포함하는 것을 권장한다.

---

### 4. 접근성 라벨은 추가됐지만 일부 라벨은 더 구체화할 여지가 있음

**위치**
- `components/facilities/facilities-view.tsx`
- `components/facilities/equipment-table.tsx`

**내용**

KPI 바, 시험장 미니 바, 진행률 바에 `role="img"`와 `aria-label`을 추가한 것은 사전 리뷰 지적을 충족한다. 다만 시험장 체크 버튼의 `aria-label="시험 현황 필터"`는 모든 행에서 동일하다.

**권장 수정**

`aria-label={`${space.name} 시험 현황 필터`}`처럼 대상명을 포함하면 스크린리더 사용자가 행을 구분하기 쉽다.

---

## C1-C5 판정

| 항목 | 판정 | 근거 |
|------|------|------|
| C1 sticky 동작 | Low | 구조는 적절함. `z-20`/`z-10` 순서도 타당. 단, hover 배경 불일치 개선 여지 있음 |
| C2 컬럼 토글 닫힘 | OK | 외부 클릭 1회가 닫힘으로 소비되는 것은 일반적 드롭다운 UX 범위 |
| C3 간트 날짜 라벨 | Medium | 실제 구현은 설비 그룹마다 라벨 반복. UTC 날짜 계산으로 한국 시간 오전 날짜 오차 가능 |
| C4 `gumi` 하드코딩 | Low | PoC 고정 데이터에서는 허용 가능. `data.sites[0]` 기반으로 쉽게 개선 가능 |
| C5 `computeStatus` 중복 | Medium | 핵심 도메인 규칙이라 drift 방지를 위해 `lib/` 추출 권장 |

---

## 즉시 수정 권장 항목

1. 간트 오늘 기준선/라벨을 행 내부가 아닌 차트 단일 오버레이 또는 헤더 레이어로 이동
2. 날짜 계산을 UTC `toISOString()`이 아닌 로컬 날짜 기준으로 변경
3. `computeStatus`와 `CURRENT_YEAR`를 공용 유틸로 추출

---

## 결론

구현은 전반적으로 사전 리뷰 조건을 반영했다. `tsc`와 `lint`도 통과했다.

다만 간트 오늘 라벨은 시연 화면에서 바로 눈에 띌 수 있는 UX 결함이므로 수정 후 최종 승인하는 것이 좋다. `gumi` 하드코딩과 sticky hover 배경은 차단 이슈는 아니며 후속 정리로 처리 가능하다.

