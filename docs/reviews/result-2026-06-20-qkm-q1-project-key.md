**검수일**: 2026-06-20
**검수자**: Codex CLI (코라)
**요청서**: `C:\Dev\QMS 2.0 Integration\quality-dashboard\docs\reviews\request-2026-06-20-qkm-q1-project-key.md`

# Codex (코라) Review: QKM Q1 project_key entity-linking

## 최종 판정

보류

Critical 발견 사항은 없습니다. 다만 High 1건이 남아 있어 완료 승인하지 않습니다.

## 발견 사항

### Critical

없음.

### High

1. `app/api/ncr/[id]/route.ts:45`, `app/api/ncr/[id]/route.ts:68`, `app/api/claims/[id]/route.ts:44`, `app/api/claims/[id]/route.ts:66`
   - 항목: Q1-03 인제스트 metadata 전파
   - 내용: 이미 `Closed` 상태인 NCR/Claim에 `projectKey`만 나중에 부여하거나 수정/삭제하는 PUT은 Prisma DB 필드만 업데이트하고 `after(...ingestClosedNcr/Claim)`를 호출하지 않는다. NCR은 `status === "Closed"` 또는 `timeline !== undefined`일 때만 인제스트 체크를 하고, Claim은 `status === "Closed"`일 때만 기존 상태를 조회한다.
   - 리스크: 요청서의 핵심 조건인 "종결 후 키를 나중에 부여→재인제스트 시 반영"이 실제로 성립하지 않는다. DB에는 `projectKey`가 있는데 기존 `knowledge_chunks`의 `ncr_closed`, `claim_closed`, `qms_summary` metadata에는 `project_key`가 계속 빠지거나 예전 값으로 남아 Q1 entity-linking이 깨진다.
   - 권고: PUT에서 `body.projectKey !== undefined`인 경우도 재인제스트 후보로 포함한다. 업데이트 전 기존 `status`를 조회해 이미 Closed인 건이면 저장 후 `after(async () => ingestClosedNcr(id))` 또는 `ingestClosedClaim(id)`를 실행한다. 키 제거(null)도 동일하게 재인제스트되어 기존 metadata의 `project_key`가 제거되는지 테스트해야 한다.

### Medium

1. `lib/ingest-qms.test.ts:225`
   - 항목: Q1-03 테스트 누락
   - 내용: 현재 테스트는 `projectKey`가 있는 Closed 산출물을 인제스트할 때 metadata에 키가 들어가는지와 null이면 빠지는지만 확인한다. PUT 경로에서 Closed 상태의 projectKey 단독 변경이 재인제스트를 트리거하는지는 검증하지 않는다.
   - 리스크: 이번 High 회귀처럼 저장 API와 인제스트 파이프라인 사이의 연결 누락이 테스트를 통과한다.
   - 권고: `app/api/ncr/[id]/route.test.ts` 또는 라우트 단위 테스트를 추가해 Closed NCR/Claim에서 `projectKey` 변경 및 null clear 시 `ingestClosedNcr/Claim` 호출 여부를 확인한다.

2. `prisma/migrations/add_project_key.sql:1`
   - 항목: 마이그레이션 재현성
   - 내용: `add_project_key.sql`은 수동 SQL 파일이고 요청서에는 운영 Neon DB 적용 완료라고 되어 있다. 다만 일반 Prisma migration 디렉터리 형식(`timestamp_name/migration.sql`)이 아니므로 새 환경에서 자동 마이그레이션 이력에 포함되는지 불명확하다.
   - 리스크: 로컬/스테이징/신규 Neon DB에서 Prisma schema와 실제 DB 컬럼이 어긋나면 `projectKey` 저장 API가 런타임에서 실패한다.
   - 권고: 현재 PoC 운영 방식이면 runbook에 적용 명령과 검증 쿼리를 남긴다. 배포 재현성을 높이려면 정식 Prisma migration 또는 명시적인 DB setup 절차로 승격한다.

