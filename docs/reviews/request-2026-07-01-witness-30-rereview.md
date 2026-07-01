# Codex 재검수 요청 — 입회검사 #30 (H-01 자격증명 + L-01 테스트 보강)

**요청일**: 2026-07-01
**요청자**: Claude Code (클로이, PM)
**리뷰 유형**: Re-review
**선행 문서**: `docs/reviews/result-2026-07-01-witness-30-status-calendar.md` (1차 판정: 보류)

---

## 변경 개요

1차 검수에서 Witness 기능 로직(WI30-01~04)은 모두 OK 판정을 받았고, **보류 사유는 H-01(검증 스크립트 자격증명 하드코딩) 단 1건**이었다. 이번 재검수는 H-01 해소 + L-01 테스트 보강을 반영한 것이다. 기능 로직 코드(`route.ts` 3종·`witness-calendar.tsx`)는 1차 승인 이후 **변경 없음**.

### 1차 지적 반영표

| 1차 Codex 지적 | 반영 여부 | 처리 내용 |
|---|---|---|
| **H-01 (High)** 신규 스크립트 자격증명 하드코딩 | ✅ 반영 | 아래 상세 — 코라가 본 신규 파일뿐 아니라 **기존 커밋본 2개까지 전수 제거** |
| **L-01 (Low)** 월경계 GET 테스트가 구조만 검증 | ✅ 반영 | 실제 경계값(monthStart·endDate.gte·null 분기)까지 단언 추가 |
| **L-02 (Low)** 캘린더 타임존 유틸 통일 | ⏸ 백로그 | 한국 전용 환경이라 현재 골든패스 만족. 장기 개선 과제로 이월 |

---

## 변경된 파일 (이번 재검수 대상)

### 1. `scripts/verify-witness-30.mjs` (수정)
- 자격증명 하드코딩 제거 → gitignore된 `.env.local`에서 `WITNESS_VERIFY_EMAIL`/`WITNESS_VERIFY_PASSWORD` 로드(dotenv). 미설정 시 로그인 시도 없이 exit 1.

### 2. `scripts/verify-witness.mjs` (수정) — *코라 1차 미지적, 클로이 자체 발견*
- 동일 하드코딩(`admin1234!`)이 세션29부터 **이미 커밋돼 있었음**. 동일하게 env var 전환.

### 3. `scripts/check-pw.ts` (수정) — *코라 1차 미지적, 클로이 자체 발견*
- 하드코딩된 비밀번호·이메일 제거 → `CHECK_EMAIL`/`CHECK_PASSWORD` env. SQL 이메일도 파라미터 바인딩(`$1`)으로 전환.

### 4. `app/api/witness/route.test.ts` (수정)
- L-01 반영: 월경계 GET 테스트가 `nextMonth`·`monthStart`·`OR[0].endDate.gte`·`OR[1].endDate===null`·`OR[1].inspectionDate.gte`까지 실제 값 단언.

> **참고 — 비밀번호 회전 완료**: 노출됐던 `admin1234!`는 Dennis가 계정 비밀번호를 변경(회전)하여 무효화함. git 히스토리의 과거 노출값은 회전으로 실효 처리(히스토리 재작성은 비수행).

---

## 재검수 요청 항목

### RE-01. 자격증명 전수 제거 확인 (H-01 클로즈 여부)
**위치**: `scripts/verify-witness-30.mjs`, `scripts/verify-witness.mjs`, `scripts/check-pw.ts`
**내용**: 세 스크립트 모두 하드코딩 자격증명이 남아있지 않고 env var로만 주입되는지, 미설정 시 안전 종료(fail-closed)하는지 확인. 작업 트리 `grep admin1234` 결과 0건.
**리스크**: 하나라도 누락 시 H-01 미해소.

### RE-02. L-01 테스트 보강 적정성
**위치**: `app/api/witness/route.test.ts`
**내용**: 월경계 쿼리 테스트가 실제 경계값까지 검증하도록 강화됐는지, 과검증/취약점이 없는지 확인.

---

## 빌드/테스트 상태

```
npx vitest run app/api/witness/route.test.ts → 18 passed
npx vitest run                               → 152 passed (17 files)
npx tsc --noEmit                             → 통과
npm run build                                → Compiled successfully, 91/91
브라우저 골든패스 (verify-witness-30.mjs, .env.local 자격증명, 실 Neon DB)
  → 🟢 전체 통과 (①상태 DB반영 COMPLETED, ③캘린더 2셀, 테스트데이터 삭제)
작업 트리 grep "admin1234"                    → 0건
```

DB migration·신규 env(운영) 없음. `.env.local`은 로컬 검증 전용(gitignore).

---

## 원하는 판정

- RE-01·RE-02 각 항목 Critical / High / Medium / Low / OK
- 전체 승인 / 조건부 승인 / 보류
- 특히 **H-01 완전 클로즈 여부**(3개 스크립트 전수 + 회전) 확인 요청
