# Codex (코라) Review: Claims 처리이력 dedup (#63 이식) High 반영 재검수

**검수일**: 2026-07-02
**검수자**: Codex CLI (코라)
**요청서**: `quality-dashboard/docs/reviews/request-2026-07-02-claims-timeline-dedup-63-rereview.md`
**대상 영역**: `quality-dashboard` Claims timeline 재인제스트 보완
**검수 방식**: 정적 코드 리뷰 + 1차 결과 대조 + targeted unit test

## 최종 판정

승인

Critical/High 발견 사항은 없습니다. 1차 보류 사유였던 종결 Claim timeline 변경 시 `knowledge_chunks` 확정 지식 불일치 리스크는 `app/api/claims/[id]/route.ts`의 재인제스트 조건 보강과 route 테스트로 해소된 것으로 판단합니다.

## 검수 범위

- `quality-dashboard/docs/reviews/result-2026-07-02-claims-timeline-dedup-63.md`
- `app/api/claims/[id]/route.ts`
- `app/api/claims/[id]/route.test.ts`
- 비교 기준: `app/api/ncr/[id]/route.ts`

읽지 못한 지침:

- `MULTI_AGENT_KNOWLEDGE_OPS.md`: 루트에서 파일을 찾을 수 없어 검토하지 못했습니다.
- `.env`, `.env.local`, `.env.*`: 프로젝트 보안 지침에 따라 읽지 않았습니다.

## 검증 증거

- `git status --short --untracked-files=all`: 출력 없음
- `npx vitest run "app/api/claims/[id]/route.test.ts" "lib/stage-timeline.test.ts"`: 2 files / 20 tests passed
- 요청서 기재 증거: `npx vitest run` 186 passed, `npm run build` 통과
- 독립 빌드는 실행하지 않았습니다. 리뷰 결과 파일 외 산출물 생성을 피하기 위해 요청서의 빌드 통과 기록을 참고했습니다.

## 항목별 판정

### RE-01. High #1 수정의 정확성

판정: OK

`app/api/claims/[id]/route.ts:47-75`에서 `needsIngestCheck`에 `body.timeline !== undefined`가 포함됐고, `isClosedTimelineUpdate = body.timeline !== undefined && existing?.status === "Closed"`가 추가됐습니다. 최종 조건도 `isClosingNow || isClosedTimelineUpdate || isClosedProjectKeyUpdate`로 확장되어 NCR route와 동치입니다.

따라서 종결 Claim에서 처리이력 추가, 삭제, dedup 결과 저장처럼 `timeline` 전체 배열이 PUT되는 경우 `after(async () => { await ingestClosedClaim(id) })`가 실행됩니다. 1차 High였던 DB timeline과 `knowledge_chunks` 확정 지식 불일치 리스크는 해소됐습니다.

### RE-02. 과잉 인제스트 없음

판정: OK

Open 상태 Claim의 timeline 변경은 `existing?.status === "Closed"` 조건을 만족하지 않으므로 인제스트가 호출되지 않습니다. `app/api/claims/[id]/route.test.ts:84-95`가 Closed timeline 변경 시 호출, Received timeline 변경 시 미호출을 직접 검증합니다.

기존 종결 전환 경로(`body.status === "Closed" && existing?.status !== "Closed"`)와 종결 상태 projectKey 변경 경로도 유지되어 회귀를 발견하지 못했습니다.

## 발견 사항

### Critical

없음.

### High

없음.

### Medium

1. 1차 리뷰의 Medium #1은 후속 백로그로 수용 가능합니다. timeline 전체 배열 PUT 구조는 빠른 연속 클릭/다중 탭 편집에서 마지막 쓰기 승리로 로그 유실 가능성이 있지만, 이번 High 수정 범위에서 새로 악화된 회귀는 아닙니다.

### Low

1. 1차 리뷰의 Low #1은 후속 백로그로 수용 가능합니다. 한글 라벨 문자열 기반 dedup은 라벨 변경 시 미작동할 수 있으나 오삭제보다는 fail-safe 방향입니다.

2. 1차 리뷰의 Low #2는 후속 백로그로 수용 가능합니다. timeline JSONB shape/kind 서버 검증은 NCR/Claims 공통 정책으로 보강하는 편이 더 적절합니다.

## 반드시 수정할 항목

없음.

## 테스트/검증 제안

- 후속 동시성 개선 시 서버 append/dedup endpoint 또는 optimistic lock 테스트를 추가하십시오.
- timeline JSONB 서버 검증을 도입할 때는 NCR/Claims route에 공통 schema 또는 helper를 적용하고, `kind` 허용값 및 최소 필드 shape를 함께 테스트하십시오.

## 재리뷰 필요 여부

필수 재리뷰는 필요하지 않습니다.

Medium/Low 후속 과제를 실제 구현할 때는 별도 요청서로 재검수를 권장합니다.
