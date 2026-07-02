# Codex (코라) Review: Claims 처리이력 시스템/사용자 분리 + dedup (#63 이식)

**검수일**: 2026-07-02
**검수자**: Codex CLI (코라)
**요청서**: `quality-dashboard/docs/reviews/request-2026-07-02-claims-timeline-dedup-63.md`
**대상 영역**: `quality-dashboard` Claims/NCR 단계 타임라인 공용화, Claims dedup/삭제 이식
**검수 방식**: 정적 코드 리뷰 + 선행 NCR 리뷰 대조 + targeted unit test

## 최종 판정

보류

C-01 NCR 회귀, C-02 dedup 판별, C-04 삭제 인덱스는 요청 의도대로 구현된 것으로 확인했습니다. 다만 C-05 범위에서 종결된 Claim의 timeline 변경이 `ingestClosedClaim()` 재실행으로 이어지지 않아, 처리이력 삭제/수정 후 `knowledge_chunks`의 확정 지식이 실제 Claim과 불일치할 수 있습니다. 이 항목은 지식 데이터 무결성 리스크이므로 High로 판정하며, 완료 승인은 보류합니다.

## 검수 범위

- `lib/stage-timeline.ts`
- `lib/stage-timeline.test.ts`
- `types/claim.ts`
- `app/(dashboard)/ncr/[id]/NCRDetailPage.tsx`
- `app/(dashboard)/claims/[id]/ClaimDetailPage.tsx`
- `app/(dashboard)/claims/[id]/page.tsx`
- `app/api/claims/[id]/route.ts`
- `app/api/ncr/[id]/route.ts`
- `lib/ingest-qms.ts`
- `scripts/verify-claim-63.mjs`
- 선행 리뷰: `quality-dashboard/docs/reviews/result-2026-07-01-ncr-timeline-dedup-63.md`

읽지 못한 지침:

- `MULTI_AGENT_KNOWLEDGE_OPS.md`: 루트에서 파일을 찾을 수 없어 검토하지 못했습니다.
- `.env`, `.env.local`, `.env.*`: 프로젝트 보안 지침에 따라 읽지 않았습니다.

## 검증 증거

- `git status --short --untracked-files=all`: 출력 없음
- `npx vitest run lib/stage-timeline.test.ts`: 1 file / 14 tests passed
- 요청서 기재 증거: `npx vitest run` 184 passed, `npm run build` 통과, `node scripts/verify-claim-63.mjs` 전체 통과
- 독립 빌드와 브라우저 골든패스는 실행하지 않았습니다. 리뷰 산출물 외 파일 생성을 피하기 위해 요청서의 통과 기록을 참고 증거로만 사용했습니다.

## 항목별 판정

### C-01. NCR 회귀 여부

판정: OK

`NCRDetailPage.handleMoveStatus()`는 기존 `user` 필드와 `kind: "system"`을 유지한 팩토리를 `buildStageMoveTimeline()`에 넘깁니다. 공용 헬퍼도 `kind`와 `action`만 판별하므로 NCR 담당자 필드 구조에는 간섭하지 않습니다.

선행 승인된 NCR #63의 핵심 동작인 명시적 `kind` 우선, 레거시 prefix fallback, 직전 역방향 시스템 로그 1건 제거는 `lib/stage-timeline.ts`와 11개 NCR 계열 테스트에 그대로 보존되어 있습니다.

### C-02. dedup 판별 정확성

판정: OK

`buildStageMoveTimeline()`은 `stageMoveAction(toLabel, fromLabel)`와 직전 항목의 `action`이 완전히 일치하고, `isSystemTimelineEntry()`가 true일 때만 제거합니다. Claim 라벨 기준 `접수 -> 조사 중` 후 `조사 중 -> 접수`은 제거되고, `kind: "user"` 수동 메모는 같은 문자열이어도 보존됩니다.

라벨 문자열 기반 비교는 선행 NCR 리뷰와 동일한 한계입니다. 라벨 변경 시 dedup이 실패해 로그가 추가되는 방향이라 오삭제보다는 미작동에 가까운 fail-safe입니다.

### C-03. 상태 전환 원자성 / timeline PUT 구조

판정: Medium

`ClaimDetailPage.handleMoveStatus()`, `handleAddTimelineEntry()`, `handleDeleteTimelineEntry()` 모두 현재 클라이언트 상태의 전체 `timeline` 배열을 만들어 `PUT`으로 덮어씁니다. `app/api/claims/[id]/route.ts`도 `body.timeline`을 그대로 전체 교체합니다. 빠른 연속 클릭이나 다중 탭 편집에서는 마지막 쓰기 승리로 로그 유실이 가능합니다.

이는 요청서 설명처럼 원본 #63의 T-04와 같은 기존 아키텍처 한계이며, 이번 dedup 이식이 새로 만든 회귀로 보지는 않습니다. 서버 append/dedup 또는 optimistic lock은 후속 과제로 권고합니다.

### C-04. 삭제 인덱스 정확성

판정: OK

