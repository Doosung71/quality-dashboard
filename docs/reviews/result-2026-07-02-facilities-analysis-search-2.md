# Codex (코라) Review: 시험/분석 관리 검색 (E2E-1 #2)

**검수일**: 2026-07-02
**검수자**: Codex CLI (코라)
**요청서**: `quality-dashboard/docs/reviews/request-2026-07-02-facilities-analysis-search-2.md`

## 최종 판정

조건부 승인

Critical/High 발견 사항은 없습니다. 상태 필터와 검색어는 `byStatus` 이후 `q` 검색을 적용하는 구조라 AND 조합이 맞고, 검색어가 비어 있으면 기존 상태 필터 결과가 그대로 유지됩니다. 서버 API, DB 스키마, 외부 API 전송 경로 변경도 없습니다.

남은 리스크는 `toLowerCase()` 호출이 DB non-null 제약에 강하게 의존한다는 점, 그리고 검증 스크립트가 데이터 없음/권한 실패/기능 실패를 모두 같은 실패로 보고할 수 있다는 점입니다. 기능 차단 수준은 아니므로 보류가 아니라 조건부 승인으로 판정합니다.

## 발견 사항

### Critical

없음.

### High

없음.

### Medium

1. `components/facilities/facilities-view.tsx:451`
   - 항목: FS-02. null/undefined 안전성
   - 판정: Medium
   - 이슈: 검색 필터가 `t.projectName.toLowerCase()`와 `t.sampleDescription.toLowerCase()`를 직접 호출합니다.
   - 근거: `types/test.ts`와 `prisma/schema/facilities.prisma`에서 두 필드는 non-null `string`/`String`이고, `/api/test-plans` POST도 `sampleDescription || ""`로 저장하므로 현재 정상 DB 경로에서는 안전합니다.
   - 리스크: 수동 DB 보정, 과거 마이그레이션, 외부 seed/import가 타입 계약을 깨뜨린 null 값을 주입하면 `/facilities/analysis` 전체가 런타임 크래시할 수 있습니다.
   - 권고: 방어적으로 `(t.projectName ?? "").toLowerCase()`와 `(t.sampleDescription ?? "").toLowerCase()` 형태로 바꾸면 DB 무결성 흔들림에도 화면이 유지됩니다.

2. `scripts/verify-facilities-search-2.mjs:41`
   - 항목: FS-03. 검증 스크립트의 데이터 의존성
   - 판정: Medium
   - 이슈: `/api/test-plans` 응답이 빈 배열이거나 권한 문제로 배열이 아닌 에러 객체를 반환하면 모두 `test-plans 데이터 없음 — 검색 결과 검증 불가` 또는 이후 단계 실패로 합쳐집니다.
   - 리스크: 실제 기능 결함, 검증 계정 권한 문제, 테스트 데이터 부재가 같은 실패처럼 보일 수 있어 CI/수동 검증에서 원인 분리가 늦어집니다.
   - 권고: API 응답의 `status`, 배열 여부, 길이 0을 분리해 로그를 남기고, 데이터 부재는 "환경 준비 실패"로 명확히 보고하십시오.

### Low

1. `components/facilities/facilities-view.tsx:732`
   - 항목: 빈 검색어 표시 조건
   - 판정: Low
   - 이슈: 필터 계산은 `search.trim()`을 쓰지만 빈 상태 메시지는 원본 `search` truthiness를 봅니다.
   - 리스크: 사용자가 공백만 입력했고 현재 상태 필터 결과가 0건이면 실제 검색은 수행되지 않았는데도 "검색 결과가 없습니다."가 표시됩니다.
   - 권고: 빈 상태 메시지도 `q` 기준으로 분기하면 필터 계산과 UI 메시지가 일치합니다.

2. `scripts/verify-facilities-search-2.mjs:46`
   - 항목: 검증 강도
   - 판정: Low
   - 이슈: 주석은 "무관 항목은 줄어듦"까지 검증한다고 되어 있으나 실제 검증은 샘플 프로젝트명이 보이는지만 확인합니다. `before`도 수집만 하고 사용하지 않습니다.
   - 리스크: 검색 입력이 목록을 줄이지 못해도 샘플 텍스트가 계속 보이면 V2가 통과할 수 있습니다.
   - 권고: 검색 전후 카드 수 비교 또는 표시된 모든 카드가 검색어를 포함하는지 확인하는 검증을 추가하십시오.

## 요청 항목별 판정

- FS-01. 필터 조합 로직 정확성: OK
- FS-02. null/undefined 안전성: Medium
- FS-03. 검증 스크립트의 데이터 의존성: Medium

## 반드시 수정할 항목

없음. Critical/High가 없으므로 완료 보류 대상은 아닙니다.

운영 안정성을 더 높이려면 검색 대상 필드에 nullish fallback을 넣고, 검증 스크립트에서 API 실패/권한 실패/데이터 없음/기능 실패를 분리하는 보강을 권장합니다.

## 테스트/검증 제안

- `FacilitiesView` 단위 테스트: 상태 필터만 적용했을 때 기존 목록이 유지되는지 확인.
- `FacilitiesView` 단위 테스트: 상태 필터와 검색어가 AND로 조합되는지 확인.
- `FacilitiesView` 단위 테스트: `projectName` 또는 `sampleDescription`이 nullish인 비정상 입력에서도 크래시하지 않는지 확인.
- Playwright 검증 스크립트: `/api/test-plans` HTTP status, 배열 여부, 빈 배열을 별도 실패 메시지로 분리.

## 검증 결과

- `npx tsc --noEmit`: 통과
- `npm test`: 통과, 21 test files / 194 tests passed
- `npm run build`: 성공. 기존 ESLint warning 다수는 출력되었으나 빌드는 성공했습니다.
- `node scripts/verify-facilities-search-2.mjs`: 직접 실행하지 않음. 이 스크립트는 `.env.local`의 `WITNESS_VERIFY_*` 자격증명을 로드하므로, Codex 보안 원칙상 실제 `.env.local` 내용을 읽거나 사용하는 실행은 피하고 코드 레벨로 검토했습니다.

## 재리뷰 필요 여부

필수 재리뷰는 필요 없습니다. nullish fallback 또는 검증 스크립트 실패 메시지 분리 보강 후에는 간단 재리뷰만 권장합니다.
