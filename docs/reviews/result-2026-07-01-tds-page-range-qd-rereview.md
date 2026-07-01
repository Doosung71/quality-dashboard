# Codex (코라) Review: TDS 페이지 범위 지정 — QD 재검수

**검수일**: 2026-07-01
**검수자**: Codex CLI (코라)
**요청서**: `C:\Dev\QMS 2.0 Integration\quality-dashboard\docs\reviews\request-2026-07-01-tds-page-range-qd-rereview.md`
**선행 결과서**: `C:\Dev\QMS 2.0 Integration\quality-dashboard\docs\reviews\result-2026-07-01-tds-page-range-qd.md`
**검수 방식**: 재검수 정적 리뷰 + 대상 테스트/전체 테스트/타입체크/빌드 실행

## 최종 판정

**승인**

1차 보류 사유였던 H-01은 해소됐습니다. 재검수 범위에서 Critical/High 발견 사항은 없습니다.

## 검수 범위

- `app/api/tenders/[id]/analyze/route.ts`
- `app/api/tenders/[id]/reanalyze/route.ts`
- `lib/pdf.ts`
- `app/api/tenders/[id]/analyze/route.test.ts`
- 선행 결과서의 H-01, M-01, M-02, L-01 반영 여부

참고: 작업트리에는 TDS 재검수 범위 외 변경(`app/api/tenders/[id]/route.ts`, `app/tender/[id]/page.tsx`, Prisma schema/generated files, project history 관련 신규 파일 등)도 함께 존재합니다. 이 결과서는 요청서가 지정한 TDS 페이지 범위 재검수 범위만 판정합니다.

## 검증 근거

- `npm test -- app/api/tenders/[id]/analyze/route.test.ts lib/pdf.test.ts` → 통과: 2 files, 12 tests.
- `npx tsc --noEmit` → 통과.
- `npm test` → 통과: 17 files, 148 tests.
- `npm run build` → 통과. 기존 미사용 import/표현식 등 ESLint warning은 있으나 빌드 실패 없음.
- `pdf-parse` v2.4.5의 `first`+`last` inclusive range 및 `TextResult.total: number` 전제는 1차 검수에서 로컬 패키지 타입/README와 샘플 PDF로 확인한 내용을 재사용했습니다.

## 발견 사항

### Critical

없음.

### High

없음.

### Medium

없음.

### Low

#### L-01. 동일 `documentId`에 대한 중복 `ranges` 정책이 명시되어 있지 않음

**위치**: `app/api/tenders/[id]/analyze/route.ts:67-80`

malformed/unknown range 차단은 정상적으로 반영됐습니다. 다만 같은 `documentId`가 `ranges` 배열에 여러 번 들어오면 `Map.set` 특성상 마지막 range가 조용히 승리합니다. 이는 전체 추출 fallback으로 이어지는 H-01 유형은 아니고, 정상 요청 경계의 모호성에 가깝습니다.

권고:
- 중복 range를 400으로 막거나, "마지막 값 우선" 정책을 테스트/문서에 명시하십시오.

## 재검수 항목별 판정

### RE-01. H-01 수정의 완전성

**판정: OK**

`ranges`가 제공되면 배열 여부를 확인하고, 각 항목이 객체인지 검사하며, `documentId`가 문자열이고 요청 `documentIds`에 포함되어 있는지 `documentIdSet`으로 검증합니다. `documentId` 없는 range, unknown `documentId`, 비배열 `ranges`는 모두 400으로 막힙니다. 유효한 문서에 range를 미지정하는 경로는 계속 허용되어 전체 추출 정책도 유지됩니다.

1차 승인 차단 사유였던 "malformed/unknown range가 조용히 무시되어 전체 추출로 fallback" 되는 경로는 해소됐습니다.

### RE-02. M-01 blob 정리 정책 일관성

**판정: OK**

`reanalyze`는 `validatePageRange`를 blob I/O 전에 선행 실행합니다. 순수 입력 오류는 `[filename]` 포함 400으로 반환되고, `readBlobBuffer`나 `deleteBlob` 경로로 들어가지 않습니다. 추출 단계에서 발생하는 `PdfRangeError`도 blob을 유지한 채 400으로 반환하고, 그 외 오류에서만 `deleteBlob` 후 500을 반환합니다.

`analyze`와 비교해 입력 오류에서 사용자 파일을 제거하지 않는 방향으로 정리 정책이 맞춰졌습니다.

### RE-03. M-02 경계 검증

**판정: OK**

`extractTextFromPdf`는 `total`이 숫자인 경우 `startPage > total`과 `endPage > total`을 모두 `PdfRangeError`로 차단합니다. 1차 검수에서 확인한 `pdf-parse`의 조용한 축소 추출 동작을 코드 레벨에서 막는 수정입니다.

`total`이 number가 아닌 경우에는 기존처럼 fail-open 됩니다. 다만 현재 로컬 타입 정의상 `TextResult.total`은 `number`이고, 1차 샘플 PDF 런타임에서도 `total`이 반환됐으므로 승인 차단 리스크로 보지 않습니다.

### RE-04. 신규 테스트 커버리지 적절성

**판정: OK**

`analyze/route.test.ts`의 5개 케이스는 H-01 회귀를 직접 겨냥합니다.

- `documentId` 없는 range → 400, 추출 미호출
- unknown `documentId` range → 400, 추출 미호출
- `ranges` 비배열 → 400
- 유효 range → 200, `extractTextFromPdf`에 range 전달
- `ranges` 미지정 → 200, 전체 추출 허용

테스트 mock은 route 경계에서 H-01을 잡기에 충분합니다. `endPage > total`과 `reanalyze` blob 유지 정책 테스트는 아직 공백이지만, 이번 승인 차단 사유였던 H-01 회귀 방지 요건은 충족합니다.

## 반드시 수정할 항목

없음.

## 테스트/검증 제안

- `extractTextFromPdf` 실제 PDF fixture 테스트에 `startPage > total`, `endPage > total` 케이스를 추가하면 M-02 회귀 방지가 더 단단해집니다.
- `reanalyze` 라우트 테스트에서 순수 `PdfRangeError`와 추출 단계 `PdfRangeError` 모두 `deleteBlob`이 호출되지 않는지 확인하면 M-01 정책을 고정할 수 있습니다.
- `ranges` 중복 `documentId` 정책을 400 또는 last-wins 중 하나로 명시하고 테스트하는 것을 권장합니다.
- 현재 `npm run build`는 통과하지만, 기존 ESLint warning은 별도 정리 대상입니다.

## 재리뷰 필요 여부

**불필요**

Critical/High가 없고 1차 보류 조건이 해소됐으므로, TDS 페이지 범위 지정 재검수는 승인합니다.
