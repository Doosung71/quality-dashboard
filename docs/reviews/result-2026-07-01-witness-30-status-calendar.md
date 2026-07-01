# Codex (코라) Review: Witness #30 상태변경·null검증·다일 캘린더

**검수일**: 2026-07-01
**검수자**: Codex CLI (코라)
**요청서**: `C:\Dev\QMS 2.0 Integration\quality-dashboard\docs\reviews\request-2026-07-01-witness-30-status-calendar.md`
**검수 방식**: 정적 코드 리뷰 + 단위/전체 테스트 + 타입체크 + 빌드 실행

## 최종 판정

**보류**

Witness 기능 구현 자체의 핵심 로직은 요청 의도대로 작동합니다. 다만 신규 검증 스크립트에 실제 로그인 자격증명이 하드코딩되어 있어 보안 원칙 위반으로 승인할 수 없습니다.

Critical 발견 사항은 없습니다. High 1건이 남아 있습니다.

## 검수 범위

- `app/api/witness/[id]/route.ts`
- `app/api/witness/route.ts`
- `components/witness/witness-calendar.tsx`
- `app/api/witness/route.test.ts`
- `scripts/verify-witness-30.mjs`

## 검증 근거

- `npx vitest run app/api/witness/route.test.ts` → 통과: 18 tests.
- `npx tsc --noEmit` → 통과.
- `npx vitest run` → 통과: 17 files, 152 tests.
- `npm run build` → 통과. 기존 ESLint warning은 있으나 빌드 실패 없음.
- `scripts/verify-witness-30.mjs`는 실제 계정 자격증명 하드코딩이 있어 독립 실행하지 않았습니다.

## 발견 사항

### Critical

없음.

### High

#### H-01. 검증 스크립트에 실제 로그인 자격증명이 하드코딩됨

**위치**: `scripts/verify-witness-30.mjs:5-8`

신규 Playwright 검증 스크립트가 로그인 이메일과 비밀번호를 상수로 포함합니다. 요청서도 이 스크립트가 `실 Neon DB` 대상으로 실행된다고 설명하므로, 테스트/운영 보조 스크립트 여부와 무관하게 저장소에 커밋되면 자격증명 노출입니다.

프로젝트 보안 원칙은 API key, 자격증명, token 노출을 금지합니다. 이 파일이 커밋 대상이면 High 보안 이슈입니다.

권고:
- `EMAIL`, `PASS`를 환경변수로 읽게 변경하십시오. 예: `WITNESS_VERIFY_EMAIL`, `WITNESS_VERIFY_PASSWORD`.
- 실제 비밀번호가 이미 공유/커밋/로그에 노출됐다면 즉시 회전하십시오.
- 스크립트가 로컬 임시 도구라면 커밋하지 말고 `.gitignore` 또는 별도 로컬 runbook으로 분리하십시오.

### Medium

없음.

### Low

#### L-01. 월경계 쿼리 테스트가 조건 구조만 확인하고 실제 경계값을 충분히 검증하지 않음

**위치**: `app/api/witness/route.test.ts:78-89`

GET 월경계 테스트는 `nextMonth`와 `OR` 길이만 확인합니다. `monthStart`, `endDate.gte`, `endDate null + inspectionDate.gte`가 정확히 들어갔는지는 직접 검증하지 않습니다. 구현은 맞지만 회귀 방지력은 약합니다.

권고:
- `where.AND[1].OR` 내부의 `endDate.gte === new Date(2026, 6, 1)` 및 `inspectionDate.gte === new Date(2026, 6, 1)`까지 검증하십시오.
- 가능하면 실제 mock 데이터 기반으로 6/30~7/1, 7/31~8/1, 8/1 단일 일정의 포함/제외를 테스트하십시오.

#### L-02. 캘린더 날짜 정규화는 로컬 타임존 전제에 의존함

**위치**: `components/witness/witness-calendar.tsx:126-138`

