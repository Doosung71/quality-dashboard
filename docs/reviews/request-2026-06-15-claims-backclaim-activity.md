# Codex 검수 요청 — 귀책처 선택 + Back-claim 진행 현황 + 활동현황 집계 확장

**요청일**: 2026-06-15  
**요청자**: Claude Code (클로이, PM)  
**리뷰 유형**: Implementation Review  
**선행 문서**: 없음

---

## 변경 개요

세션27에서 클레임 상세 페이지에 귀책처(responsibleParty) 드롭다운 필드와 Back-claim 진행 현황 CRUD 섹션을 신규 구현했다. BackClaim은 Claim과 1:N 관계로 DB 테이블을 신규 생성하고, Neon 프로덕션 DB에 수동 마이그레이션(SQL 직접 실행)을 완료했다. 아울러 관리자 활동현황 집계에서 누락됐던 5개 모듈(입찰·입회검사·회의록·QPA·수주PJT)을 추가하고 활동현황 테이블 레이아웃을 수정했다.

---

## 변경된 파일

### 1. `app/api/claims/[id]/backclaims/route.ts` (신규)
- Back-claim 목록 GET + 신규 등록 POST
- 인증: `requireActiveSession()`
- POST 입력 검증: vendorName 필수, claimedAmount > 0

### 2. `app/api/claims/[id]/backclaims/[bcId]/route.ts` (신규)
- Back-claim 개별 수정 PUT + 삭제 DELETE
- 인증: `requireActiveSession()`

### 3. `app/api/claims/[id]/route.ts` (수정)
- PUT에 `responsibleParty` 필드 추가
- Closed 전환 시 `after()` 훅으로 RAG 인제스트 연동 기존 유지

### 4. `app/api/claims/route.ts` (수정)
- POST에 `responsibleParty` 필드 추가

### 5. `app/(dashboard)/claims/[id]/ClaimDetailPage.tsx` (수정)
- 귀책처 드롭다운 (`RESPONSIBLE_PARTY_OPTIONS`) + `__custom__` sentinel → 직접 입력
- Back-claim 섹션 CRUD: 등록 폼, 인라인 수정, 삭제, 회수율 자동 계산 표시
- Back-claim 목록 `useEffect`로 마운트 시 fetch

### 6. `types/claim.ts` (수정)
- `BackClaim`, `BackClaimStatus` 타입 추가
- `RESPONSIBLE_PARTY_OPTIONS`, `BACK_CLAIM_STATUS_LABELS` 상수 추가

### 7. `prisma/schema/qcost.prisma` (수정)
- `BackClaim` 모델 추가 (`BackClaimStatus` enum 포함)

### 8. `prisma/migrations/claim_responsible_party_backclaim.sql` (신규)
- `Claim.responsibleParty TEXT` 컬럼 추가
- `BackClaimStatus` enum 생성 (DO $$ BEGIN 패턴으로 중복 방지)
- `BackClaim` 테이블 생성 + 인덱스 + FK ON DELETE CASCADE

### 9. `app/api/admin/activity/route.ts` (수정)
- `Promise.all` 배열에 Tender·WitnessInspection·Meeting·QpaAudit·AwardedProject 5개 모듈 groupBy 추가
- 합산 로직(toMap) 및 result 매핑 확장

### 10. `app/api/admin/activity/[userId]/route.ts` (신규 → 수정)
- 개별 사용자 타임라인에 위 5개 모듈 findMany 추가

### 11. `app/admin/users/client.tsx` (수정)
- 컨테이너 `max-w-5xl` → `max-w-7xl`
- 셀 패딩 `px-3` → `px-2`, 폰트 `text-sm` → `text-xs`
- 활동현황 집계 컬럼 5개 추가 (tenders·witnessInspections·meetings·qpaAudits·awardedProjects)

---

## 검수 요청 항목

