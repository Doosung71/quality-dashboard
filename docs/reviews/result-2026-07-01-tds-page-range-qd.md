# Codex (코라) Review: TDS 페이지 범위 지정 — QD 통합 모듈

**검수일**: 2026-07-01
**검수자**: Codex CLI (코라)
**요청서**: `quality-dashboard/docs/reviews/request-2026-07-01-tds-page-range-qd.md`
**대상 커밋**: `fce4c47` (`quality-dashboard`)
**검수 방식**: 정적 코드 리뷰 + 로컬 패키지 문서/타입 확인 + 샘플 PDF 런타임 확인 + 대상 단위 테스트 실행

## 최종 판정

**보류**

Critical 발견 사항은 없습니다. 그러나 High 1건이 남아 있어 `CODEX_REVIEWER_START.md`의 완료 판정 기준상 승인할 수 없습니다.

완료 가능 조건:
- `analyze` API가 `ranges` 배열의 malformed/unknown 항목을 조용히 무시하지 않고 400으로 fail-closed 처리해야 합니다.
- 이후 관련 서버 검증 테스트가 추가되면 재리뷰를 권고합니다.

## 검수 범위

- `lib/pdf.ts`
- `lib/pdf.test.ts`
- `app/api/tenders/[id]/analyze/route.ts`
- `app/api/tenders/[id]/reanalyze/route.ts`
- `app/tender/[id]/FilesPanel.tsx`
- `pdf-parse` v2.4.5 로컬 타입/README

## 검증 근거

- `quality-dashboard` 작업트리 상태: 요청서 `docs/reviews/request-2026-07-01-tds-page-range-qd.md`만 untracked, 구현 파일 추가 변경 없음.
- 대상 커밋 확인: `fce4c47 feat(tender): TDS 페이지 범위 지정 — TRA 기능 QD 통합 모듈에 이식 (A안)`.
- `npm test -- lib/pdf.test.ts`: 1 file / 7 tests passed.
- `pdf-parse` 로컬 타입 정의 확인: `first`+`last`는 inclusive range, `TextResult.total`은 `number`.
- 샘플 PDF 런타임 확인: 총 10페이지 PDF에서 `{ first: 1, last: 110 }`은 오류 없이 전체 10페이지 텍스트를 반환했고, `{ first: 11, last: 110 }`은 빈 텍스트와 `total: 10`을 반환했습니다.
- `npm run build`, `npx tsc --noEmit`, 전체 `npm test`는 이번 리뷰에서 독립 실행하지 않았고 요청서의 커밋 시점 증거만 참조했습니다.

## 발견 사항

### Critical

없음.

### High

#### H-01. `analyze`의 `ranges` 항목 검증이 엄격하지 않아 malformed range가 전체 추출로 조용히 전환됨

**위치**: `app/api/tenders/[id]/analyze/route.ts:57-69`, `app/api/tenders/[id]/analyze/route.ts:86-93`

`ranges`가 배열인지 여부는 검증하지만, 배열 내부 원소가 `{ documentId, startPage, endPage }` 형태인지 엄격하게 검증하지 않습니다. `documentId`가 없거나 문자열이 아니면 해당 항목을 조용히 건너뛰고, 이후 `rangeMap.get(doc.id)`가 `undefined`가 되어 해당 문서는 전체 PDF로 추출됩니다.

재현 가능한 서버 우회 시나리오:

```json
{
  "documentIds": ["doc-a"],
  "ranges": [{ "startPage": 3, "endPage": 5 }]
}
```

이 요청은 사용자가 범위를 보낸 것처럼 보이지만 `documentId`가 없어 400이 아니라 전체 추출로 진행됩니다. 알 수 없는 `documentId`를 가진 range도 동일하게 무시됩니다. "외부 전송 축소"와 "서버 단독 fail-closed" 설계 목표에서는 잘못된 범위 메타데이터를 조용히 무시하는 것이 High 리스크입니다.

권고:
- `ranges`가 제공된 경우 각 원소의 객체 여부, `documentId` 문자열 여부, `documentIds` 포함 여부를 검증하고 실패 시 400을 반환하십시오.
- unknown `documentId` range는 400으로 막으십시오.
- 문서별 range 미지정은 정책상 허용할 수 있지만, malformed/unknown range는 절대 전체 추출 fallback으로 처리하지 않는 것이 안전합니다.

요청 항목 매핑: **T-02 = High**

### Medium

#### M-01. `reanalyze`는 단순 페이지 범위 입력 오류에도 업로드 blob을 삭제함

**위치**: `app/api/tenders/[id]/reanalyze/route.ts:64-76`

`catch (e)`에서 `deleteBlob(f.blobUrl)`을 먼저 호출한 뒤 `PdfRangeError`를 400으로 반환합니다. 따라서 사용자가 새 버전 분석용 파일을 업로드한 뒤 페이지 범위만 잘못 입력한 경우에도 방금 업로드한 blob이 삭제됩니다. 현재 클라이언트는 재시도 시 다시 업로드할 수 있으므로 데이터 영구 손실보다는 UX/정책 불일치 문제에 가깝지만, `analyze`와 정리 정책이 달라 예측 가능성이 낮습니다.

