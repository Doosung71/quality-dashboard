# Phase 3 구현 계획 — 협력업체 카드 풀

**작성일**: 2026-05-29  
**작성자**: Claude Code (클로이) (PM)  
**근거 문서**: `PRD.md §2-③`, `docs/research/2026-05-29_ui-implementation-options.md`, `QMS_2.0_MASTER_PLAN.md`  
**목표**: 7월 내 구현 완료

---

## 1. PRD 요구사항

```
③ 협력업체 카드 풀
- 카테고리 탭 3개: 원자재 / 반제품 외주 / 상품 외주
- 등급별 색상 카드
```

---

## 2. Gemini 리서치 반영 결정사항

| 항목 | 결정 | 근거 |
|------|------|------|
| 탭 상태 관리 | URL 쿼리 파라미터 (`?tab=raw`) | 딥링크·뒤로가기 지원, AGENTS.md 규칙과 일치 |
| 카드 레이아웃 | shadcn/ui `<Tabs>` + `<Card>` + CSS Grid | 공식 문서 기반, 추가 패키지 불필요 |
| 등급 뱃지 색상 | A=초록, B=파랑, C=노랑, D=빨강 (신호등 체계) | QMS 2.0 Red/Yellow/Green 원칙 |

---

## 3. 데이터 스키마

```typescript
// types/vendor.ts

export type VendorCategory = "raw" | "semi" | "product";
export type VendorGrade    = "A" | "B" | "C" | "D";

export interface Vendor {
  id: string;
  name: string;
  category: VendorCategory;
  grade: VendorGrade;
  products: string[];        // 납품 품목 (예: ["동 도체", "알루미늄 도체"])
  country: string;           // 원산지/소재지
  since: number;             // 거래 시작 연도
  certifications: string[];  // 보유 인증 (예: ["ISO 9001", "TS 16949"])
  contact?: string;          // 담당자 (가명)
  note?: string;             // 비고
}

export interface VendorsData {
  vendors: Vendor[];
}
```

---

## 4. 시드 데이터 계획 (`data/vendors.json`)

총 18건. 카테고리별 6건씩.

| 카테고리 | 레이블 | 건수 | 등급 분포 |
|---------|--------|------|----------|
| `raw` | 원자재 | 6 | A×2, B×2, C×1, D×1 |
| `semi` | 반제품 외주 | 6 | A×2, B×2, C×1, D×1 |
| `product` | 상품 외주 | 6 | A×1, B×2, C×2, D×1 |

익명화 원칙: 업체명은 가명 처리, 실제 협력업체 정보 사용 금지.

---

## 5. 파일 구조

```
types/
  vendor.ts                          TypeScript 타입

data/
  vendors.json                       시드 데이터 (18건)
  vendors.data.ts                    import + as unknown as VendorsData

components/vendors/
  vendors-view.tsx                   클라이언트 컴포넌트 (탭 + URL 쿼리)
  vendor-card.tsx                    단일 협력업체 카드
  vendor-grade-badge.tsx             A/B/C/D 등급 뱃지

app/(dashboard)/vendors/
  page.tsx                           서버 컴포넌트 + <Suspense>
```

---

## 6. 구현 단계

### Step A — 타입 정의
**파일**: `types/vendor.ts`  
**검증**: TypeScript 컴파일 오류 없음

### Step B — 시드 데이터
**파일**: `data/vendors.json`, `data/vendors.data.ts`  
**검증**: 18건 구조 확인, `as unknown as VendorsData` 패턴 적용

### Step C — 컴포넌트
**파일**: `components/vendors/`

구현 상세:
- `vendor-grade-badge.tsx`: A/B/C/D 색상 뱃지 (신호등 체계)
- `vendor-card.tsx`: 등급 뱃지, 품목, 인증, 거래 연도 표시
- `vendors-view.tsx`:
  - `useSearchParams()` + `<Suspense>` 패턴 (claims-view.tsx와 동일)
  - `?tab=raw|semi|product` URL 쿼리로 탭 상태 관리
  - 탭별 카드 그리드 `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
  - KPI 행: 전체 / 등급별 건수 / D등급 경고 건수

### Step D — 페이지
**파일**: `app/(dashboard)/vendors/page.tsx`  
**검증**: `npm run build` 통과

---

## 7. 코딩 규칙 적용 포인트

- JSON import: `as unknown as VendorsData` (`satisfies` 금지)
- 탭 상태: URL 쿼리 파라미터 (`?tab=`)
- `useSearchParams()` 사용 시: page.tsx에 `<Suspense>` 래퍼
- UI 언어: 한국어 전용

---

## 8. Phase 2 후속 작업 (7월 전 병행 권장)

Gemini 리서치 결과 추가로 도출된 클레임 트래커 개선 항목.

| 항목 | 내용 | 파일 |
|------|------|------|
| sessionStorage 상태 유지 | `useClaimState` 커스텀 훅: sessionStorage + isMounted 패턴으로 새로고침 방어 | `hooks/useClaimState.ts`, `claims-view.tsx` |
| 보고서 생성 버튼 | 클립보드 복사 (`navigator.clipboard.writeText`) + toast 폴백 | `claim-detail.tsx` |

이 두 항목은 Zero Double Work 원칙 구현으로 QMS 2.0 마스터플랜과 직결됨.  
Codex (코라) 리뷰 후 Phase 3와 병행 또는 선행 처리.

---

## 9. Codex (코라) 리뷰 계획

Step D 완료 후 아래 항목으로 검수 요청:

- VendorCategory / VendorGrade 타입 안전성
- URL 쿼리 기반 탭 필터링 로직 정합성
- KPI 계산 로직 (D등급 경고 건수 등)
- `npm run build` 결과 첨부
