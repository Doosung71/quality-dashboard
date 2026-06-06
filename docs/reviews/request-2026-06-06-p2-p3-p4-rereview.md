# Codex 검수 요청 — P2+P3+P4 통합 재검수

**요청일**: 2026-06-06
**요청자**: Claude Code (PM)
**리뷰 유형**: Re-review
**선행 문서**: `docs/reviews/result-2026-06-06-p2-p3-p4-combined.md` (1차 검수 — P2·P3 보류, P4 조건부 승인)

---

## 1차 Codex 지적 반영 현황

| 항목 | 1차 판정 | 반영 여부 | 처리 내용 |
|------|---------|---------|---------|
| P2-A | Medium | ✅ 반영 | S-10 인제스트 상태 확인 절차 + §6 재시도 행 추가 |
| P2-B | High | ✅ 반영 | 실명·이메일·Vercel URL → `<DIRECTOR_NAME>·<ADMIN_EMAIL>·<QD_URL>·<TRA_URL>` 플레이스홀더 치환 |
| P3-A | High | ✅ 반영 | 두 함수 모두 시작 시 `ingestStatus === "pending"` 체크로 동시 실행 방지 |
| P3-B | High | ✅ 반영 | 임베딩 선생성 후 `sql.transaction([DELETE, ...INSERTs])` 원자 처리 |
| P3-C | OK | — | 변경 없음 |
| P4-A | Medium | ✅ 반영 | `toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" })` KST 정규화 (NCR·클레임 두 컴포넌트) |
| P4-B | Medium | 🔲 미반영 | Neon 콘솔 실행 확인은 Dennis가 별도로 수행 예정 — 코드 정합성만 재확인 요청 |
| P4-C | OK | — | 변경 없음 |

---

## 변경된 파일

### P2 (QMS Integration 루트 — 커밋 `006fc00`)

#### 1. `docs/runbooks/e2e-1-admin-onboarding-runbook.md` (수정)
- 실명 `신두성` → `DIRECTOR_NAME` 플레이스홀더
- `doosung71@gmail.com` → `<ADMIN_EMAIL>` (전체 치환)
- `quality-dashboard-flax.vercel.app` → `<QD_URL>` (전체 치환)
- `tender-review-assistant.vercel.app` → `<TRA_URL>` (전체 치환)
- 상단에 플레이스홀더 안내 블록 추가
- §3 S-10: 인제스트 상태 확인 절차 3단계 추가
- §6 비상 절차 테이블: 인제스트 실패 재시도 행 추가

### P3 (tender-review-assistant — 커밋 `88fa211`)

#### 2. `lib/ingest-approved.ts` (수정)
- `ingestApprovedAnalysis`: 함수 시작 시 `pending` 상태 조회 → pending이면 즉시 return
- `ingestFinalApprovedResult`:
  - 함수 시작 시 동일한 `pending` 중복 실행 방지 체크 추가
  - 청크별 임베딩을 루프로 먼저 수집한 뒤 `chunkRows[]` 배열에 저장
  - `sql.transaction([DELETE, ...INSERTs])` 으로 DELETE+INSERT 원자 처리

### P4 (quality-dashboard — 커밋 `23b35cf`)

#### 3. `components/ncr/ncr-view.tsx` (수정)
- `getDDay()`: `new Date(ncr.targetDate)` → `new Date(ncr.targetDate).toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" })` 로 KST 날짜 정규화 후 비교
- `Calendar` 미사용 import 제거 (빌드 경고 해소)

#### 4. `components/claims/claims-kanban.tsx` (수정)
- `getDDay()`: `new Date(claim.targetDate)` → 동일 KST 정규화 적용

---

## 재검수 요청 항목

### RA-1. P2-B 플레이스홀더 치환 완전성
**위치**: `docs/runbooks/e2e-1-admin-onboarding-runbook.md`
**내용**: 런북 전체에서 실제 이메일·Vercel URL·실명이 누락 없이 플레이스홀더로 치환됐는지 확인
**리스크**: 치환 누락 시 여전히 민감 정보 커밋 상태 유지

### RA-2. P3-A pending 체크 유효성
**위치**: `tender-review-assistant/lib/ingest-approved.ts`
**내용**: `findUnique` → `ingestStatus === "pending"` 확인 → early return 패턴이 실제 동시 실행 시나리오를 충분히 방어하는지 확인. 두 함수(`ingestApprovedAnalysis`, `ingestFinalApprovedResult`)에 모두 적용됐는지 확인
**리스크**: 체크와 update 사이의 TOCTOU(Time-of-Check-Time-of-Use) 간격이 여전히 존재할 수 있음

### RA-3. P3-B sql.transaction() 사용 정확성
**위치**: `tender-review-assistant/lib/ingest-approved.ts` — `ingestFinalApprovedResult`
**내용**: `sql.transaction([...])` 배열 형식이 `@neondatabase/serverless` v0.10.4에서 올바르게 사용됐는지 확인. SQL 템플릿 리터럴이 awaited 없이 배열에 전달되는 방식이 타입·런타임 모두 정상인지 확인
**리스크**: API 오용 시 트랜잭션이 적용되지 않고 개별 쿼리로 실행될 수 있음

### RA-4. P4-A KST 정규화 정확성
**위치**: `quality-dashboard/components/ncr/ncr-view.tsx` L34–L43, `components/claims/claims-kanban.tsx` L21–L30
**내용**: `toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" })` 결과(`YYYY-MM-DD`)를 다시 `new Date(target)` 으로 파싱하면 UTC 자정 해석되어 `today`(동일 UTC 자정)와 정확히 비교되는지 확인. `isOverdue` 함수(ncr-view)와 D-Day 계산이 동일 기준으로 일관되게 적용되는지 확인
**리스크**: 정규화 후 재파싱 시 예상치 못한 오프셋이 재도입될 가능성

### RA-5. P4-B 코드 정합성 (DB 실행 여부 제외)
**위치**: `quality-dashboard/prisma/schema/qcost.prisma`, `types/claim.ts`, `lib/generated/prisma/`
**내용**: Prisma 스키마의 `targetDate DateTime?`, TypeScript 타입의 `targetDate?: string`, 생성된 Prisma 클라이언트 세 소스가 코드 레벨에서 정합하는지 확인. (Neon DB 실행 여부는 Dennis가 콘솔 확인 예정 — 코드 정합성만 판단)
**리스크**: 코드는 정합하지만 DB 컬럼이 없으면 런타임 에러 — 코드 레벨 체크는 분리 가능

---

## 빌드/테스트 상태

```
quality-dashboard — npm run build → ✓ Compiled successfully (Turbopack, 3.7s)
                                     Warning 존재, Error 없음 (기존 파일 경고 — 이번 변경과 무관)

tender-review-assistant — npm run build → ✓ Compiled successfully (Turbopack, 4.1s)
                                           Error 없음
```

---

## 원하는 판정

- RA-1~RA-5 각 항목에 대해 **Critical / High / Medium / Low / OK** 판정
- P2·P3·P4 각 범위별로 **승인 / 조건부 승인 / 보류** 재판정
- RA-3(transaction API 정확성)은 버전 문서 기준으로 명확히 판단해 줄 것