렌더링은 `[...(claim.timeline ?? [])].reverse()`로 최신순 표시하고, 삭제 대상은 `originalIndex = length - 1 - i`로 복원합니다. 이후 `filter((_, idx) => idx !== originalIndex)`가 원본 배열에서 해당 항목만 제외하므로 reverse 표시 순서와 실제 삭제 대상이 일치합니다.

NCR과 동일한 패턴이고, 현재 코드 기준 인덱스 계산 회귀는 발견하지 못했습니다.

### C-05. 방어적 설계 4항목

판정: High

권한 UI 스코프는 `app/(dashboard)/claims/[id]/page.tsx`에서 `canWrite(session.user.role, "/claims")`로 계산되어 `ClaimDetailPage`의 수정/이동/삭제 UI를 게이트합니다. 다만 API route 자체는 `requireActiveSession()`만 확인하고 timeline JSONB를 그대로 저장하므로, 서버 측 권한/shape 검증은 fail-open입니다. 이 구조는 기존 패턴으로 보이나 장기적으로는 보강 대상입니다.

완료를 막는 핵심은 종결 Claim의 지식 재인제스트 누락입니다. `lib/ingest-qms.ts`의 `buildClaimMarkdown()`은 timeline을 확정 지식 Markdown에 포함합니다. 그런데 `app/api/claims/[id]/route.ts`는 `body.status === "Closed"` 또는 `projectKey` 변경일 때만 `ingestClosedClaim(id)`를 호출하고, `body.timeline !== undefined && existing?.status === "Closed"` 조건이 없습니다. 반면 NCR route는 종결 상태 timeline 변경 시 `ingestClosedNcr(id)`를 재실행합니다.

이번 변경은 Claims에 개별 이력 삭제 경로를 추가했고, 타임라인 입력/삭제 UI는 `canEdit`만 만족하면 종결 상태에서도 노출됩니다. 따라서 종결 Claim에서 이력을 삭제하거나 메모를 추가하면 DB의 `claim.timeline`은 바뀌지만 `knowledge_chunks`에는 이전 처리이력이 남을 수 있습니다. QMS 지식 선순환/확정 지식 무결성 관점에서 High입니다.

## 발견 사항

### Critical

없음.

### High

1. `app/api/claims/[id]/route.ts:44-72`, `lib/ingest-qms.ts:86-118`, `app/(dashboard)/claims/[id]/ClaimDetailPage.tsx:231-260`: 종결된 Claim의 timeline 추가/삭제가 `ingestClosedClaim()` 재실행으로 이어지지 않습니다. `buildClaimMarkdown()`은 timeline을 지식 Markdown에 포함하므로, 종결 Claim 이력 변경 후 DB와 `knowledge_chunks`의 확정 지식이 불일치할 수 있습니다. NCR route의 `isClosedTimelineUpdate`와 같은 조건을 Claims에도 맞추는 수정이 필요합니다.

### Medium

1. `app/(dashboard)/claims/[id]/ClaimDetailPage.tsx:209-260`, `app/api/claims/[id]/route.ts:51-67`: timeline 전체 배열 PUT 구조는 빠른 연속 클릭/다중 탭 편집에서 마지막 쓰기 승리로 로그 유실이 가능합니다. 이번 이식으로 새로 생긴 회귀는 아니지만 감사 로그 성격상 후속 개선이 필요합니다.

### Low

1. `lib/stage-timeline.ts`: dedup이 한글 라벨 문자열 비교에 의존합니다. 현재는 오삭제보다 dedup 미작동 방향의 fail-safe지만, 상태 코드 메타데이터가 있으면 라벨 변경에도 견고해집니다.

2. `app/api/claims/[id]/route.ts:60`: timeline JSONB shape와 `kind` 값 검증이 없습니다. 현재 UI가 `kind: "system" | "user"`를 생성하므로 즉시 결함은 아니지만, API 직접 호출에는 방어가 약합니다.

## 반드시 수정할 항목

1. Claims API에 종결 상태 timeline 변경 감지를 추가하십시오. NCR route와 동일하게 `needsIngestCheck`에 `body.timeline !== undefined`를 포함하고, `existing?.status === "Closed"`인 timeline 업데이트에서 `after(async () => { await ingestClosedClaim(id) })`가 실행되도록 해야 합니다.

## 테스트/검증 제안

- `app/api/claims/[id]/route.test.ts`에 Closed Claim timeline 업데이트 시 `ingestClosedClaim()`이 호출되는 테스트를 추가하십시오.
- 기존 `stage-timeline.test.ts` 14건은 유지하십시오.
- 수정 후 `npx vitest run lib/stage-timeline.test.ts app/api/claims/[id]/route.test.ts`를 최소 검증으로 실행하십시오.
- 브라우저 골든패스는 요청서의 `scripts/verify-claim-63.mjs`를 재실행하되, 가능하면 종결 Claim에서 수동 메모 추가/삭제 후 지식 재인제스트 호출까지 별도 API 테스트로 보강하십시오.

## 재리뷰 필요 여부

필수 재리뷰가 필요합니다.

High 항목 1건이 남아 있어 현재 상태로는 완료 승인할 수 없습니다. 위 재인제스트 조건을 수정하고 관련 API 테스트를 추가한 뒤 재리뷰를 요청하십시오.
