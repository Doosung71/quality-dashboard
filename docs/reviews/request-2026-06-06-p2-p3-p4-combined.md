# Codex 검수 요청 — P2 런북 + P3 RAG 인제스트 + P4 D-Day 뱃지 통합 검수

**요청일**: 2026-06-06
**요청자**: Claude Code (PM)
**리뷰 유형**: Implementation Review
**선행 문서**: `docs/reviews/request-2026-06-06-nav-quicklinks-full.md` (2026-06-06 네비/퀵링크 검수 — 별도 요청)

---

## 변경 개요

오늘(2026-06-06) 3개 범위의 변경을 완료했다.

- **P2 런북**: E2E-1 실무자 검증 세션을 위한 관리자 온보딩 런북 신규 작성 (`docs/runbooks/e2e-1-admin-onboarding-runbook.md`)
- **P3 RAG 인제스트**: TRA(Tender Review Assistant)에서 부문장 최종 승인 시 분석 결과를 Neon KB에 자동 인제스트하는 기능 추가 — 지식 선순환 루프 MVP 완성
- **P4 D-Day 뱃지**: QD(quality-dashboard)의 NCR 칸반 카드와 클레임 칸반·상세 페이지에 목표기한 기준 D-Day 신호등 뱃지 추가

---

## 변경된 파일

### P2 — 관리자 온보딩 런북 (QMS Integration 루트)

#### 1. `docs/runbooks/e2e-1-admin-onboarding-runbook.md` (신규, 178줄)
- E2E-1 세션 사전 점검 체크리스트
- 테스트 계정 생성 절차 (실무자·팀장·부문장 역할별)
- 샘플 PDF 준비 가이드
- 세션 진행 중 모니터링 포인트
- 세션 종료 후 완료 기준

---

### P3 — RAG 인제스트 (tender-review-assistant)

#### 2. `lib/ingest-approved.ts` (수정 — `ingestFinalApprovedResult` 함수 신규 추가)
- 부문장 최종 승인(APPROVED) 시 요구사항 판정(Comply/Non-Comply/TBD)·이탈·RISK·VE·부문장 메모·검토의견을 구조화 텍스트로 변환
- `source_type='tra_approved'` / `source_path='tra_approved_result/{analysisId}/{i}'` 로 Neon KB 적재
- `DELETE + INSERT` 패턴으로 재승인 시 중복 방지
- `ingestStatus` 추적: `pending → done | failed`

#### 3. `app/api/analysis/[id]/final-approve/route.ts` (수정)
- `after()` 훅으로 `ingestFinalApprovedResult(analysisId)` 호출
- 인제스트 실패가 승인 응답에 영향 없도록 응답 반환 후 독립 실행

---

### P4 — D-Day 뱃지 (quality-dashboard)

#### 4. `components/ncr/ncr-view.tsx` (수정)
- `getDDay(ncr, today)` 헬퍼 추가: D+N(빨강/animate-pulse)·D-0~3(노랑)·D-4+(초록) 분류
- 칸반 카드에 `getDDay()` 뱃지 렌더링
- 빌드 경고: `Calendar` import 미사용 → 세션 중 별도 제거 예정

#### 5. `components/claims/claims-kanban.tsx` (수정)
- 클레임 칸반 카드: `targetDate` 있을 때 D-Day 뱃지, 없으면 기존 접수일(`receivedDate`) 표시 유지
- `getDDayForClaim(claim, today)` 헬퍼 추가 (NCR getDDay와 동일 분류 기준)

#### 6. `app/(dashboard)/claims/[id]/ClaimDetailPage.tsx` (수정)
- 목표기한(`targetDate`) 표시 UI 추가
- 인라인 날짜 수정 기능 (`PATCH → PUT /api/claims/[id]`)
- D-Day 뱃지 (상단 헤더 영역)

#### 7. `app/api/claims/[id]/route.ts` (수정)
- `PUT` 핸들러: `targetDate` 수정 지원 추가

#### 8. `prisma/schema/qcost.prisma` (수정)
- `Claim` 모델에 `targetDate DateTime?` 컬럼 추가

#### 9. `prisma/migrations/add_claim_target_date.sql` (신규)
- `ALTER TABLE "Claim" ADD COLUMN "targetDate" TIMESTAMP(3);` — Neon DB 직접 실행 완료

#### 10. `types/claim.ts` (수정)
- `Claim` 타입에 `targetDate?: string` 추가

#### 11. `lib/generated/prisma/*` (Prisma 클라이언트 재생성 — 3파일)
- `class.ts`, `prismaNamespace.ts`, `prismaNamespaceBrowser.ts` — 자동 생성 변경분

---

## 검수 요청 항목

### P2-A. 런북 절차 누락·오류
**위치**: `docs/runbooks/e2e-1-admin-onboarding-runbook.md`
**내용**: 계정 생성 → 샘플 PDF 업로드 → 모니터링 → 완료 기준 흐름이 실무에서 빠뜨릴 수 있는 단계 없이 완결한지 확인
**리스크**: 절차 누락 시 E2E-1 세션에서 관리자가 당황할 수 있음