권고:
- 입력 검증 실패(`PdfRangeError`)는 blob 삭제 대상에서 제외하거나, 삭제한다면 "재시도 시 재업로드 필요"가 명확한 정책인지 문서화하십시오.
- 가능하면 `readBlobBuffer` 전에 순수 range 검증을 먼저 수행해 입력 오류와 blob fetch/추출 오류를 분리하십시오.

요청 항목 매핑: **T-03 = Medium**

#### M-02. `endPage`가 총 페이지를 초과하면 조용히 가능한 페이지만 추출됨

**위치**: `lib/pdf.ts:75-81`

현재 구현은 `validated.startPage > total`만 `PdfRangeError`로 막습니다. 로컬 샘플 PDF 검증 결과, `pdf-parse` v2.4.5는 `{ first: 1, last: total + 100 }`에 대해 오류를 내지 않고 가능한 페이지 전체를 반환했습니다. 즉 사용자가 `3~9999`를 입력하면 실제로는 `3~total`만 추출될 수 있습니다.

이는 보안상 전체 문서 초과 전송으로 이어지지는 않지만, "잘못된 페이지 범위는 추출을 진행하지 않는다"는 fail-closed 설명과는 다릅니다.

권고:
- `validated.endPage > total`도 400으로 막으십시오.
- `startPage > total` 및 `endPage > total` 케이스를 `extractTextFromPdf` 또는 라우트 레벨 테스트에 추가하십시오.

요청 항목 매핑: **T-04 = Medium**

### Low

#### L-01. 다중 문서 실패 메시지에 어떤 문서가 실패했는지 식별 정보가 없음

**위치**: `app/api/tenders/[id]/analyze/route.ts:86-94`

여러 문서 중 하나가 `PdfRangeError`를 내면 전체 요청은 400으로 중단되며, 앞서 추출된 텍스트는 폐기됩니다. all-or-nothing 자체는 안전한 정책입니다. 다만 반환 메시지에 `filename` 또는 `documentId`가 없어 사용자는 어떤 파일 범위를 고쳐야 하는지 알기 어렵습니다.

권고:
- `PdfRangeError` 응답에 `doc.filename` 또는 `doc.id`를 포함해 재시도 가능성을 높이십시오.

요청 항목 매핑: **T-05 = Low**

### OK

#### T-01. `validatePageRange` 경계·입력 검증

**위치**: `lib/pdf.ts:29-45`, `lib/pdf.test.ts:4-39`

`undefined`, 빈 객체, 정상 범위, 한쪽만 입력, 시작>끝, 0/음수, 소수는 기대대로 처리됩니다. `hasStart !== hasEnd` 이후 `Number.isInteger`가 실행되는 순서에서도 `null`/`undefined` 혼재가 빠지는 경로는 보이지 않습니다.

판정: **OK**

#### T-02 일부. `reanalyze` 서버 단독 범위 검증

**위치**: `app/api/tenders/[id]/reanalyze/route.ts:48-54`, `app/api/tenders/[id]/reanalyze/route.ts:64-75`

`startPage`/`endPage` 타입이 문자열, 소수, 한쪽 누락, 0 이하, 시작>끝이면 `extractTextFromPdf`의 `validatePageRange`를 거쳐 400으로 매핑됩니다. 단, 위 M-01처럼 400 전에 blob 삭제가 발생합니다.

판정: **OK with Medium caveat**

## 요청 항목별 판정 요약

| 항목 | 판정 | 요약 |
|---|---|---|
| T-01 | OK | 순수 입력 검증과 7개 단위 테스트는 적절함 |
| T-02 | High | `analyze`가 malformed/unknown `ranges`를 무시해 전체 추출 fallback 가능 |
| T-03 | Medium | `reanalyze`가 범위 입력 오류에도 blob 삭제 |
| T-04 | Medium | `endPage > total`이 조용히 가능한 범위로 축소됨 |
| T-05 | Low | all-or-nothing은 안전하나 실패 문서 식별성이 낮음 |

## 반드시 수정할 항목

1. `analyze` API에서 `ranges` 배열 내부 원소를 엄격 검증하고 malformed/unknown `documentId`를 400으로 차단하십시오.
2. 위 High 수정에 대한 서버 테스트를 추가하십시오. 특히 `ranges: [{ startPage, endPage }]`, unknown `documentId`, 유효한 range, range 미지정 문서 허용 정책을 분리해 검증해야 합니다.

## 테스트/검증 제안

- `extractTextFromPdf`에 실제 또는 fixture PDF 기반 테스트를 추가해 `startPage > total`, `endPage > total`, 정상 부분 추출을 검증하십시오.
- `analyze` 라우트 테스트에서 클라이언트 우회 요청을 직접 구성해 서버 단독 fail-closed를 검증하십시오.
- `reanalyze` 라우트에서 `PdfRangeError` 발생 시 blob 삭제 여부를 정책에 맞게 테스트하십시오.
- 수정 후 `npx tsc --noEmit`, `npm run build`, 전체 `npm test`를 다시 실행하십시오.

## 재리뷰 필요 여부

**필요**

High 이슈(H-01)가 남아 있어 재리뷰 전에는 완료 승인 불가입니다. H-01 수정 후 M-01/M-02 처리 여부와 함께 재리뷰를 요청하십시오.
