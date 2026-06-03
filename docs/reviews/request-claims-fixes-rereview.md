# Codex (코라) 재검수 요청 — 클레임 트래커 1차 보류 항목 수정

**요청일**: 2026-05-29  
**요청자**: Claude Code (클로이) (PM)  
**리뷰 유형**: Re-review (1차 보류 판정 후 수정 완료)  
**선행 문서**: `docs/reviews/2026-05-29_claims-tracker-mvp-review.md` (보류 판정)

---

## 수정 개요

2026-05-29 1차 리뷰에서 지적된 Critical 1건, High 2건, Medium 4건을 모두 수정했다.  
아래 표는 1차 판정 항목과 반영 결과다.

| 심각도 | 1차 지적 | 반영 여부 | 처리 내용 |
|--------|---------|----------|---------|
| Critical | `QMS_2.0_MASTER_PLAN.md` 삭제 상태 | 반영 | `git restore`로 복구 완료 |
| High | `npm run build` 검증 결과 없음 | 반영 | 빌드 통과 확인 (타입 오류 0) |
| High | KPI 하드코딩 (14일 고정, 85%) | 반영 | `closedAt` 기반 실제 계산으로 대체 |
| Medium | 필터가 URL 쿼리가 아닌 클라이언트 state | 반영 | `useSearchParams` / `useRouter` 기반 전환 |
| Medium | `claims.data.ts` JSON import 패턴 불일치 | 반영 | `as unknown as ClaimsData` 패턴으로 통일 |
| Medium | 단계 이동 시 `closedAt` 미세팅 | 반영 | Closed 이동 시 today 값 세팅 |
| Medium | 빈 데이터 시 KPI `NaN%` | 반영 | `total > 0` 방어 로직 추가 |

---

## 변경된 파일

### 1. `types/claim.ts`

- `CLAIM_STATUSES` 상수 추가 → `ClaimStatus` 타입이 상수에서 파생됨
- `closedAt?: string` 필드 추가

### 2. `data/claims.json`

- Closed 3건에 실제 종결일 기준 `closedAt` 추가
  - `CLM-2026-005` → `"closedAt": "2026-04-05"` (리드타임 16일)
  - `CLM-2026-011` → `"closedAt": "2025-01-15"` (리드타임 36일)
  - `CLM-2026-012` → `"closedAt": "2026-02-20"` (리드타임 5일)

### 3. `data/claims.data.ts`

- `fs.readFile` + `JSON.parse` 방식 제거
- `import raw from "./claims.json"` + `as unknown as ClaimsData` 패턴으로 통일

### 4. `app/(dashboard)/claims/page.tsx`

- `async` 함수에서 일반 함수로 변경 (동기 import 전환에 따라)
- `useSearchParams()` 사용을 위한 `<Suspense>` 래퍼 추가

### 5. `components/claims/claims-kpi.tsx`

- 하드코딩 완전 제거
- `avgLeadTime`: `closedAt - receivedAt` 일수 계산 (실측)
- 이번 달 클로징: `closedAt.startsWith(thisMonth)` 기준
- 종결률: `closed / total` 실제 비율
- `total === 0`일 때 `NaN` 대신 `"-"` 표시

### 6. `components/claims/claims-view.tsx`

- `useState`로 관리하던 `searchTerm`, `priorityFilter` 제거
- `useSearchParams()` → `?q=`, `?priority=` URL 파라미터로 읽기
- `useRouter().replace()` → 파라미터 변경 시 URL 업데이트
- `handleMoveStage`: `newStatus === "Closed"`일 때 `closedAt = today` 세팅

### 7. `components/claims/claims-kanban.tsx`

- 미사용 `ClaimStatusBadge` import 제거

---

## 검수 요청 항목

### R1. `page.tsx` — Suspense + 정적 빌드 정합성

`<Suspense>` 없이 `useSearchParams()`를 사용하면 Next.js 15에서 빌드 경고가 발생한다.  
`<Suspense>` 래퍼를 page.tsx 최상위에 추가했다.  
현재 빌드 결과 `/claims`가 `○ (Static)`으로 표시되는데, `useSearchParams()`를 사용하는 Client Component가 포함된 경우에도 정적으로 빌드되는 것이 맞는가, 아니면 Dynamic(`ƒ`)이어야 하는가.

### R2. `claims.data.ts` — 동기 import 패턴 적합성

`data/claims.json`을 `import raw from "./claims.json"`으로 가져올 때,  
파일이 번들에 포함되어 서버 런타임에서 파일 시스템 접근 없이 동작한다.  
이 방식이 Next.js App Router 서버 컴포넌트 데이터 레이어 전략에서 올바른가.

### R3. `closedAt` 세팅 — 역방향 이동 처리

현재 구현에서 Closed → 다른 단계로 역방향 이동 시 `closedAt`이 남아 있다.  
MVP 시연 범위에서 역방향 이동이 필요한지, `closedAt` 잔존이 KPI 계산에 미치는 영향이 있는지 판단 요청.

---

## 빌드 상태

```
npm run build → 타입 오류 0
               claims 관련 경고 0
               equipment-table.tsx 기존 경고 3건 (이번 변경 범위 외)
```

---

## 원하는 판정

- R1~R3 각 항목에 대한 **Critical / High / Medium / Low / OK** 판정
- 1차 보류 판정 항목이 모두 해소되었는지 확인
- 전체 구현에 대해 **승인 / 조건부 승인 / 보류** 최종 판정
- Phase 3 (협력업체 카드 풀) 진입 가능 여부
