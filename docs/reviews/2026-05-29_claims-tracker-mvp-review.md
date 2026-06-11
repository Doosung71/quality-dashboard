# Codex (코라) Review: Phase 2 고객 클레임 트래커 MVP

**리뷰일**: 2026-05-29  
**검수자**: Codex CLI (코라) (리뷰어 겸 품질 책임자)  
**대상 영역**: `quality-dashboard` / Phase 2 고객 클레임 트래커  
**검수 방식**: 코드 및 정적 구조 검토. 파일 수정 없음.  

---

## 최종 판정

**보류**

Critical/High 이슈가 남아 있어 다음 단계 진행을 승인할 수 없다. 특히 변경 목적에 포함되지 않은 `QMS_2.0_MASTER_PLAN.md` 삭제 상태와 빌드 검증 부재는 팀 프로토콜상 완료 판정 전에 반드시 해소해야 한다.

---

## 검토 대상

- `types/claim.ts`
- `data/claims.json`
- `data/claims.data.ts`
- `components/claims/claims-view.tsx`
- `components/claims/claims-kanban.tsx`
- `components/claims/claims-kpi.tsx`
- `components/claims/claim-detail.tsx`
- `components/claims/claim-badges.tsx`
- `components/facilities/badges.tsx`
- `app/(dashboard)/claims/page.tsx`

---

## 검증 결과

- `AGENTS.md`: 확인 완료
- `CODEX_REVIEWER_START.md`: 확인 완료
- `team-protocol.md`: 확인 완료
- 정적 코드 리뷰: 완료
- `npm run build`: 미실행
  - 사유: 사용자 요청이 리뷰 보고서 생성이며, 이번 리뷰는 파일 수정 없이 진행 조건이었다. `next build`는 `.next` 산출물을 생성할 수 있어 실행하지 않았다.
- Git 상태 확인:
  - `quality-dashboard/QMS_2.0_MASTER_PLAN.md` 삭제 상태 감지
  - `.git/index.lock` 존재 감지. Git 상태 확인 시 잠금 파일 관련 경고가 있었다.

---

## 발견 사항

### Critical

#### 1. 변경 목적에 없는 북극성 문서 삭제 상태

**위치**
- `quality-dashboard/QMS_2.0_MASTER_PLAN.md`

**내용**

하부 프로젝트 Git 상태에서 `QMS_2.0_MASTER_PLAN.md`가 삭제(`D`)로 표시된다. 이번 변경 목적은 고객 클레임 트래커 MVP와 배지 공용화 리팩토링이므로 마스터플랜 삭제는 변경 범위 밖이다.

**리스크**

QMS 2.0의 북극성 문서가 손실될 수 있고, 팀 프로토콜의 “Critical 이슈는 작업을 멈춘다” 기준에 해당한다.

**권고**

완료 판정 전 파일을 복구하거나, 의도된 삭제라면 Dennis/Claude 승인 및 근거 문서화가 필요하다.

---

### High

#### 1. `npm run build` 검증 결과 부재

**위치**
- 프로젝트 전체

**내용**

Gemini가 `npx tsc` 검수를 완료했다고 보고했으나, 프로젝트 완료 기준인 `npm run build` 결과가 없다.

**리스크**

Next.js App Router 빌드 단계에서만 드러나는 Server/Client 경계, route type, bundling 오류가 남아 있을 수 있다. `CODEX_REVIEWER_START.md` 완료 판정 기준상 빌드 검증 전 승인은 불가하다.

**권고**

Critical 복구 후 Claude가 `npm run build`를 실행해 결과를 확인해야 한다.

#### 2. KPI 대시보드가 실제 데이터가 아닌 하드코딩/오계산 값을 표시

**위치**
- `components/claims/claims-kpi.tsx`

**내용**

평균 처리 리드타임은 종결일을 계산하지 않고 모든 종결 건에 대해 14일을 고정 가산한다. 이번 달 클로징은 종결일이 아니라 `receivedAt.startsWith("2026-05")`로 계산한다. 성공률은 `85%`로 하드코딩되어 있다.

**리스크**

품질부문장 대시보드의 핵심 KPI가 실제 처리 성과와 다르게 표시된다. 품질 대시보드에서 허위 또는 오인 가능한 지표가 될 수 있다.

**권고**

`closedAt` 또는 타입 있는 상태 변경 이력을 추가한 뒤 실제 데이터 기반으로 평균 리드타임, 월간 클로징, 성공률을 계산해야 한다.

---

### Medium

#### 1. 검색/우선순위 필터가 URL 쿼리가 아닌 클라이언트 상태로만 관리됨

**위치**
- `components/claims/claims-view.tsx`

**내용**

`searchTerm`, `priorityFilter`가 `useState`로만 관리된다. 하부 프로젝트 `AGENTS.md`는 필터 상태를 URL 쿼리 파라미터로 관리하도록 규정한다.

**리스크**

딥링크, 새로고침 유지, 서버사이드 전환이 어렵다.

**권고**

`searchParams` 또는 `useSearchParams`/router 기반으로 `q`, `priority`를 URL에 반영한다.

#### 2. claims 데이터 레이어가 기존 JSON import 캐스트 패턴과 불일치

**위치**
- `data/claims.data.ts`

**내용**

