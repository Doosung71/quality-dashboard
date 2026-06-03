# Codex (코라) Plan Review — 시험장·설비 현황 UX 고도화 계획

**리뷰일**: 2026-05-25  
**리뷰 유형**: Plan Review (구현 전 설계 검토)  
**요청 문서**: `docs/reviews/request-facilities-ux-plan-review.md`  
**대상 계획**: `docs/specs/facilities-ux-enhancement-plan.md`  
**대상 구현**: `components/facilities/facilities-view.tsx`

---

## 최종 판정

**조건부 승인 / COMMENT**

전체 계획의 방향은 적절하다. 다만 Step 3의 컬럼 토글 구현 전제와 sticky 컬럼 배경 처리, 파일 분리 시점은 조정이 필요하다.

- Critical / High: 없음
- Architectural Status: WATCH
- 검증 범위: 문서와 현재 구현 대조
- 미실행 검증: `npm run build`

---

## Medium

### 1. 컬럼 토글 구현 전제가 현재 코드베이스와 맞지 않음

**위치**
- `docs/specs/facilities-ux-enhancement-plan.md`
- `components/ui/button.tsx`
- `package.json`

**내용**

계획서는 `DropdownMenuCheckboxItem` 사용을 전제로 하지만, 현재 `components/ui`에는 `button.tsx`만 있고 dropdown 관련 shadcn/ui 컴포넌트가 없다. `package.json`에도 Radix dropdown 계열 의존성이 없다.

**리스크**

Step 3 구현 중 새 패키지 설치나 shadcn 컴포넌트 추가가 필요해질 수 있다. 프로젝트 보안 원칙상 새 패키지 설치는 사용자 승인 대상이다.

**권장**

PoC 범위에서는 shadcn DataTable 패턴 전면 도입보다 간단한 `useState` 기반 컬럼 토글이 적합하다. 새 패키지를 추가하지 않는 방식으로 구현하거나, 패키지 추가가 필요하면 구현 전에 사용자 승인을 받는다.

---

### 2. sticky 컬럼은 가능하지만 배경과 폭 제약을 명시해야 함

**위치**
- `components/facilities/facilities-view.tsx`

**내용**

현재 설비 테이블은 `overflow-x-auto` 래퍼가 있으므로 sticky 컬럼 적용 자체는 가능하다. 다만 테이블에 명시적인 `min-w`가 없고, 계획의 `bg-white`는 노후 행 `bg-red-50` 및 hover 배경과 충돌할 수 있다.

**리스크**

컬럼 토글 후 테이블 폭이 줄면 sticky 효과가 체감되지 않거나, 첫 번째 컬럼만 배경이 끊겨 보일 수 있다. `th`와 `td`의 `z-index`가 같으면 헤더와 본문 sticky 셀이 겹치는 상황도 생길 수 있다.

**권장**

- `table` 또는 내부 래퍼에 `min-w-[900px]` 계열 폭을 둔다.
- sticky `th`는 `z-20 bg-slate-50`, sticky `td`는 행 상태별 배경을 명시한다.
- 노후 행, hover 행, selected 상태가 생길 경우 첫 번째 sticky 셀에도 같은 배경 정책을 적용한다.

---

### 3. 파일 분리는 Step 4 이후가 아니라 Step 3 전에 하는 것이 적절함

**위치**
- `components/facilities/facilities-view.tsx`

**내용**

현재 파일은 664줄이며 이미 `KpiCard`, `SpaceRow`, `EquipmentTable`, `GanttChart`로 내부 컴포넌트가 나뉘어 있다. Step 1~2는 기존 구조 안에서 처리 가능하지만, Step 3은 컬럼 정의, 가시성 상태, 셀 렌더링 정책을 추가하므로 테이블 컴포넌트 복잡도가 크게 증가한다.

**권장**

Step 3 시작 전에 `EquipmentTable`을 별도 파일로 분리한다. Step 4 시작 전에는 `GanttChart`도 별도 파일로 분리하는 것이 좋다.

예상 분리 단위:

- `components/facilities/equipment-table.tsx`
- `components/facilities/gantt-chart.tsx`
- 필요 시 `components/facilities/status-badges.tsx`

---

## Low

### 1. 미니 바의 5개 기준은 임의성이 있음

**위치**
- `docs/specs/facilities-ux-enhancement-plan.md`

**내용**

설비 5개 이하에서는 도트, 초과에서는 세그먼트 바로 표시하는 기준은 치명적 문제는 아니지만, 행마다 표현 방식이 달라져 스캔성이 떨어질 수 있다.

**권장**

시험장 리스트 행에서는 단일 미니 세그먼트 바로 통일하고, 이미 표시 중인 `설비 N개 / 노후 N` 텍스트로 정확한 수량을 보완한다.

---

### 2. 접근성은 별도 이슈로 미루지 말고 최소 기준을 포함해야 함

**위치**
- `docs/specs/facilities-ux-enhancement-plan.md`
- `components/facilities/facilities-view.tsx`

**내용**

색상 바를 새로 추가하는 순간 색상만으로 상태를 구분하지 않도록 해야 한다. MVP 시연용이라도 색약 대응과 스크린리더용 요약은 최소 범위에 포함하는 것이 맞다.

**권장**

- KPI 세그먼트 바와 리스트 미니 바에 `aria-label` 또는 `sr-only` 요약 텍스트를 추가한다.
- 장식용 세그먼트 자체는 필요 시 `aria-hidden` 처리한다.
- 툴팁만으로 접근성을 해결하지 않는다.

---

## R1-R5 판정

| 항목 | 심각도 | 판정 |
|------|--------|------|
| R1. 단일 파일 비대화 | Medium | Step 3 전에 `EquipmentTable`, Step 4 전에 `GanttChart` 분리 권장 |
| R2. sticky 컬럼과 테이블 스타일 충돌 | Medium | 구현 가능하나 `min-w`, 배경, `z-index` 명시 필요 |
| R3. 컬럼 가시성 토글 상태 관리 | Low | `EquipmentTable` 내부 state로 가두면 유지보수 문제 낮음 |
| R4. 미니 세그먼트 바 분기 로직 | Low | 5개 기준보다 단일 미니 세그먼트 바로 통일 권장 |
| R5. 접근성 | Medium | MVP라도 색상 바 추가 범위 안에서 최소 라벨 포함 필요 |

---

## 구현 순서 권장안

```text
Step 1 자동 선택
→ Step 2-A KPI 바
→ Step 2-B 리스트 미니 바
→ EquipmentTable 분리
→ Step 3 테이블 sticky + 컬럼 토글
→ GanttChart 분리
→ Step 4 간트 개선
```

---

## Step 3 구현 방식 판정

현재 프로젝트 규모와 의존성 상태에서는 shadcn/ui DataTable 패턴 전면 도입보다 간단한 `useState` 토글이 더 적합하다.

다만 `DropdownMenuCheckboxItem`을 그대로 쓰려면 관련 컴포넌트와 의존성 추가 여부를 먼저 확인해야 한다. 새 패키지 설치가 필요하면 사용자 승인 후 진행해야 한다.

---

## 결론

계획은 조건부 승인한다.

진행 조건:

1. Step 3 전에 `EquipmentTable` 분리
2. 컬럼 토글은 간단한 로컬 state 방식 우선
3. sticky 컬럼에는 폭, 배경, `z-index` 정책 명시
4. 색상 바에는 최소 접근성 라벨 포함

