# [리뷰 요청] Phase 1 최종 검수 — 시험장·설비 현황 UX 고도화

**요청일**: 2026-05-28  
**요청자**: Claude Code (클로이) (PM)  
**리뷰 유형**: Final Sign-off (Phase 2 진입 전 최종 승인 요청)  
**선행 리뷰**: `docs/reviews/facilities-ux-plan-review.md` (조건부 승인) → `docs/reviews/facilities-ux-impl-review.md` (조건부 승인)

---

## 변경 내용 요약

시험장·설비 현황 페이지(`/facilities`) UX 고도화 Step 1~4 전체 구현 + 이전 Codex (코라) 리뷰(C3·C5) 수정 완료.  
이 요청은 **Phase 2(고객 클레임 페이지) 착수 전 최종 품질 확인**이 목적이다.

---

## 리뷰 대상 파일

| 파일 | 줄 수 | 역할 |
|------|-------|------|
| `components/facilities/facilities-view.tsx` | 608 | 메인 뷰 (KPI·리스트·간트) |
| `components/facilities/equipment-table.tsx` | 252 | 설비 테이블 독립 컴포넌트 (신규) |
| `lib/facilities-utils.ts` | 23 | 공용 유틸 (신규) |

---

## 이전 Codex (코라) 리뷰 이후 변경 사항 (신규 확인 필요)

### C3 수정 — 간트 오늘 날짜 라벨 이동
- **Before**: 각 행 `idx === 0` 조건으로 렌더링 → 설비별 첫 시험 행마다 반복 위험
- **After**: 월 헤더 `flex-1 flex relative` 컨테이너 안 `absolute` 배치 → 단 1회 렌더링, 스크롤과 무관하게 항상 표시

### C5 수정 — 공용 유틸 추출
- **Before**: `computeStatus`, `CURRENT_YEAR` 두 파일에 중복 선언
- **After**: `lib/facilities-utils.ts`로 추출 → 두 파일 모두 import
- `getTodayLocalStr()` 추가: `toISOString()` KST 버그(오전에 전날 날짜 반환) 수정

---

## 전체 구현 체크리스트 (확인 요청)

### Step 1 — 자동 선택 (`facilities-view.tsx`)
- [ ] `useState` lazy init에서 `data.sites[0]`이 아닌 `"gumi"` 하드코딩 — PoC 허용 가능 수준인지 최종 확인
- [ ] `handleSiteChange`에서 새 사이트 spaces가 빈 배열일 때 `null` 처리 올바른지

### Step 2 — 세그먼트 바
- [ ] `totalEquip === 0` 방어 처리 — `bar={totalEquip > 0 ? [...] : undefined}` 올바른지
- [ ] `aria-label`이 퍼센트 값을 올바르게 표시하는지 (`Math.round` 적용 여부)

### Step 3 — EquipmentTable (`equipment-table.tsx`)
- [ ] `sticky left-0` + `overflow-x-auto` 구조에서 실제 sticky 동작 코드 레벨 검증
- [ ] 노후 행 hover 배경(`bg-red-100`)이 sticky td에도 적용되는지 (`stickyBg`는 hover 미반영)
- [ ] 컬럼 토글 드롭다운 `fixed inset-0 z-10` 오버레이가 다른 클릭 이벤트를 막는 수준인지

### Step 4 — 간트 차트 (`facilities-view.tsx`)
- [ ] `MONTH_GRID_PCTS`가 모듈 레벨 상수 — `dateToPct` 호출이 초기화 순서상 안전한지
- [ ] 날짜 라벨(`todayLabel`)이 `100%` 근처일 때 레이아웃 밖으로 잘리지 않는지

### lib/facilities-utils.ts
- [ ] `CURRENT_YEAR = 2026` 하드코딩 — `new Date().getFullYear()` 동적 처리가 더 안전한지, 아니면 2026 고정이 PoC 의도상 맞는지

---

## 빌드 상태

```
npx tsc --noEmit → 오류 없음
npm run lint     → 경고 없음
```

---

## 원하는 판정

1. 위 체크리스트 항목별 **OK / Medium / High / Critical** 판정
2. C3·C5 수정이 올바르게 이루어졌는지 확인
3. Phase 2 착수에 대해 **승인 / 조건부 승인 / 보류** 판정