`new Date(dateString)` 후 `setHours(0,0,0,0)`로 로컬 자정 정규화합니다. 한국 사용자/서버 전제에서는 현재 동작이 골든패스를 만족하지만, 브라우저 타임존이 UTC보다 서쪽인 환경에서는 `YYYY-MM-DD` 파싱이 전날 로컬 날짜로 보일 수 있습니다.

권고:
- 장기적으로는 `YYYY-MM-DD`를 직접 분해해 `new Date(year, month - 1, day)`로 만드는 유틸을 두면 캘린더 셀 어긋남 리스크가 줄어듭니다.

## 요청 항목별 판정

### WI30-01. PATCH 소유권 권한 모델

**판정: OK**

`PATCH`는 대상 `id`의 `createdById`를 먼저 조회하고, 대상이 없으면 404를 반환합니다. 이후 `existing.createdById === session.user.id` 또는 `WRITER_ROLES.includes(session.user.role)`일 때만 수정합니다. 실무자가 타인 등록 건을 수정하는 경로는 403으로 닫혀 있고, 테스트도 본인 200 / 타인 403 / 404 / 팀장 전권 200을 확인합니다.

잔여 정책 리스크: 이 API는 상태만이 아니라 전체 PATCH 필드를 수정합니다. 따라서 "본인 등록 건은 전체 수정 가능"이라는 해석이 현재 구현입니다. 요청서의 Dennis 승인 범위가 이 해석을 포함한다면 승인 가능하고, 상태만 허용하려는 정책이면 별도 범위 제한이 필요합니다.

### WI30-02. `result`·`region` null 검증 완화

**판정: OK**

`body.result != null && body.result !== ""` 조건으로 `null`, `undefined`, 빈 문자열만 비움으로 허용하고, 값이 있으면 화이트리스트 검증을 유지합니다. 잘못된 문자열은 400으로 막히며, 할당부는 `body.result || null`, `body.region || null`로 nullable DB 필드와 일관됩니다. `status`는 여전히 엄격 검증이라 상태 enum 무결성도 유지됩니다.

### WI30-03. GET 월경계 겹침 쿼리 정확성

**판정: OK**

쿼리는 `inspectionDate < nextMonth`와 `(endDate >= monthStart OR endDate null AND inspectionDate >= monthStart)`를 함께 적용합니다. 시작월 이전에 시작해 해당 월에 종료되는 다일 일정, 해당 월 내 단일 일정, 해당 월에서 다음 달로 넘어가는 다일 일정을 포함하는 구조입니다. 중복 반환 리스크는 Prisma 단일 `findMany` 조건이라 별도 union 중복이 없습니다.

테스트는 구조 검증이 약해 Low로 개선 제안을 남깁니다.

### WI30-04. 캘린더 다일 렌더링

**판정: OK**

`getDayItems()`가 셀 날짜와 검사 시작/종료 날짜를 자정으로 정규화한 뒤 `cellT >= startT && cellT <= endT`로 포함 여부를 판단합니다. `endDate`가 없으면 시작일만 표시하고, `endDate < inspectionDate`는 시작일만 표시하도록 방어합니다. 요청된 2일 이상 일정 표시 문제는 해결된 것으로 판단합니다.

## 반드시 수정할 항목

1. `scripts/verify-witness-30.mjs`에서 하드코딩된 이메일/비밀번호를 제거하십시오.
2. 실제 계정 비밀번호가 이미 노출됐을 가능성이 있으면 비밀번호를 회전하십시오.

## 테스트/검증 제안

- 자격증명 제거 후 `node scripts/verify-witness-30.mjs`는 환경변수 기반으로 재실행하십시오.
- 월경계 GET 테스트를 실제 조건값까지 검증하도록 보강하십시오.
- 캘린더 날짜 파싱은 장기적으로 `YYYY-MM-DD` 직접 파싱 유틸로 통일하는 것을 권장합니다.

## 재리뷰 필요 여부

**필요**

High 보안 이슈(H-01)가 해소되기 전까지 승인 불가입니다. 자격증명 제거/회전 후 재검수를 요청하십시오.
