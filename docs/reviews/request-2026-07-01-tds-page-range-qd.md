# Codex 검수 요청 — TDS 페이지 범위 지정 (QD 통합 모듈 이식)

**요청일**: 2026-07-01
**요청자**: Claude Code (PM)
**리뷰 유형**: Implementation Review
**대상 커밋**: `fce4c47` (feat(tender): TDS 페이지 범위 지정 — TRA 기능 QD 통합 모듈에 이식 (A안))

---

## 변경 개요

TRA 별도앱에만 있던 **TDS(기술사양서) 페이지 범위 추출**을 QD 통합 대시보드 입찰 모듈에 이식했다. 두 앱에 기능이 분기되는 것을 막기 위한 A안. QD는 서버 파싱(`pdf-parse` v2.4.5)이라 TRA의 브라우저 파싱과 구조가 달라 재구현했다.

핵심 설계 판단:
- **fail-closed** — 잘못된 페이지 범위는 추출을 진행하지 않고 400으로 차단
- **파일별 범위** — 문서마다 개별 `{ startPage, endPage }` 지정
- **외부 전송 축소** — 지정한 페이지만 추출해 Claude로 전송 (전체 문서 전송 대비 범위 축소)

---

## 변경된 파일

### 1. `lib/pdf.ts` (수정)
- `PageRange` 인터페이스(`startPage?`, `endPage?`), `PdfRangeError` 클래스 신규
- `validatePageRange(range?)` — PDF 읽기 전 순수 입력 검증. 둘 다 비면 `null`(전체), 한쪽만 채우거나 비정수/1미만/시작>끝이면 `PdfRangeError`
- `extractTextFromPdf(buffer, range?)` — `getText({ first, last })` inclusive 범위 추출. 시작 페이지가 문서 `total` 초과 시 `PdfRangeError` (fail-closed)

### 2. `app/api/tenders/[id]/analyze/route.ts` (수정)
- body `ranges` 배열 수신(`documentId`별) → `Map<documentId, PageRange>` 구성
- `ranges`가 배열 아니면 400
- 문서별 `extractTextFromPdf(buffer, rangeMap.get(doc.id))`, `PdfRangeError` → 400, 그 외 throw

### 3. `app/api/tenders/[id]/reanalyze/route.ts` (수정)
- 파일 객체에 `startPage?`, `endPage?` 추가 → `extractTextFromPdf`로 전달
- `catch (e)`에서 `deleteBlob(f.blobUrl)` 후, `PdfRangeError` → 400 / 그 외 → 500

### 4. `app/tender/[id]/FilesPanel.tsx` (수정)
- 최초분석·새버전분석 양 경로에 파일별 TDS 범위 입력칸(PDF만)
- 최초분석을 즉시 실행 → 스테이징 방식으로 통일
- 클라이언트 fail-closed 검증

### 5. `lib/pdf.test.ts` (신규)
- `validatePageRange` 7케이스

---

## 검수 요청 항목

### T-01. `validatePageRange` 경계·입력 검증 완전성 (High)
**위치**: `lib/pdf.ts`
**내용**: 한쪽만 입력(시작만/끝만), 비정수, 0·음수, 시작>끝, `null`/`undefined` 혼재, 소수(`1.5`) 등 모든 잘못된 입력이 `PdfRangeError`로 fail-closed 되는지. `Number.isInteger` 검사 위치가 `hasStart !== hasEnd` 이후라 순서상 빠지는 경로가 없는지.
**리스크**: 검증 누락 시 잘못된 범위가 추출 단계로 흘러 예외가 아닌 조용한 오작동(빈 텍스트·전체 추출)으로 이어질 수 있음.

### T-02. 서버 검증이 클라이언트 검증과 독립적으로 fail-closed 되는지 (High)
**위치**: `analyze/route.ts`, `reanalyze/route.ts`
**내용**: FilesPanel 클라이언트 검증을 우회(직접 API 호출)해도 서버 단독으로 잘못된 범위를 400으로 막는지. `analyze`의 `rangeMap` 구성 시 `documentId` 없는 원소를 조용히 건너뛰는데(`typeof documentId === "string"`만 통과), 이때 해당 문서가 범위 없이 전체 추출되는 동작이 의도와 일치하는지.
**리스크**: 클라이언트 검증만 믿으면 서버 우회 시 외부 전송 범위 축소 설계가 무력화됨.

### T-03. reanalyze의 blob 정리 시점 — 검증 실패에도 blob 삭제 (Medium)
**위치**: `reanalyze/route.ts` 추출 `catch` 블록
**내용**: `catch (e)`가 `PdfRangeError`(단순 입력 검증 실패)에도 `deleteBlob(f.blobUrl)`을 먼저 호출한 뒤 400을 반환한다. 반면 `analyze`는 400 시 아무 것도 정리하지 않는다. 사용자가 범위만 잘못 입력한 재분석에서 방금 업로드한 blob이 삭제돼, 사용자가 범위를 고쳐 재시도할 때 blob이 사라진 상태가 되는지. 두 라우트 간 정리 정책 불일치가 의도적인지.
**리스크**: 입력 실수만으로 업로드 파일이 소실 → 재업로드 강요(UX 저하) 또는 부분 처리 상태.

### T-04. `getText({ first, last })` 범위 의미·부분 실패 처리 (Medium)
**위치**: `lib/pdf.ts` `extractTextFromPdf`
**내용**: `pdf-parse` v2.4.5의 `getText({ first, last })`가 inclusive 1-based 범위가 맞는지, `total` 필드가 항상 반환되는지(없으면 초과 검사가 스킵됨). `endPage`가 `total`을 초과하나 `startPage`는 유효한 경우(예: 3~9999)의 동작 — 초과분을 무시하고 남은 페이지만 추출하는지, 조용한 축소인지.
**리스크**: `total` 미반환 시 시작>총페이지 fail-closed 가드가 무력화. endPage 초과가 조용히 통과하면 사용자가 의도한 범위와 실제 추출 범위가 어긋남.

### T-05. analyze 다중 문서 부분 실패 원자성 (Low)
**위치**: `analyze/route.ts` 문서 루프
**내용**: 여러 문서 중 하나가 `PdfRangeError`로 400을 반환하면 앞서 처리된 문서의 추출 결과는 버려진다(트랜잭션 아님). 이 all-or-nothing 동작이 의도인지, 아니면 어느 문서가 실패했는지 사용자에게 식별 가능한 에러 메시지가 필요한지.
**리스크**: 다중 업로드 시 어느 문서의 범위가 잘못됐는지 알기 어려워 재시도 반복.

---

## 빌드/테스트 상태

```
npx tsc --noEmit  → 통과 (커밋 시점)
npm run build     → 통과 (커밋 시점)
npm test          → 132 tests 통과 (validatePageRange 7케이스 포함)
```

브라우저: UI·라벨·범위추출·fail-closed 2종(시작>끝·총페이지 초과) 확인 완료. AI 결과 렌더는 Preview 최종 확인 예정.

---

## 원하는 판정

- 각 항목(T-01~T-05)에 대해 Critical / High / Medium / Low / OK 판정
- 전체에 대해 승인 / 조건부 승인 / 보류 판정
- 특히 **T-02(서버 단독 fail-closed)**와 **T-03(blob 정리 정책 불일치)**에 대한 명확한 판단 요청
