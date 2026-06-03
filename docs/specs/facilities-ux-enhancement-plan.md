# 시험장·설비 현황 페이지 UX 고도화 계획

**작성일**: 2026-05-25  
**근거**: Gemini 리서치 결과 (`docs/research/result-facilities-ux-enhancement.md`)  
**대상 파일**: `components/facilities/facilities-view.tsx`

---

## 변경 요약 (Gemini 반영 전/후)

| 항목 | 원래 계획 | Gemini 반영 후 변경 |
|------|-----------|---------------------|
| Q4 테이블 | 덜 중요한 컬럼 접기 | **핵심 컬럼 sticky 고정 + 컬럼 가시성 토글**로 변경 (NN/g 권장) |
| Q3 간트 라이브러리 | 검토 대상 | **CSS 그리드라인 우선, 라이브러리는 보류** (PoC 번들 크기 고려) |
| Q2 KPI 바 | shadcn/Tremor 검토 | **Tailwind 직접 구현** (라이브러리 불필요, flex + overflow-hidden) |

---

## 구현 계획 (4단계)

### Step 1 — 자동 선택 (UX 기초)
**목적**: 빈 상태(Blank State) 제거. 진입 즉시 첫 번째 시험장 정보 표시.

**변경 내용**:
- `useState<string | null>(null)` → 초기값을 사이트의 첫 번째 space ID로 설정
- 탭(사이트) 전환 시 새 사이트의 첫 번째 space 자동 선택
- 선택된 행의 Active State 시각적 강조는 이미 구현됨 (blue-50 배경)

**근거**: NN/g Split View Best Practices — Blank State 방지, 인터랙션 비용 감소

---

### Step 2 — 데이터 시각화 강화
**목적**: 숫자만 나열된 KPI 카드와 리스트에 시각적 비율 정보 추가.

#### 2-A. KPI 카드 — 스택형 프로그레스 바
- 설비 현황 카드 하단에 신규/정상/노후/도입예정 비율을 4색 세그먼트 바로 표시
- Tailwind 직접 구현 (`flex h-1.5 overflow-hidden rounded-full`)
- 노후 비율이 높을수록 빨간 세그먼트가 시각적으로 눈에 띄게

```tsx
// 구현 예시
<div className="flex h-1.5 w-full overflow-hidden rounded-full mt-3">
  <div className="bg-blue-400"    style={{ width: `${newPct}%` }} />
  <div className="bg-emerald-400" style={{ width: `${normalPct}%` }} />
  <div className="bg-red-400"     style={{ width: `${agingPct}%` }} />
  <div className="bg-slate-200"   style={{ width: `${plannedPct}%` }} />
</div>
```

#### 2-B. 시험장 리스트 행 — 미니 세그먼트 바
- 각 시험장 행 하단에 해당 시험장 설비 상태 분포를 미니 바로 표시
- 설비 수가 적으면 도트(○) 방식, 많으면 세그먼트 바 방식
- 기준: 설비 5개 이하 → 도트, 초과 → 세그먼트 바

---

### Step 3 — 설비 테이블 고도화
**목적**: 10개 컬럼 테이블의 가독성 개선. 비교 분석 시 설비명이 항상 보이도록.

**변경 내용**:
- 설비명 컬럼(`<th>`, `<td>`) → `sticky left-0 z-10 bg-white` 적용
- 테이블 상단에 컬럼 가시성 토글 드롭다운 추가 (shadcn/ui `DropdownMenuCheckboxItem` 활용)
- 기본 노출 컬럼: 설비명 / 유형 / 규격 / 도입 / 사용연수 / 상태 / 시험 현황
- 기본 숨김 컬럼: 제조사 / 대수 / 비고 (토글로 켤 수 있음)
- 노후 설비 행: `bg-red-50` 배경 강조 추가

**근거**: NN/g Hybrid 접근법 — sticky 고정 + 컬럼 자유 스크롤이 비교에 유리

---

### Step 4 — 간트 차트 개선
**목적**: 날짜 위치 파악을 쉽게, 오늘 기준선을 눈에 띄게.

**변경 내용**:
- 월별 세로 그리드라인: CSS `repeating-linear-gradient` 또는 absolute 레이어 방식으로 추가
- 오늘 기준선: 투명도 제거 (`opacity-60` → `opacity-100`), 굵기 증가 (`w-px` → `w-0.5`), 상단에 날짜 라벨 추가
- `gantt-task-react` 라이브러리 도입은 **보류** (PoC 단계에서 번들 크기 최소화 우선)

---

## 접근성 주의사항 (Gemini 지적)

- 프로그레스 바 색상만으로 상태를 구분하지 않는다
- 모든 색상 바에 툴팁 또는 텍스트 라벨 병행 (색약 사용자 고려)

---

## 구현 순서

```
Step 1 자동 선택 → Step 2-A KPI 바 → Step 2-B 리스트 미니 바
→ Step 3 테이블 sticky + 컬럼 토글 → Step 4 간트 개선
```

전 단계 Codex (코라) 리뷰 후 진행.