기존 `facility.data.ts`, `tests.data.ts`는 JSON import 후 `as unknown as Type` 캐스트를 사용한다. 신규 `claims.data.ts`는 `fs.readFile`과 `JSON.parse`를 사용해 타입 안정성이 약해졌다.

**리스크**

JSON 필드가 잘못되어도 TypeScript가 잡지 못한다. 또한 기존 데이터 레이어 패턴과 달라 향후 Notion/Supabase 전환 시 관리 비용이 증가한다.

**권고**

기존 패턴에 맞춰 `import raw from "./claims.json"; export const claimsData = raw as unknown as ClaimsData` 형태로 통일하거나, 런타임 validator를 명시적으로 도입한다.

#### 3. 단계 이동 상태 변경은 메모리 상태에만 반영되어 새로고침 시 유실

**위치**
- `components/claims/claims-view.tsx`
- `components/claims/claim-detail.tsx`

**내용**

단계 이동 시 `setClaims`로 클라이언트 상태만 변경하고 저장소에 반영하지 않는다.

**리스크**

MVP 시연용으로는 허용 가능하지만, 마스터플랜의 “시스템 내 업무 완결성” 방향과는 아직 맞지 않는다.

**권고**

현재는 “시연용 임시 상태 변경”으로 명확히 두고, 후속 구현에서 API route 또는 서버 액션을 통해 저장 경로를 설계한다.

#### 4. 빈 데이터에서 KPI 비율이 `NaN%`가 될 수 있음

**위치**
- `components/claims/claims-kpi.tsx`

**내용**

`Math.round((unclosed.length / claims.length) * 100)`는 `claims.length === 0`일 때 `NaN`을 만든다.

**권고**

분모가 0일 때 `0%` 또는 `-`를 표시하도록 방어 로직을 추가한다.

---

### Low

#### 1. 시드 데이터 개인정보/민감정보 검토 결과

**위치**
- `data/claims.json`

**내용**

전화번호, 이메일, API key, 실제 개인 식별정보는 발견하지 못했다. 담당자는 `김철수`, `이영희` 등 전형적인 가명으로 보인다.

**잔여 리스크**

고객사 명칭 일부가 실제 회사처럼 보일 수 있으므로 계속 가명 정책을 유지해야 한다.

#### 2. facilities 배지 공용화 import 경로

**위치**
- `components/facilities/facilities-view.tsx`
- `components/facilities/equipment-table.tsx`
- `components/facilities/badges.tsx`

**내용**

정적 검색 기준으로 `./badges` import가 연결되어 있으며, 즉시 깨진 import는 발견하지 못했다.

---

## 반드시 수정할 항목

1. `quality-dashboard/QMS_2.0_MASTER_PLAN.md` 삭제 상태 복구 또는 의도된 삭제 근거 승인.
2. `npm run build` 실행 및 결과 확인.
3. `claims-kpi.tsx`의 하드코딩 KPI 제거.
4. `Claim` 타입에 `closedAt` 또는 타입 있는 상태 변경 이력 구조 추가.
5. 월간 클로징, 평균 리드타임, 성공률을 실제 데이터 기반으로 계산.
6. `claims.data.ts`를 기존 데이터 레이어 패턴과 일치시키거나 런타임 검증을 추가.
7. 검색/우선순위 필터를 URL 쿼리 파라미터 기반으로 전환.

---

## 단계 이동 상태 변경 로직 구현 시 TypeScript 주의점

1. 상태 union은 단일 상수에서 파생한다.

```ts
export const CLAIM_STATUSES = [
  "Received",
  "Investigating",
  "Action",
  "Verification",
  "Closed",
] as const;

export type ClaimStatus = (typeof CLAIM_STATUSES)[number];
```

2. 칸반 컬럼, 상태 라벨, 전이 순서는 `CLAIM_STATUSES` 또는 같은 도메인 상수에서 가져온다.
3. 상태 변경 이력은 단순 문자열 `action`보다 구조화한다.

```ts
export interface ClaimStatusChange {
  id: string;
  fromStatus: ClaimStatus;
  toStatus: ClaimStatus;
  changedAt: string;
  changedBy: string;
  reason?: string;
}
```

4. `Closed` 상태로 이동할 때 `closedAt`을 명시적으로 세팅하거나, 상태 변경 이력에서 안전하게 derive한다.
5. 임의 단계 점프 허용 여부를 타입 또는 함수로 제한한다. 예: `canMoveClaimStatus(from, to)`.
6. 서버 저장이 들어오면 클라이언트 `setClaims`만 믿지 말고 API 응답을 기준으로 상태를 갱신한다.

---

## 테스트/검증 제안

1. `npm run build`
2. `npm run lint`
3. 빈 claims 배열에서 KPI가 `NaN` 없이 표시되는지 확인
4. `/claims?priority=High&q=...` 직접 진입 시 필터 상태 유지 확인
5. 카드 클릭 → 상세 사이드바 → 단계 이동 → timeline 추가 확인
6. 단계 이동 후 새로고침 시 유실 여부를 MVP 제한사항으로 문서화하거나 저장 로직 구현
7. facilities 페이지 진입 후 배지 import 리팩토링으로 인한 런타임 오류가 없는지 확인

---

## 재리뷰 필요 여부

**필요**

Critical/High 이슈가 남아 있으므로 Claude 수정 후 재리뷰가 필요하다. 특히 마스터플랜 삭제 상태와 KPI 하드코딩은 완료 판정 전 반드시 재확인해야 한다.

