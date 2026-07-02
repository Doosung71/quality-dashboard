# Codex (코라) Review: SPG(제품군)·시장 권역 필드 (#28, #39)

**검수일**: 2026-07-02
**검수자**: Codex CLI (코라)
**요청서**: `quality-dashboard/docs/reviews/request-2026-07-02-spg-market-region-28-39.md` (레거시 하위 경로 요청서)
**대상 영역**: `quality-dashboard` 입찰 SPG·시장 권역, 클레임 SPG
**검수 방법**: 정적 코드 리뷰 + 요청서의 빌드/테스트/브라우저 검증 증거 확인

## 최종 판정

조건부 승인

Critical/High 발견 사항은 없습니다. 현재 UI 필터·등록·상세 편집 범위 배포는 가능하다고 봅니다. 단, 클레임 SPG를 QKM/RAG 검색 축으로도 사용할 계획이라면 B 항목은 배포 후 별도 보완 이슈로 남겨야 합니다.

## 검수 범위

- 요청서: `quality-dashboard/docs/reviews/request-2026-07-02-spg-market-region-28-39.md`
- 입찰 필터/편집: `app/(dashboard)/dashboard/TenderList.tsx`, `app/tender/[id]/SpgMarketEdit.tsx`, `app/api/tenders/[id]/route.ts`
- 클레임 필터/편집: `components/claims/claims-view.tsx`, `app/(dashboard)/claims/[id]/ClaimDetailPage.tsx`, `app/api/claims/route.ts`, `app/api/claims/[id]/route.ts`
- 지식 인제스트: `lib/ingest-qms.ts`
- 스키마/마이그레이션: `prisma/schema/tra.prisma`, `prisma/schema/qcost.prisma`, `prisma/migrations/add_spg_market_region.sql`

## 검증 증거

- `git status --short --untracked-files=all`: 출력 없음. 리뷰 시작 시점 기준 worktree clean으로 확인했습니다.
- 요청서상 검증:
  - `npx tsc --noEmit`: 0 에러
  - `npx vitest run`: 21 files / 194 tests passed
  - `npm run build`: 성공
  - `scripts/verify-tender-spg-region-28.mjs`: 9/9 통과
  - `scripts/verify-claim-spg-39.mjs`: 7/7 통과
- 코라가 이번 턴에서 빌드/테스트를 독립 재실행하지는 않았습니다. 검수 요청이 독립 실행을 요구하지 않아 정적 리뷰로 제한했습니다.

## 요청 항목별 판정

### A. 자유입력 필드의 필터 신뢰성

판정: Low

`TenderList.tsx`와 `claims-view.tsx` 모두 옵션을 실제 등록된 값에서 생성하고, 선택한 옵션과 저장값을 완전일치로 비교합니다. 등록/수정 경로에서 `trim()` 정규화도 적용되어 있어 선행·후행 공백으로 인한 분리는 줄어듭니다.

남는 리스크는 의미상 같은 값이 다른 표기로 축적되는 경우입니다. 예를 들어 `지중케이블`과 `지중 케이블`은 서로 다른 옵션으로 노출되고, 각각 따로 필터링됩니다. 다만 Dennis 결정이 "자유입력으로 시작 후 데이터 축적 시 고정 목록 전환"이므로, 현재 단계에서는 기능 결함이라기보다 초기 운영 한계로 보는 것이 맞습니다.

권고: 지금 당장 enum이나 강한 alias 정규화를 넣을 필요는 없습니다. 다만 옵션 정렬 전에 내부 표준화를 하려면 최소 `trim + 연속 공백 단일화` 정도까지만 검토하고, 의미 alias 병합은 실제 데이터가 쌓인 뒤 관리 테이블/고정 목록 전환 시 처리하는 편이 안전합니다.

### B. Claim.spg의 knowledge 인제스트·재동기화 제외

판정: Medium

현재 `Claim.spg`는 DB와 UI 필터에는 들어가지만, `buildClaimMarkdown()`의 원문 마크다운에도, `knowledge_chunks.metadata`에도 포함되지 않습니다. 또한 `app/api/claims/[id]/route.ts`의 `needsIngestCheck`가 `status`, `timeline`, `projectKey`만 보므로 종결 클레임의 SPG 수정은 재인제스트를 트리거하지 않습니다.

`responsibleParty`와 같은 선례를 따른 것은 일관성 측면에서 이해됩니다. 하지만 SPG는 #39에서 요구된 분류 축이고, QMS 2.0 마스터플랜의 "지식 선순환" 관점에서는 향후 "SPG별 클레임 사례 검색"의 핵심 메타데이터가 될 가능성이 높습니다. UI 필터 스코프만 선언한다면 허용 가능하지만, QKM/RAG까지 같은 분류 축을 기대하면 현재 설계는 누락입니다.

