**검수일**: 2026-06-20
**검수자**: Codex CLI (코라)
**요청서**: `C:\Dev\QMS 2.0 Integration\quality-dashboard\docs\reviews\request-2026-06-20-qkm-q1-project-key-rereview.md`

# Codex (코라) Review: QKM Q1 project_key entity-linking rereview

## 최종 판정

조건부 승인

Critical/High 발견 사항은 없습니다. 1차 High였던 Closed 산출물 projectKey 단독 변경 시 재인제스트 누락은 해소됐습니다.

## 발견 사항

### Critical

없음.

### High

없음.

### Medium

1. `lib/ingest-qms.ts:263`, `lib/ingest-qms.ts:265`, `lib/ingest-qms.ts:301`, `lib/ingest-qms.ts:303`
   - 항목: RE-02 idempotency / null clear 잔여 리스크
   - 내용: 원본 `ncr_closed/*`, `claim_closed/*` 청크는 `DELETE FROM knowledge_chunks WHERE source_path LIKE ${sourcePrefix}/%` 후 INSERT하므로 projectKey 변경·null clear가 안전하게 반영된다. 다만 `qms_summary`는 `generateQmsSummary()` 성공 뒤 `ingestSummaryChunk()`가 호출될 때에만 `summary` row를 DELETE+INSERT한다. Anthropic 호출 실패 또는 `ANTHROPIC_API_KEY` 누락 시 기존 summary row가 삭제되지 않아 이전 `project_key` metadata가 남을 수 있다.
   - 리스크: fail-open 설계상 원본 청크는 정상 갱신되지만, 일반 검색에 포함되는 `qms_summary`가 stale project_key로 남아 entity-linking 필터 결과에 일부 오염을 만들 수 있다.
   - 권고: PoC 승인 차단은 아니지만, projectKey 변경 재인제스트 경로에서는 summary 생성 실패 전에도 기존 `${sourcePrefix}/summary` row를 삭제하거나 metadata-only 업데이트/삭제를 수행하는 보강을 권장한다. 최소 테스트로 `ANTHROPIC_API_KEY` 없음 + projectKey null clear 시 summary stale 방지 케이스를 추가한다.

### Low

1. `app/api/project-keys/route.ts`
   - 내용: autocomplete의 전체 활성 사용자 노출 범위와 50개 초기 후보 제한은 PoC 보류로 둘 수 있다. project_key가 고객/프로젝트 식별자를 담을 수 있으므로 본구현 전에는 팀/역할 범위 필터와 debounced `q` 검색을 백로그로 유지해야 한다.

2. `prisma/migrations/add_project_key.sql:15`
   - 내용: 수동 SQL migration 재현성은 적용 명령과 검증 쿼리 주석이 추가되어 1차 Medium은 완화됐다. 여전히 정식 Prisma migration 디렉터리 형식은 아니므로, 신규 환경 setup runbook에서 이 파일 실행을 명시해야 한다.

## RE-01~RE-03 판정

| 항목 | 판정 | 근거 |
|---|---|---|
| RE-01 Closed 건 projectKey 변경 재인제스트 정확성 | OK | NCR/Claim PUT 모두 `body.projectKey !== undefined`이면 기존 status를 조회하고, 기존 상태가 `Closed`일 때 `after(() => ingestClosedNcr/Claim(id))`를 호출한다. Open 건은 테스트상 미호출. |
| RE-02 ingestClosedNcr/Claim idempotency | OK / Medium 잔여 | 원본 청크와 verified_lesson은 DELETE+INSERT 또는 단일 source_path 덮어쓰기 구조라 안전하다. 단, qms_summary는 LLM 실패 시 이전 summary row가 남을 수 있어 별도 보강 권장. |
| RE-03 기존 인제스트 트리거 회귀 | OK | NCR의 `isClosingNow`, `isClosedTimelineUpdate`가 유지됐고 projectKey 조건이 OR로 추가됐다. Claim의 종결 전환 트리거도 유지됐다. |

## 반드시 수정할 항목

없음. Critical/High는 없습니다.

## 테스트/검증 제안

실행 확인:

- `npx vitest run app/api/ncr/[id]/route.test.ts app/api/claims/[id]/route.test.ts` → 2 files, 8 passed.
- `npx vitest run lib/ingest-qms.test.ts` → 1 file, 15 passed.
- `npx vitest run` → 13 files, 124 passed.
- `npm run build` → 성공. 기존 lint warning은 있으나 빌드 실패 없음.

추가 권장:

- `qms_summary` stale 방지 테스트: Anthropic 실패 또는 키 누락 상태에서 Closed 산출물 projectKey null clear 시 기존 summary의 `project_key`가 남지 않는지 검증.
- 운영 검증: Closed NCR/Claim 샘플 1건에서 projectKey 부여→검색 metadata 확인→null clear→metadata 제거 확인.

## 재리뷰 필요 여부

필수 재리뷰는 불필요합니다.

다만 `qms_summary` stale metadata 보강을 반영하면 해당 소규모 변경만 재확인하면 됩니다. PoC 보류 처리한 autocomplete 범위 제한과 서버-side `q` 검색은 이번 완료를 막지 않는 백로그로 보는 것이 타당합니다.
