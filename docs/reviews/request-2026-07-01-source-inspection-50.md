# Codex 검수 요청 — 출장검사 서버 수량검증 (E2E-1 #50)

**요청일**: 2026-07-01
**요청자**: Claude Code (클로이, PM)
**리뷰 유형**: Implementation Review
**선행 문서**: 없음 (E2E-1 피드백 #50, 임일혁 부장)

---

## 변경 개요

임일혁 부장 제보(#50): "출장검사 등록 시 **납품 수량보다 큰 샘플·불량 수량을 넣어도 저장됨**"(납품10·샘플100·불량1000). 재현 확인 결과 **클라이언트 폼은 이미 검증**하고 있었으나, **서버 API(POST·PUT)에는 수량 정합성 검증이 전혀 없어** 클라이언트 우회·API 직접 호출·상세 수정으로 잘못된 데이터가 저장 가능한 상태였다. 서버에 fail-closed 검증을 추가했다.

**설계 판단**
- 실패 시 동작: **fail-closed** (검증 위반 시 400, 저장 안 함)
- 검증 규칙(클라이언트와 동일): 납품>0 정수 / 샘플(있으면) 1이상 정수·≤납품 / 불량(있으면) 0이상 정수·≤(샘플 ?? 납품)
- PUT 부분수정: 수량 필드가 하나라도 오면 **기존 레코드와 병합**한 3값으로 검증 (일부만 바꿔도 정합성 보장)
- 중복 방지: 공유 헬퍼 1개(`validateInspectionQuantities`)를 POST·PUT 공통 사용

---

## 변경된 파일

### 1. `lib/inspection-quantities.ts` (신규)
- `validateInspectionQuantities(quantity, sampleSize, defectCount): string | null`. 순수 함수. 위반 시 한국어 에러 메시지, 정상 null. `Number.isInteger` + 상·하한 검증.

### 2. `app/api/source-inspections/route.ts` (수정, POST)
- 필수 항목 검증 뒤 `validateInspectionQuantities(body.quantity, body.sampleSize ?? null, body.defectCount ?? null)` → 위반 시 400.

### 3. `app/api/source-inspections/[id]/route.ts` (수정, PUT)
- `quantity`·`sampleSize`·`defectCount` 중 하나라도 body에 오면 `findUnique`로 기존값 조회(없으면 404) → `body값 !== undefined ? body : 기존` 병합 후 검증 → 위반 시 400.

### 4. `app/api/source-inspections/route.test.ts` (신규)
- 헬퍼 단위 8케이스 + POST 4케이스 + PUT 4케이스 (총 16). 병합검증·404·검증스킵(첨부만 수정) 포함.

### 5. `scripts/verify-si-50.mjs` (신규)
- 인증 세션 API 검증 스크립트. 자격증명 `.env.local`(gitignore) `WITNESS_VERIFY_*`. *운영 코드 아님.*

---

## 검수 요청 항목

### SI50-01. 서버 수량검증 정확성 (High)
**위치**: `lib/inspection-quantities.ts`, `route.ts`(POST)
**내용**: 규칙(납품>0, 샘플≤납품, 불량≤(샘플??납품))이 정확하고, `null`/`undefined`(미입력) 허용·정수 검증이 올바른지. 클라이언트 우회(직접 호출) 시 fail-closed 되는지.
**리스크**: 검증 누락 시 데이터 무결성 훼손(불량률 왜곡).

### SI50-02. PUT 부분수정 병합검증 (High)
**위치**: `app/api/source-inspections/[id]/route.ts` PUT
**내용**: 수량 필드 일부만 수정할 때 기존값과 병합해 검증하는 로직이 정확한지(`!== undefined` 병합), 대상 없음 404, 수량 필드 미포함 수정(첨부만) 시 불필요한 조회·검증을 건너뛰는지.
**리스크**: 병합 누락 시 부분수정으로 정합성 우회 가능.

### SI50-03. 기존 데이터·회귀 (Medium)
**내용**: 이미 저장된 레코드(검증 이전 생성분) 수정 시 과도한 400 유발 가능성, defectRate(클라이언트 계산값) 미검증에 대한 의견.

---

## 빌드/테스트 상태

```
npx vitest run app/api/source-inspections/route.test.ts → 16 passed
npx vitest run                                          → 168 passed (18 files)
npx tsc --noEmit                                        → 통과
npm run build                                           → Compiled successfully, 91/91
브라우저/API 검증 (verify-si-50.mjs, 로컬 dev + 실 Neon DB)
  → 🟢 전체 통과 (①잘못된수량 400 ②정상 201 ③PUT병합 400 ④정리삭제)
```

DB migration·신규 env 없음.

---

## 원하는 판정

- SI50-01~03 각 항목 Critical / High / Medium / Low / OK
- 전체 승인 / 조건부 승인 / 보류
- 특히 **서버 fail-closed 완전성**(POST·PUT 양 경로, 병합검증)을 방어적 설계 관점에서 확인 요청
