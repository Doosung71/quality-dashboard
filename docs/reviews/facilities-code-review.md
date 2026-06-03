# Codex (코라) 검수 보고서: 시설·설비 현황 컴포넌트

**검수일**: 2026-05-28
**검수자**: Codex CLI (코라) (품질 감독관)
**대상**: `components/facilities/` 및 `lib/facilities-utils.ts`

---

## 1. 리팩토링 권장 사항 (Refactoring Points)

### A. 배지 컴포넌트 중복 제거 (High)
- **현황**: `TestStatusBadge`, `TypeChip`, `TestCategoryChip` 등이 `facilities-view.tsx`와 `equipment-table.tsx` 양쪽에 중복 선언되어 있음.
- **제안**: `components/facilities/badges.tsx`로 추출하여 공용으로 사용. 유지보수 효율성 증대.

### B. 하드코딩된 초기 상태 개선 (Medium)
- **현황**: `FacilitiesView`에서 초기 `activeSite`가 `"gumi"`로 하드코딩되어 있음.
- **제안**: `data.sites[0].id`를 사용하여 데이터 기반으로 초기화되도록 수정.

### C. 비즈니스 로직 분리 (Medium)
- **현황**: `FacilitiesView` 내부에서 KPI 계산, 그룹 필터링(인증/양산) 등 복잡한 로직이 인라인으로 존재.
- **제안**: `useFacilitiesData`와 같은 커스텀 훅을 만들어 로직을 캡슐화하고 뷰 컴포넌트는 렌더링에만 집중하도록 분리.

---

## 2. 잠재적 이슈 및 개선점 (Potential Issues)

### A. 접근성(A11y) 보완
- **현황**: `SpaceRow`의 체크박스가 커스텀 `span`으로 구현되어 있어 스크린 리더 지원이 미흡할 수 있음.
- **제안**: `shadcn/ui`의 `Checkbox` 컴포넌트로 교체하거나, `aria-checked` 속성을 명시적으로 추가.

### B. 간트 차트 성능 최적화
- **현황**: 필터링 시 간트 차트 전체가 리렌더링됨.
- **제안**: 현재 PoC 규모(설비 30개)에서는 문제없으나, 데이터 증가 시 `memo`를 통한 최적화 고려 필요.

### C. 타입 확장성
- **현황**: `EquipmentTable`의 컬럼 토글이 특정 3개 키(`maker`, `quantity`, `notes`)에 고정되어 있음.
- **제안**: 컬럼 정의 객체 배열을 만들어 동적으로 토글 버튼을 생성하도록 구조 변경.

---

## 3. 종합 의견
현재 코드는 PoC 목적에 맞게 빠르고 직관적으로 작성되었습니다. 특히 `EquipmentTable`의 Sticky 처리와 `facilities-utils.ts`를 통한 데이터 일관성 확보는 훌륭합니다. Phase 2 진입 전 **'배지 컴포넌트 공용화'** 작업만 선행해도 코드의 깔끔함이 크게 개선될 것으로 보입니다.
