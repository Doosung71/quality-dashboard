# Codex 검수 요청 — 입회검사 모듈 재검수

**요청일**: 2026-06-13  
**요청자**: Claude Code (클로이, PM)  
**리뷰 유형**: Re-review  
**선행 문서**: `docs/reviews/request-2026-06-13-witness-inspection.md` (1차 검수 요청서)  
**대상 커밋**: `b895038` (신규 구현) → `974f795` (코라 시정 반영)

---

## 변경 개요

1차 검수 요청(W-01~W-09) 중 W-01·W-02·W-04·W-05·W-06·W-07·W-09를 시정했다.  
W-03(채번 레이스 컨디션)·W-08(전체 조회 무제한)은 PoC 범위로 보류 처리했다.  
보류 항목이 의도된 tradeoff인지 재확인 요청한다.

---

## 1차 지적 → 시정 현황

| 항목 | 1차 판정 요청 | 반영 여부 | 처리 내용 |
|------|-------------|---------|---------|
| W-01 | requireActivePageSession 누락 | ✅ 시정 | 3개 Server Component 모두 교체 |
| W-02 | API 역할 권한 없음 | ✅ 시정 | PATCH/DELETE → TEAM_LEAD+ 제한, POST는 의도적 전체 허용 |
| W-03 | 채번 레이스 컨디션 | ⏳ 보류 | UNIQUE 제약으로 데이터 손상 없음, PoC 범위 허용 |
| W-04 | 소유권 검증 없는 DELETE | ✅ 시정 | createdById 일치 또는 DIRECTOR/ADMIN만 삭제 |
| W-05 | enum 서버 검증 없음 | ✅ 시정 | VALID_STATUS·VALID_RESULT allowlist + 400 반환 |
| W-06 | 에러 무음 처리 | ✅ 시정 | saveError / vocError state + 에러 메시지 UI 표시 |
| W-07 | .ics UTC 하드코딩 | ✅ 시정 | VALUE=DATE + DTSTART;VALUE=DATE:YYYYMMDD (KST 날짜 기준) |
| W-08 | GET 무제한 조회 | ⏳ 보류 | 초기 데이터 수십 건, PoC 범위 허용 |
| W-09 | 테스트 없음 | ✅ 시정 | 14 케이스 추가 → 14 passed |

---

## 시정 파일 상세

### 1. `app/(dashboard)/witness/page.tsx` (수정)
- `auth()` 직접 호출 → `requireActivePageSession()` 교체

### 2. `app/(dashboard)/witness/new/page.tsx` (수정)
- `auth()` → `requireActivePageSession()` 교체, 반환된 session으로 defaultAssignee 전달

### 3. `app/(dashboard)/witness/[id]/page.tsx` (수정)
- `auth()` → `requireActivePageSession()` 교체

### 4. `app/api/witness/[id]/route.ts` (수정)
- `WRITER_ROLES = ["TEAM_LEAD", "DIRECTOR", "ADMIN"]` 상수 정의
- PATCH: 세션 role이 WRITER_ROLES 미포함이면 403
- DELETE: 세션 role이 WRITER_ROLES 미포함이면 403, 이후 findUnique로 createdById 조회 → isOwner 또는 isAdmin만 삭제 허용
- `VALID_STATUS = ["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]`
- `VALID_RESULT = ["PASS", "FAIL", "CONDITIONAL_PASS"]`
- body.status / body.result allowlist 검증 → 미포함 시 400

### 5. `app/(dashboard)/witness/[id]/WitnessDetailClient.tsx` (수정)
- `saveError` state 추가, catch에서 `setSaveError(err.message)` 호출, UI에 에러 메시지 렌더링
- `vocError` state 추가, VoC 등록 catch에서 `setVocError(err.message)` 호출
- VoC 수정·삭제 실패 시 alert() 경량 처리 (인라인 UI 구조상 별도 state 불필요 판단)
- `.ics` 생성 로직: `toISOString().slice(0, 15) + "Z"` → `VALUE=DATE:YYYYMMDD` (날짜 문자열 직접 사용, 시각 변환 없음)

### 6. `app/api/witness/route.test.ts` (신규)
- GET 2케이스: 인증 없음 401, 인증 성공 200
- POST 4케이스: 필수 누락 400, PRACTITIONER 등록 가능 201, 채번 001, 채번 시퀀스
- PATCH 4케이스: PRACTITIONER 403, 유효하지 않은 status 400, 유효하지 않은 result 400, TEAM_LEAD 성공 200
- DELETE 4케이스: PRACTITIONER 403, 타인 건 삭제 403, 본인 건 삭제 200, DIRECTOR 타인 건 삭제 200

---

## 검수 요청 항목

### RE-01. W-02 시정 재확인 — POST 역할 정책
**위치**: `app/api/witness/route.ts:42-75`  
**내용**: POST(등록)는 PRACTITIONER를 포함한 모든 인증 사용자에게 허용. Dennis 설계 판단(B안) 반영: 실무자가 입회검사를 직접 등록할 수 있어야 함.  
**확인 요청**: 이 정책이 다른 모듈(QPA: TEAM_LEAD 이상만 등록)과의 일관성 관점에서 허용 가능한지, 추가 역할 제한이 필요한지 판단 요청.

### RE-02. W-04 시정 재확인 — VoC DELETE 소유권
**위치**: `app/api/witness/[id]/voc/[vocId]/route.ts`  
**내용**: VoC DELETE는 1차 요청서에서 소유권 미검증을 지적했으나, voc/[vocId]/route.ts에는 아직 소유권 체크가 없음. WitnessInspection DELETE에만 소유권 체크가 적용됨.  
**확인 요청**: VoC DELETE도 createdById 검증이 필요한지 판단 요청.

### RE-03. W-06 시정 재확인 — VoC 수정·삭제 에러 처리
**위치**: `app/(dashboard)/witness/[id]/WitnessDetailClient.tsx:146-170`  
**내용**: 기본정보 저장·VoC 등록은 state 기반 에러 UI로 처리. VoC 수정(saveVocResponse)·VoC 삭제(deleteVoC)는 alert() 사용.  
**확인 요청**: alert() 방식이 코라 검수 기준에서 Medium 이상 지적 대상인지 판단 요청.

### RE-04. W-03·W-08 보류 타당성 확인
**위치**: `app/api/witness/route.ts`  
**내용**:
- W-03 (채번 레이스): findFirst(desc) + create 사이 동시 POST 시 UNIQUE 충돌 → 500. 현재 PoC 단계에서 동시 등록 가능성 낮음.
- W-08 (무제한 조회): year/month 없으면 전체 반환. 현재 데이터 수십 건 수준.  
**확인 요청**: 두 항목이 PoC 단계에서 Low로 남겨도 되는지, 아니면 시정 권고인지 판단 요청.

---

## 빌드/테스트 상태

```
npx vitest run → 84 passed (9 test files) ✅
npm run build  → 미실행 (브라우저 골든패스 테스트 전)
```

테스트 세부: 기존 70 passed + witness 14 passed = 84 passed 전체 통과.  
빌드 미실행 사유: 브라우저 골든패스 테스트가 이번 세션에서 아직 미완료. 코라 검수 결과 수령 후 수정사항 반영과 함께 빌드 실행 예정.

---

## 원하는 판정

- RE-01~RE-04 각 항목에 대해 Critical / High / Medium / Low / OK 판정
- W-03·W-08 보류 타당성에 대한 명시적 판단 (승인·재검토 요망)
- 전체에 대해 승인 / 조건부 승인 / 보류 판정