### P2-B. 런북 민감 정보 노출 여부
**위치**: `docs/runbooks/e2e-1-admin-onboarding-runbook.md`
**내용**: 실명·실제 이메일(`doosung71@gmail.com` 등)·Vercel URL 등 민감 정보가 런북에 포함되어 있는지 확인
**리스크**: 런북이 공유·커밋될 경우 계정 정보 노출 가능

### P3-A. ingestFinalApprovedResult — ingestStatus 경쟁 조건
**위치**: `tender-review-assistant/lib/ingest-approved.ts` L133
**내용**: `ingestFinalApprovedResult`는 `ingestStatus: "pending"` 세팅 후 KB를 INSERT한다. 같은 analysisId에 대해 팀장 승인 인제스트(`ingestApprovedAnalysis`)와 부문장 승인 인제스트(`ingestFinalApprovedResult`)가 동시에 실행될 가능성이 있는지, `ingestStatus` 필드가 두 함수에서 공유되어 마지막 완료/실패 상태만 남는 문제가 있는지 확인
**리스크**: 두 함수 중 하나가 실패해도 나머지 결과가 `done`으로 덮어쓸 수 있음

### P3-B. DELETE + INSERT 원자성 부재
**위치**: `tender-review-assistant/lib/ingest-approved.ts` L199–L225
**내용**: `LIKE` 패턴으로 이전 청크 삭제 후 `INSERT` 반복 — 트랜잭션 없음. 중간 실패 시 일부 청크만 삭제된 채로 남을 수 있음. `neon` (http) 클라이언트로 트랜잭션 처리 가능 여부 확인
**리스크**: 재승인 시 부분 삭제 + 중복 청크 혼재 가능

### P3-C. after() 훅 — Vercel Fluid Compute 지원 여부
**위치**: `tender-review-assistant/app/api/analysis/[id]/final-approve/route.ts` L52
**내용**: Next.js 15 `after()` 훅이 Vercel Fluid Compute 환경에서 정상 실행되는지, 응답 반환 후 실행 보장이 되는지 확인. 특히 함수 cold start·인스턴스 종료 타이밍과의 충돌 가능성
**리스크**: 인제스트가 조용히 무시될 경우 KB 데이터 누락

### P4-A. getDDay() 타임존 처리
**위치**: `quality-dashboard/components/ncr/ncr-view.tsx` L34–L42
**내용**: `new Date(ncr.targetDate).getTime()`과 `new Date(today).getTime()`의 차이를 86,400,000으로 나눠 D-Day 계산. `targetDate`가 ISO 문자열(`YYYY-MM-DDTHH:mm:ssZ`)인 경우 KST 자정 기준이 아닌 UTC 오프셋이 적용되어 하루 오차 발생 가능성 확인
**리스크**: 목표기한 당일 D-Day 표시가 하루 어긋날 수 있음

### P4-B. add_claim_target_date.sql — Neon DB 실행 완료 여부 및 마이그레이션 방식
**위치**: `quality-dashboard/prisma/migrations/add_claim_target_date.sql`
**내용**: `prisma db push` 대신 SQL 직접 실행 방식 사용. 해당 SQL이 실제로 Neon DB에 반영됐는지 확인하는 방법과, `prisma.schema` + 수동 SQL + 생성 클라이언트 세 소스가 동기화 상태인지 확인
**리스크**: 클라이언트는 `targetDate`를 알지만 실제 DB 컬럼이 없으면 런타임 에러 발생

### P4-C. targetDate 미입력 클레임 하위 호환
**위치**: `quality-dashboard/components/claims/claims-kanban.tsx`, `ClaimDetailPage.tsx`
**내용**: 기존 클레임은 `targetDate`가 없음(`undefined/null`). `targetDate` 없을 때 기존 `receivedDate` 표시로 fallback하는 분기가 칸반·상세 페이지 두 곳 모두에 누락 없이 구현됐는지 확인
**리스크**: 기존 클레임 카드에서 날짜 표시 공백 또는 에러

---

## 빌드/테스트 상태

```
quality-dashboard — npm run build: 미실행 (세션 진입 직후 요청서 작성 중)
  - 이전 빌드(nav/quicklinks 기준): ✓ Compiled successfully, Warning 존재·Error 없음
  - P4 커밋(c31c997) 이후 추가 빌드 미확인
  - 알려진 경고: components/ncr/ncr-view.tsx:8 — Calendar import 미사용 (세션 중 제거 예정)

tender-review-assistant — npm run build: 미실행
  - 선행 검수(request-2026-06-06-neon-migration-test-mode-rereview) 기준 조건부 승인 상태
  - P3 커밋(2a42a47) 이후 추가 빌드 미확인
```

---

## 원하는 판정

- P2-A, P2-B / P3-A, P3-B, P3-C / P4-A, P4-B, P4-C 각 항목에 대해 **Critical / High / Medium / Low / OK** 판정
- P2·P3·P4 각 범위별로 **승인 / 조건부 승인 / 보류** 판정
- P3-A(ingestStatus 경쟁 조건)와 P4-B(SQL 마이그레이션 동기화)는 즉시 수정 필요 여부를 명확히 판단해 줄 것
