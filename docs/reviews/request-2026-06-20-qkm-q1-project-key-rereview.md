# Codex 재검수 요청 — QKM Q1 project_key (1차 High 반영)

**요청일**: 2026-06-20
**요청자**: Claude Code (클로이, PM)
**리뷰 유형**: Re-review
**선행 문서**: `docs/reviews/result-2026-06-20-qkm-q1-project-key.md` (1차 보류)
**대상 커밋**: `2021ae6` (반영) ← `4d66203` (1차)

---

## 변경 개요

1차 검수에서 **보류(High 1)** 판정을 받아 핵심 High(Q1-03)와 Medium 2건을 반영했다.
이미 Closed 상태인 NCR/Claim에 projectKey만 나중에 부여·수정·삭제할 때
재인제스트가 호출되지 않아 `knowledge_chunks` metadata가 갱신되지 않던
entity-linking 누락 버그를 수정했다.

### 1차 Codex 지적 반영표

| 1차 Codex 지적 | 반영 여부 | 처리 내용 |
|---|---|---|
| **High Q1-03** — Closed 산출물 projectKey 단독 변경 시 재인제스트 미호출 | ✅ 반영 | NCR/Claim PUT에 `body.projectKey !== undefined && 기존 status === "Closed"`면 `after(() => ingestClosedNcr/Claim)` 트리거. 키 변경·null clear 모두 재인제스트 (DELETE+INSERT로 metadata 갱신·제거) |
| **Med-1** — 위 동작 라우트 테스트 누락 | ✅ 반영 | `app/api/ncr/[id]/route.test.ts`·`app/api/claims/[id]/route.test.ts` 신규 8건 |
| **Med-2** — 수동 SQL migration 재현성 | ✅ 반영 | `add_project_key.sql`에 적용 명령(`prisma db execute`)·검증 쿼리·운영 적용일 주석 |
| **Med-3** — autocomplete 전체 사용자 노출 범위 | ⏸️ PoC 보류 | 코라 동의(E2E PoC 허용). 본구현 전 역할/팀 범위 필터 정책 결정 백로그 |
| **Low-1** — autocomplete q 서버 미전송(50개 상한) | ⏸️ PoC 보류 | 현재 키 수 적음. 키 증가 시 debounced q 검색 백로그 |

---

## 변경된 파일

### 1. `app/api/ncr/[id]/route.ts` (수정)
- `needsIngestCheck`에 `body.projectKey !== undefined` 추가 → 기존 status 조회
- `isClosedProjectKeyUpdate` 분기 추가 → Closed 건 projectKey 변경 시 `ingestClosedNcr(id)` 트리거

### 2. `app/api/claims/[id]/route.ts` (수정)
- `needsIngestCheck` 도입(기존 `status==="Closed"`만 조회 → projectKey 변경도 포함)
- `isClosedProjectKeyUpdate` 분기 추가 → `ingestClosedClaim(id)` 트리거

### 3. `app/api/ncr/[id]/route.test.ts` (신규) / `app/api/claims/[id]/route.test.ts` (신규)
- `after()`만 부분 모킹(콜백 즉시 실행)으로 인제스트 호출 캡처
- 4케이스 × 2 = 8건: Closed+변경 호출 / Closed+null clear 호출 / Open 미호출 / 잘못된 형식 400+미호출

### 4. `prisma/migrations/add_project_key.sql` (수정)
- 적용 명령·검증 쿼리·운영 적용일(2026-06-20) 주석 추가

---

## 검수 요청 항목

### RE-01. Closed 건 projectKey 변경 재인제스트 정확성
**위치**: `app/api/ncr/[id]/route.ts`, `app/api/claims/[id]/route.ts`
**내용**: Closed 상태에서 projectKey 부여/수정/null clear 시 `ingestClosedNcr/Claim`이 실제로 호출되어 metadata가 갱신·제거되는지. Open 건 변경은 트리거하지 않는지(불필요한 인제스트·status 가드).
**리스크**: 트리거 조건이 어긋나면 1차 High 회귀 재발 또는 Open 건에 불필요한 LLM 임베딩 비용 발생.

### RE-02. ingestClosedNcr/Claim의 idempotency
**위치**: `lib/ingest-qms.ts` (`ingestClosedNcr`/`ingestClosedClaim`)
**내용**: 재인제스트는 `source_path` 기준 DELETE+INSERT 트랜잭션이므로 중복 호출에 안전한지. null clear 시 새 INSERT의 metadata에서 `project_key`가 빠지는지(이전 값 잔존 없음).
**리스크**: 덮어쓰기가 원자적이지 않으면 키 제거가 반영 안 되거나 청크 중복.

### RE-03. 회귀 — 기존 인제스트 트리거(종결 전환·timeline)
**위치**: 동일 두 라우트
**내용**: projectKey 분기를 추가하면서 기존 `isClosingNow`·`isClosedTimelineUpdate`(NCR) 동작이 보존됐는지.
**리스크**: 조건 OR 누락 시 종결 전환 자체의 인제스트가 깨질 수 있음.

---

## 빌드/테스트 상태

```
npx vitest run app/api/ncr/[id]/route.test.ts app/api/claims/[id]/route.test.ts → 8 passed
npx vitest run   → 13 files, 124 passed
npm run build    → 통과 (에러 0)
```

---

## 원하는 판정

- RE-01 ~ RE-03 각 항목 Critical / High / Medium / Low / OK 판정
- 전체 승인 / 조건부 승인 / 보류 판정
- PoC 보류 처리한 Med-3 / Low-1의 백로그 분리가 타당한지 의견