### BC-01. Back-claim 삭제 역할 제한 없음
**위치**: `app/api/claims/[id]/backclaims/[bcId]/route.ts` — DELETE
**내용**: `requireActiveSession()` 통과 시 로그인한 모든 사용자가 타인의 Back-claim을 삭제 가능. 역할(TEAM_LEAD 이상) 또는 소유권 체크 없음.  
**리스크**: PRACTITIONER 사용자가 타인이 등록한 Back-claim을 무단 삭제 가능.

### BC-02. PUT에서 bcId ↔ claimId 교차 검증 없음
**위치**: `app/api/claims/[id]/backclaims/[bcId]/route.ts` — PUT
**내용**: `prisma.backClaim.update({ where: { id: bcId } })` 시 해당 bcId가 path param의 claimId에 속하는지 확인하지 않음.  
**리스크**: 공격자가 다른 클레임의 Back-claim ID를 알 경우 조작 가능. `where: { id: bcId, claimId: id }` 패턴 필요.

### BC-03. BackClaimStatus 서버 enum 검증 없음
**위치**: `app/api/claims/[id]/backclaims/route.ts` POST, `[bcId]/route.ts` PUT  
**내용**: `body.status as never`로 타입 캐스팅만 하고 실제 값 검증 없음.  
**리스크**: 임의 문자열이 DB의 enum 필드에 저장 시도 → DB 오류 또는 의도치 않은 상태 저장.

### BC-04. 귀책처 직접 입력값 서버 검증 없음
**위치**: `app/api/claims/[id]/route.ts` PUT  
**내용**: `responsibleParty`를 any string으로 허용. RESPONSIBLE_PARTY_OPTIONS 범위를 벗어난 값도 저장.  
**리스크**: 현재는 자유 텍스트 필드(`TEXT`)이므로 스키마 위반은 없으나, XSS 주입 시 클라이언트 렌더 위험. 길이 상한 제한 없음.

### BC-05. claimedAmount 타입 안전성
**위치**: `app/api/claims/[id]/backclaims/route.ts` POST  
**내용**: `body.claimedAmount`를 `number`로 타입 선언했으나, JSON에서는 문자열로 전달될 수 있음. `typeof` 또는 `parseFloat` 처리 없이 `<= 0` 비교.  
**리스크**: 클라이언트가 문자열 "100"을 보내면 비교 실패 시 DB에 잘못된 값 저장 가능.

### AC-01. limit 파라미터 NaN 처리
**위치**: `app/api/admin/activity/[userId]/route.ts`  
**내용**: `parseInt(searchParams.get("limit") ?? "100", 500)` — 10진수 기수 인자가 500으로 잘못 전달됨. `parseInt` 2번째 인자는 기수(radix)이므로 `parseInt(str, 10)` 이어야 함. 또한 문자열이 들어오면 NaN → `items.slice(0, NaN)` = 빈 배열.  
**리스크**: `?limit=abc` 요청 시 빈 타임라인 반환. `parseInt(…, 10)` + NaN fallback 필요.

### AC-02. 활동현황 집계 — ADMIN 사용자 제외 로직 미확인
**위치**: `app/api/admin/activity/route.ts`  
**내용**: 이전 세션에서 리더보드는 ADMIN 자동 제외했으나, 현재 route.ts의 result 배열에서 ADMIN 필터링 여부 확인 필요.  
**리스크**: 부문장·CEO 시연 시 관리자 계정이 리더보드 상위에 노출될 수 있음.

---

## 빌드/테스트 상태

```
npm run build — 세션27 커밋(749c165) 기준 Vercel 자동 배포 READY 확인
npm test      — 미실행 (테스트 대상 파일 미포함)
```

빌드는 Vercel 프로덕션 배포 성공으로 대체 확인. 로컬 `npm run build` 별도 미실행.

---

## 원하는 판정

- 각 항목(BC-01~05, AC-01~02)에 대해 Critical / High / Medium / Low / OK 판정
- 전체에 대해 승인 / 조건부 승인 / 보류 판정
