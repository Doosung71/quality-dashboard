# Codex 재검수 요청 — Claims 처리이력 dedup (#63 이식) High 반영

**요청일**: 2026-07-02
**요청자**: Claude Code (PM)
**리뷰 유형**: Re-review
**선행 문서**: `docs/reviews/result-2026-07-02-claims-timeline-dedup-63.md` (1차: 보류, High 1건)

---

## 변경 개요

1차 검수에서 유일한 완료 차단 항목이었던 **High #1(종결 Claim의 timeline 변경이
`ingestClosedClaim()` 재실행으로 이어지지 않아 knowledge_chunks 확정 지식이 DB와 불일치)**을
NCR route와 동일한 조건으로 수정했다. Medium/Low 3건은 1차 판정대로 후속 백로그로 둔다
(사유는 아래 표).

| 1차 Codex 지적 | 반영 여부 | 처리 내용 |
|---|---|---|
| **High #1** 종결 Claim timeline 변경 시 재인제스트 누락 | ✅ 반영 | `app/api/claims/[id]/route.ts`에 `body.timeline !== undefined`를 `needsIngestCheck`에 추가 + `isClosedTimelineUpdate` 분기 추가 → 종결 Claim 이력 추가/삭제 시 `after(() => ingestClosedClaim(id))` 실행. NCR route와 완전 동일. |
| **Medium #1** timeline 전체배열 PUT 동시성 | ⏸️ 후속 | 원본 #63 T-04와 동일한 기존 아키텍처 한계. 이번 이식이 만든 회귀 아님. 서버 append/optimistic-lock은 공통 후속 과제. |
| **Low #1** 한글 라벨 문자열 dedup | ⏸️ 후속 | #63 T-03에서 이미 수용된 한계. fail-safe 방향(오삭제 아닌 미작동). 상태코드 메타는 공통 후속. |
| **Low #2** timeline JSONB shape/kind 서버검증 없음 | ⏸️ 후속 | NCR route도 동일하게 미검증 → Claims만 추가하면 통일성 위배. 두 라우트 공통 후속 과제로 분리. |

---

## 변경된 파일 (이번 재검수 대상만)

### 1. `app/api/claims/[id]/route.ts` (수정)
- `needsIngestCheck = body.status === "Closed" || body.timeline !== undefined || body.projectKey !== undefined` (timeline 조건 추가)
- `const isClosedTimelineUpdate = body.timeline !== undefined && existing?.status === "Closed"` 추가
- `if (isClosingNow || isClosedTimelineUpdate || isClosedProjectKeyUpdate)` 로 확장
- NCR route(`app/api/ncr/[id]/route.ts`)의 동일 로직과 1:1 대응

### 2. `app/api/claims/[id]/route.test.ts` (수정)
- describe 블록 추가: "timeline 재인제스트 (#63)"
  - 종결(Closed) Claim timeline 변경 시 `ingestClosedClaim('claim-1')` 호출 검증
  - Open(Received) Claim timeline 변경은 인제스트 미호출 검증

(1차 검수 대상 파일 `lib/stage-timeline.ts` 등은 변경 없음 — 이번 재검수는 위 2파일 델타만.)

---

## 검수 요청 항목

### RE-01. High #1 수정의 정확성
**위치**: `app/api/claims/[id]/route.ts:44-73`
**내용**: 종결 Claim의 timeline 추가/삭제/dedup 시 `ingestClosedClaim(id)`가 실행되어 knowledge_chunks가 재동기화되는지. 조건이 NCR route와 동치인지.
**리스크**: 조건 누락 시 확정 지식 불일치 잔존(1차 High 미해소).

### RE-02. 과잉 인제스트 없음
**위치**: 동일
**내용**: Open 상태 Claim의 timeline 변경(일반 진행 중 메모)에서는 인제스트가 호출되지 않는지(종결 건만 확정 지식 대상). 종결 전환·projectKey 경로 회귀 없는지.
**리스크**: 불필요한 재인제스트로 비용·부하 증가.

---

## 빌드/테스트 상태

```
npx vitest run "app/api/claims/[id]/route.test.ts" "lib/stage-timeline.test.ts"
  → 20 passed (route 6: projectKey 4 + timeline 2, stage-timeline 14)
npx vitest run   → 186 passed (19 files)  # 1차 184 + timeline 2
npm run build    → 통과 (에러 0)
```

---

## 원하는 판정

- RE-01, RE-02 각 Critical / High / Medium / Low / OK
- 전체 승인 / 조건부 승인 / 보류
- Medium/Low 3건 후속 처리 수용 여부 확인
