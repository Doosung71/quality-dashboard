# Codex (코라) Review: Witness #30 재검수

**검수일**: 2026-07-01
**검수자**: Codex CLI (코라)
**요청서**: `C:\Dev\QMS 2.0 Integration\quality-dashboard\docs\reviews\request-2026-07-01-witness-30-rereview.md`
**선행 결과서**: `C:\Dev\QMS 2.0 Integration\quality-dashboard\docs\reviews\result-2026-07-01-witness-30-status-calendar.md`
**검수 방식**: 재검수 정적 리뷰 + 하드코딩 자격증명 검색 + 단위/전체 테스트 + 타입체크 + 빌드 실행

## 최종 판정

**승인**

1차 보류 사유였던 H-01(검증 스크립트 자격증명 하드코딩)은 해소됐습니다. 재검수 범위에서 Critical/High 발견 사항은 없습니다.

## 검수 범위

- `scripts/verify-witness-30.mjs`
- `scripts/verify-witness.mjs`
- `scripts/check-pw.ts`
- `app/api/witness/route.test.ts`
- 선행 결과서의 H-01, L-01 반영 여부

기능 로직 파일(`app/api/witness/[id]/route.ts`, `app/api/witness/route.ts`, `components/witness/witness-calendar.tsx`)은 1차 검수에서 OK였고, 이번 요청서 기준으로 재검수 핵심 범위가 아닙니다.

## 검증 근거

- `scripts/verify-witness-30.mjs` 확인: 이메일/비밀번호 상수 제거, `WITNESS_VERIFY_EMAIL` / `WITNESS_VERIFY_PASSWORD` 환경변수 사용, 미설정 시 `process.exit(1)`.
- `scripts/verify-witness.mjs` 확인: 동일하게 환경변수 사용, 미설정 시 종료.
- `scripts/check-pw.ts` 확인: `CHECK_EMAIL` / `CHECK_PASSWORD` 환경변수 사용, SQL 이메일 조건은 `$1` 파라미터 바인딩.
- 하드코딩 자격증명 검색: `scripts`, `app`, `components`, `lib` 범위에서 과거 비밀번호 literal 및 `PASS = "..."`, `EMAIL = "..."` 형태의 스크립트 자격증명 하드코딩 잔존 없음.
- `npx vitest run app/api/witness/route.test.ts` → 통과: 18 tests.
- `npx tsc --noEmit` → 통과.
- `npx vitest run` → 통과: 17 files, 152 tests.
- `npm run build` → 통과. 기존 ESLint warning은 있으나 빌드 실패 없음.
- `.env.local` 파일 내용은 보안 지침에 따라 읽지 않았습니다.
- 브라우저 골든패스 스크립트는 로컬 자격증명이 필요한 실 DB 검증이라 독립 실행하지 않았고, 요청서의 실행 결과를 보조 증거로만 참조했습니다.

## 발견 사항

### Critical

없음.

### High

없음.

### Medium

없음.

### Low

#### L-01. `verify-witness.mjs`는 `.env.local` 자동 로드를 하지 않음

**위치**: `scripts/verify-witness.mjs:4-10`

`verify-witness-30.mjs`와 `check-pw.ts`는 `dotenv`로 `.env.local`을 로드하지만, 기존 `verify-witness.mjs`는 쉘 환경변수만 읽습니다. 보안 문제는 아니며 fail-closed도 됩니다. 다만 두 검증 스크립트의 실행 경험이 달라, 사용자가 같은 방식으로 실행했을 때 하나만 환경변수 미설정으로 종료될 수 있습니다.

권고:
- 두 Playwright 검증 스크립트의 env 로딩 방식을 통일하면 운영성이 좋아집니다.

## 재검수 항목별 판정

### RE-01. 자격증명 전수 제거 확인

**판정: OK**

세 스크립트 모두 하드코딩된 로그인 이메일/비밀번호를 제거하고 환경변수 기반으로 전환했습니다. 미설정 시 로그인 또는 DB 조회를 진행하지 않고 종료하므로 fail-closed입니다. `check-pw.ts`는 SQL 조건도 파라미터 바인딩으로 바뀌어 추가적인 문자열 삽입 리스크도 줄었습니다.

비밀번호 회전은 요청서에 완료로 기재되어 있으며, 코드상 과거 비밀번호 literal은 재검수 대상 스크립트/앱 코드 범위에 남아 있지 않습니다. 단, 요청서 자체에는 과거 노출값 언급이 남아 있으므로 해당 문서를 외부 공유하지 않는 것이 좋습니다.

### RE-02. L-01 테스트 보강 적정성

**판정: OK**

월경계 GET 테스트가 `nextMonth`뿐 아니라 `monthStart`, `OR[0].endDate.gte`, `OR[1].endDate === null`, `OR[1].inspectionDate.gte`까지 실제 값으로 단언하도록 강화됐습니다. 1차 Low 지적은 해소됐습니다.

## 반드시 수정할 항목

없음.

## 테스트/검증 제안

- `verify-witness.mjs`도 `dotenv` 로딩 방식을 맞추면 검증 스크립트 사용성이 일관됩니다.
- 요청서와 리뷰 문서에는 과거 노출 비밀번호 literal을 반복 기록하지 않는 것을 권장합니다.
- 기존 ESLint warning은 이번 승인 차단 사유는 아니지만 별도 품질 정리 대상으로 남아 있습니다.

## 재리뷰 필요 여부

**불필요**

Critical/High가 없고 1차 보류 조건이 해소됐으므로 Witness #30 재검수는 승인합니다.
