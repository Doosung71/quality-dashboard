# Codex 검수 요청 — TDS 페이지 범위 지정 (QD) 재검수

**요청일**: 2026-07-01
**요청자**: Claude Code (PM)
**리뷰 유형**: Re-review
**선행 문서**: `docs/reviews/request-2026-07-01-tds-page-range-qd.md`, `docs/reviews/result-2026-07-01-tds-page-range-qd.md`

---

## 변경 개요

1차 검수 결과 **보류**(Critical 0 / High 1). 승인 차단 사유였던 H-01(analyze의 `ranges` malformed/unknown 항목이 조용히 전체 추출로 fallback)과 함께 M-01·M-02·L-01을 모두 반영했다. 코라가 요구한 서버 단독 fail-closed 테스트도 신규 추가했다. 이번 재검수는 반영분의 정확성·완전성 확인이 목적이다.

| 1차 Codex 지적 | 반영 여부 | 처리 내용 |
|---|---|---|
| **H-01 (High)** — `analyze`가 malformed/unknown `ranges`를 무시해 전체 추출 fallback | ✅ 반영 | `ranges` 각 항목 엄격 검증: 비객체·`documentId` 비문자열·요청 `documentIds`에 없는 값 → **400**. `documentIdSet`으로 unknown 차단 |
| **M-01 (Med)** — `reanalyze`가 범위 입력 오류에도 blob 삭제 | ✅ 반영 | `validatePageRange`를 blob I/O **전에 선행** → 순수 입력 오류는 blob 미삭제 400. extract 단계 `PdfRangeError`(endPage>total 등)도 blob 유지, 그 외 오류만 blob 삭제+500 |
| **M-02 (Med)** — `endPage > total`이 조용히 축소 추출 | ✅ 반영 | `extractTextFromPdf`에서 `startPage > total`에 더해 `endPage > total`도 `PdfRangeError`(400) |
| **L-01 (Low)** — 다중 문서 실패 시 식별 정보 없음 | ✅ 반영 | `PdfRangeError` 응답 메시지에 `[filename]` 접두 (analyze·reanalyze 공통) |
| 서버 테스트 추가 요구 | ✅ 반영 | `analyze/route.test.ts` 신규 5케이스 (malformed·unknown·비배열·유효범위 전달·미지정 허용) |

---

## 변경된 파일

### 1. `app/api/tenders/[id]/analyze/route.ts` (수정)
- `ranges` 파싱 블록을 엄격 검증으로 교체: 요소가 객체 아니면 400, `documentId` 비문자열/미요청 값이면 400 (`documentIdSet.has` 검사)
- 추출 `catch`의 `PdfRangeError` 응답에 `[doc.filename]` 접두 (L-01)

### 2. `app/api/tenders/[id]/reanalyze/route.ts` (수정)
- `validatePageRange` import 추가
- blob I/O **이전**에 파일별 `validatePageRange(...)` 선행 루프 → 순수 입력 오류는 blob 미삭제 400 (M-01)
- 추출 `catch`: `PdfRangeError`는 blob 유지 + `[filename]` 400, 그 외만 `deleteBlob` + 500

### 3. `lib/pdf.ts` (수정)
- `extractTextFromPdf`: `endPage > total`도 `PdfRangeError` 처리 (M-02). `startPage > total` 검사와 동일 블록

### 4. `app/api/tenders/[id]/analyze/route.test.ts` (신규)
- H-01 서버 단독 fail-closed 5케이스: documentId 없음→400, unknown documentId→400, ranges 비배열→400, 유효 range는 통과+extract에 범위 전달, ranges 미지정 전체추출 200

---

## 검수 요청 항목

### RE-01. H-01 수정의 완전성 (재검 핵심)
**위치**: `app/api/tenders/[id]/analyze/route.ts` ranges 검증 블록
**내용**: 클라이언트 우회로 구성 가능한 malformed/unknown range가 모두 400으로 막히는지. `documentIdSet`이 요청 `documentIds` 기준으로 정확히 구성되는지(중복·타입). 유효한 문서에 range 미지정은 여전히 허용되는지.
**리스크**: 우회 경로가 하나라도 남으면 "외부 전송 축소"·"서버 단독 fail-closed" 설계 목표가 무력화.

### RE-02. M-01 blob 정리 정책 일관성
**위치**: `reanalyze/route.ts` 선행 검증 루프 + 추출 catch
**내용**: 순수 입력 오류 시 blob이 실제로 보존되는지, extract 단계 `PdfRangeError`(endPage>total)에서도 blob 유지가 맞는지. analyze와 정리 정책이 이제 일치하는지. 정상 경로에서 blob 삭제가 과도하게 일어나지 않는지.
**리스크**: 정책 불일치 잔존 시 사용자 재시도 UX 저하 또는 orphan blob 누적.

### RE-03. M-02 경계 검증
**위치**: `lib/pdf.ts` total 초과 검사 블록
**내용**: `startPage > total`·`endPage > total` 두 케이스가 각각 400으로 막히는지, `total` 미반환(비number) 시 fail-open(전체 추출 유지)이 의도대로인지.
**리스크**: `total` 타입 가정이 틀리면 가드가 무력화되거나 정상 요청이 차단될 수 있음.

### RE-04. 신규 테스트 커버리지 적절성
**위치**: `analyze/route.test.ts`
**내용**: 5케이스가 H-01 회귀를 실제로 잡는지(특히 mock 경계). endPage>total·reanalyze blob 정책에 대한 테스트 공백이 재검수 승인에 문제가 되는지 판단 요청.
**리스크**: 테스트가 표면적이면 향후 회귀를 못 잡음.

---

## 빌드/테스트 상태

```
npx tsc --noEmit  → 통과
npm test          → 148 passed (17 files) — analyze route 5케이스 포함
npm run build     → 통과
```

브라우저 테스트: 미실행 (재검수 승인 후 프로덕션에서 골든패스 예정 — Dennis 확인).

---

## 원하는 판정

- 각 항목(RE-01~RE-04)에 대해 Critical / High / Medium / Low / OK 판정
- 전체에 대해 승인 / 조건부 승인 / 보류 판정
- 특히 **RE-01(H-01 완전성)**이 1차 보류의 승인 차단 사유였으므로 명확한 해소 여부 판단 요청