권고: 배포 전 필수 차단은 아니지만 후속 보완을 권고합니다. `buildClaimMarkdown()` 개요에 SPG를 포함하고, `ingestChunks()` metadata에 `spg`를 추가하며, closed 상태에서 `spg` 변경 시 재인제스트 조건에 포함하는 방향이 가장 단순합니다. 이미 생성된 종결 클레임은 별도 재동기화가 필요합니다.

### C. Tender PATCH 소유권 검증 재사용

판정: Low

`app/api/tenders/[id]/route.ts`의 PATCH는 `findFirst({ where: { id, createdById: session.user.id } })`로 소유자만 수정 가능하게 제한하고, 상세 페이지에서도 `SpgMarketEdit`에 `canEdit={isOwner}`를 전달합니다. 기존 `projectKey`와 같은 정책을 재사용한 것이므로 권한 회귀나 보안 약화는 아닙니다.

다만 SPG·시장 권역은 개인 작성물 내용이라기보다 운영 분류 메타데이터에 가깝습니다. #28의 취지가 팀 단위 분류/검색 품질 개선이라면, 소유자 전용은 데이터 정비 속도를 늦출 수 있습니다. 이건 코드 결함보다는 권한 정책 결정 사항입니다.

권고: 이번 배포는 기존 정책 유지로 승인 가능합니다. 다만 다음 정책 결정 때 `TEAM_LEAD`/`ADMIN`에게 SPG·권역만 제한적으로 수정 가능한 별도 권한을 줄지 검토하십시오. 그 경우 title/projectKey 등 더 민감한 필드와 권한을 분리해야 합니다.

## 발견 사항

### Critical

없음.

### High

없음.

### Medium

1. 클레임 SPG가 QKM/RAG 인제스트 산출물에 반영되지 않습니다.
   - 근거: `lib/ingest-qms.ts`의 `buildClaimMarkdown()`은 고객, 우선순위, 담당자, 접수일, 목표기한, 종결일, 클레임 내용, 처리 이력만 포함합니다. `ingestClosedClaim()` metadata도 `claim_id`, `claim_no`, `customer`, `priority`, 선택적 `project_key`만 저장합니다.
   - 영향: UI 목록에서는 SPG 필터가 되지만, `knowledge_chunks` 기반 검색/요약에서는 SPG별 클레임 회수가 불가능하거나 부정확합니다.
   - 조건: "SPG는 당분간 UI 분류만"이라는 스코프라면 배포 가능. "SPG별 RAG 조회"까지 기대한다면 보완 후 재검토가 필요합니다.

### Low

1. 자유입력 SPG·권역은 의미상 중복 표기를 분리된 필터 옵션으로 노출합니다.
   - 근거: `TenderList.tsx`는 `t.spg !== spgFilter`, `t.marketRegion !== regionFilter` 완전일치이고, `claims-view.tsx`도 `c.spg === spgFilter` 완전일치입니다.
   - 영향: 오타/띄어쓰기 차이는 필터 누락처럼 보일 수 있습니다.
   - 판단: 자유입력 축적 단계에서는 감수 가능한 Low입니다.

2. 입찰 SPG·권역 수정이 소유자 전용이라 운영 분류 보정 권한이 좁습니다.
   - 근거: `app/api/tenders/[id]/route.ts` PATCH는 `createdById` 일치가 필요하고, 상세 UI도 `canEdit={isOwner}`입니다.
   - 영향: 팀장/관리자가 타인 등록건을 분류 보정하는 흐름은 막힙니다.
   - 판단: 기존 정책 준수라 회귀는 아니며, 제품 정책 검토 항목입니다.

## 반드시 수정할 항목

이번 배포를 막는 Critical/High 필수 수정은 없습니다.

조건부 후속:

- QKM/RAG에서 SPG별 클레임 검색을 목표에 포함한다면 `Claim.spg`를 클레임 인제스트 마크다운/metadata/re-ingest trigger에 포함하십시오.
- 팀장 이상이 타인 등록 입찰의 SPG·권역을 정비해야 한다는 업무 요구가 확인되면 PATCH 권한을 필드 단위로 분리하십시오.

## 테스트/검증 제안

- SPG 표기 차이 사례: `지중케이블`, `지중 케이블`, ` 지중케이블 ` 등록 후 옵션/필터 동작을 확인하십시오.
- 종결 클레임 SPG 수정 후 `knowledge_chunks` metadata 또는 content가 갱신되는지 확인하는 회귀 테스트를 추가하십시오. 단, B 보완을 선택한 경우에 한합니다.
- 팀장/관리자 계정으로 타인 등록 입찰 SPG·권역 수정 시도 결과를 명시적으로 검증하십시오. 현재 정책 유지라면 404/읽기 전용이 기대 동작입니다.

## 재리뷰 필요 여부

현재 범위 배포만 기준으로는 재리뷰 필수는 아닙니다.

다만 B 항목을 반영해 인제스트 경로를 수정하거나, C 항목을 반영해 권한 정책을 바꾸면 재리뷰를 권고합니다.
