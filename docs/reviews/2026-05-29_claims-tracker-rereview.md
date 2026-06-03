# Codex (코라) Review: 클레임 트래커 재검수

**리뷰일**: 2026-05-29
**검수자**: Codex CLI (코라) (리뷰어 겸 품질 책임자)
**대상 영역**: quality-dashboard / Phase 2 고객 클레임 트래커 (1차 보류 → 수정 후 재검수)
**검수 방식**: 코드 및 정적 구조 검토. 파일 수정 없음. 빌드 독립 실행 안 함 (요청서 기재 결과로 확인).

---

## 최종 판정

**조건부 승인**

Critical/High 발견 사항은 없습니다. 1차 보류 사유였던 마스터플랜 삭제, 빌드 미검증, KPI 하드코딩, 데이터 import 패턴, URL 필터, 빈 데이터 KPI 방어는 코드상 해소된 것으로 확인했습니다.

Phase 3 협력업체 카드 풀 진입 가능으로 판단합니다. 단, 아래 Medium 1건은 Phase 3 병행 전 또는 다음 클레임 정리 작업에서 수정 권장입니다.

---

## 검토 대상

- `types/claim.ts`
- `data/claims.json`
- `data/claims.data.ts`
- `app/(dashboard)/claims/page.tsx`
- `components/claims/claims-kpi.tsx`
- `components/claims/claims-view.tsx`
- `components/claims/claims-kanban.tsx`

---

## 발견 사항

### Critical

없음.

### High

없음.

### Medium

#### 1. `closedAt` 역방향 이동 시 잔존 → "이번 달 클로징" KPI 오산

**위치**
- `components/claims/claims-view.tsx:48`
- `components/claims/claims-kpi.tsx:53`

**내용**

Closed → 다른 단계로 역방향 이동해도 `closedAt`이 유지됩니다. 평균 리드타임과 종결률은 `status === "Closed"` 조건이 있어 영향이 제한되지만, "이번 달 클로징"은 `closedAt`만 보고 계산하므로 역방향 이동 후에도 계속 클로징 건수에 포함됩니다.

**권고**

`newStatus !== "Closed"`일 때 `closedAt: undefined`로 제거하거나, `thisMonthClosed` 계산에 `c.status === "Closed"` 조건을 추가하세요.

---

### Low

#### 1. `priority` URL 파라미터 유효성 미검증

**위치**
- `components/claims/claims-view.tsx:21`

**내용**

`priority` 쿼리를 union으로 캐스팅만 하고 유효성 검증은 하지 않습니다. `/claims?priority=BadValue` 같은 직접 진입 시 전체 버튼 선택 상태가 깨지고 결과가 0건처럼 보일 수 있습니다. 허용값 배열로 검증하면 충분합니다.

---

## R1–R3 판정

| 항목 | 판정 | 내용 |
|------|------|------|
| R1. Suspense + Static 빌드 정합성 | OK | `<Suspense>`로 감싼 구조는 적절. `/claims`가 Static으로 표시되는 것도 이상하지 않음. |
| R2. 동기 JSON import 패턴 | OK | `import raw + as unknown as ClaimsData` 패턴으로 기존 파일과 정렬됨. |
| R3. `closedAt` 역방향 이동 처리 | Medium | 위 Medium 항목과 동일. KPI 일부에 잔존 영향 있으므로 수정 권장. |

---

## 반드시 수정할 항목

Critical/High 기준의 필수 수정 항목은 없습니다.

---

## 테스트/검증 제안

1. Closed 카드를 Verification으로 이동 → "이번 달 클로징" KPI가 감소하는지 확인
2. `/claims?priority=BadValue` 직접 진입 → 필터 상태 정상 표시 확인
3. 빈 claims 배열에서 KPI가 `NaN` 없이 표시되는지 확인

---

## 재리뷰 필요 여부

**필수 재리뷰는 불필요합니다.**

Medium 수정 후 선택적 확인만 권장.