3. `app/api/project-keys/route.ts:13`
   - 항목: autocomplete 정보 노출 범위
   - 내용: `requireActiveSession()`으로 비인증 접근은 차단되어 있다. 다만 모든 활성 사용자가 NCR/Claim 전체의 distinct projectKey 목록을 볼 수 있으며, 팀/담당 범위 제한은 없다.
   - 리스크: project_key가 고객/지역/제품/연도 등을 포함하는 식별자라면 활성 사용자 간에도 프로젝트 존재 정보가 넓게 노출된다.
   - 권고: E2E PoC에서는 허용 가능하지만, 본구현 전에는 역할/팀 범위 필터 또는 project_key 네이밍에서 고객 직접 식별을 줄이는 정책을 결정한다.

### Low

1. `components/ui/project-key-input.tsx:24`
   - 내용: autocomplete는 최초 mount 시 `/api/project-keys` 전체 50개만 가져오고 입력 중 `q`를 서버에 다시 보내지 않는다. 키가 50개를 넘으면 사용자가 입력한 접두어와 맞는 후보가 초기 50개 밖에 있을 때 추천되지 않을 수 있다.
   - 권고: PoC에서는 충분하다. 키 수가 늘면 debounced `q` 검색으로 바꾼다.

## Q1-01~Q1-05 판정

| 항목 | 판정 | 근거 |
|---|---|---|
| Q1-01 서버측 kebab 검증 | OK | `parseProjectKeyInput()`이 비문자열/대문자/공백/언더스코어 등을 invalid 처리하고, NCR/Claim POST/PUT 4개 라우트가 invalid 시 400을 반환한다. |
| Q1-02 PUT 부분 갱신 vs 명시적 클리어 | OK | `body.projectKey === undefined`이면 `projectKeyUpdate`가 비어 기존 값 미변경, `null`/빈 문자열이면 `pk.value === null`로 명시 클리어된다. |
| Q1-03 metadata 전파 | High | 인제스트 함수 내부의 원본·요약·verified_lesson metadata 전파는 구현되어 있으나, Closed 산출물의 projectKey 단독 변경 시 재인제스트가 호출되지 않는다. |
| Q1-04 autocomplete 인증·fail-open·상한 | OK / Medium 범위 리스크 | 인증, 실패 시 빈 배열, DISTINCT, 50개 상한은 구현되어 있다. 다만 활성 사용자 전체 노출 범위는 본구현 전 정책 결정 필요. |
| Q1-05 마스킹 백로그 경계 | Low | 이번 변경은 LLM 호출을 새로 늘리지는 않는다. 다만 project_key가 식별성을 높이므로 cross-cutting 마스킹 백로그의 우선순위를 유지 또는 상향하는 것이 좋다. |

## 반드시 수정할 항목

1. Closed NCR/Claim에서 `projectKey`가 변경되거나 null로 제거될 때 재인제스트를 트리거한다.
2. 위 동작을 라우트 테스트로 고정한다. 특히 "Closed + projectKey 변경", "Closed + projectKey null clear", "Open + projectKey 변경은 인제스트 없음"을 분리해 검증한다.

## 테스트/검증 제안

- 실행 확인:
  - `npx vitest run lib/project-key.test.ts lib/ingest-qms.test.ts` → 2 files, 24 passed.
  - `npx vitest run` → 11 files, 116 passed.
- 추가 필요:
  - Closed NCR projectKey 변경 PUT → `ingestClosedNcr(id)` 호출.
  - Closed Claim projectKey 변경 PUT → `ingestClosedClaim(id)` 호출.
  - projectKey null clear 후 재인제스트 결과 metadata에서 `project_key` 부재 확인.
  - 운영 DB에서 `Ncr.projectKey`, `Claim.projectKey` 컬럼 및 부분 인덱스 존재 확인 쿼리 결과를 runbook에 저장.

## 재리뷰 필요 여부

필요.

High 항목(Q1-03)이 수정된 뒤 재리뷰를 권고한다. 현재 상태로는 신규 생성 또는 종료 시점에 이미 projectKey가 있는 경우는 동작하지만, "종결 후 키 부여/수정"이라는 PoC 운영상 중요한 보정 흐름에서 QKM entity-linking metadata가 갱신되지 않는다.
