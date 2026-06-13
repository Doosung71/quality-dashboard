# Codex 검수 요청 — 입회검사 모듈 신규 구현

**요청일**: 2026-06-13  
**요청자**: Claude Code (클로이, PM)  
**리뷰 유형**: Implementation Review  
**선행 문서**: `docs/reviews/result-2026-06-12-session15-16-combined.md` (직전 조건부 승인)

---

## 변경 개요

세션20(2026-06-13)에 고객 품질 관리 영역의 첫 모듈인 **입회검사(Witness Inspection)** 기능을 신규 구현했다.
WitnessInspection·WitnessVoC Prisma 모델, 4개 API 라우트, 달력/리스트 이중 뷰, 등록 폼, 상세 페이지(기본정보·문서첨부·VoC 탭), .ics 내보내기, 사이드바 고객 품질 관리 섹션 신설이 포함된다.
검사번호 자동 채번(WI-YYYY-NNN)과 고객 VoC(요청사항) CRUD가 핵심 도메인 기능이다.

---

## 변경된 파일

### 1. `prisma/schema/customer.prisma` (신규)
- WitnessStatus / VoCCategory / VoCPriority / VoCStatus enum 4개 정의
- WitnessInspection 모델: inspNo(UNIQUE), customer, projectName, inspectionDate, assigneeId/Name, status, result(InspectionResult?), attachments(Json), voCs 관계
- WitnessVoC 모델: inspectionId FK(onDelete:Cascade), content, category, priority, status, response, dueDate, closedAt

### 2. `prisma/migrations/witness_inspection.sql` (신규)
- 4개 enum, WitnessInspection·WitnessVoC 테이블, 인덱스 2개 생성 SQL

### 3. `app/api/witness/route.ts` (신규)
- GET: year/month 쿼리 파라미터로 월별 필터, 전체 조회 시 필터 없음
- POST: 필수 필드 검증(고객사·프로젝트명·일정·담당자), generateInspNo() 채번 후 create
- 인증: `requireActiveSession()` 공통 적용

### 4. `app/api/witness/[id]/route.ts` (신규)
- GET: findUnique + voCs include
- PATCH: optional 필드 whitelist 패턴, status/result 포함
- DELETE: findUnique 없이 직접 delete
- 인증: `requireActiveSession()` 공통 적용

### 5. `app/api/witness/[id]/voc/route.ts` (신규)
- GET: inspectionId 기준 VoC 목록 조회
- POST: content 필수 검증, category/priority 기본값 적용

### 6. `app/api/witness/[id]/voc/[vocId]/route.ts` (신규)
- PATCH: status RESOLVED 전환 시 closedAt 자동 세팅, 취소 시 null
- DELETE: 단건 삭제

### 7. `app/(dashboard)/witness/page.tsx` + `WitnessPageClient.tsx` (신규)
- URL param `?view=calendar|list` 으로 뷰 전환
- 월 탐색(prev/next), 달력+리스트 이중 뷰 스위치

### 8. `app/(dashboard)/witness/new/page.tsx` + `WitnessForm.tsx` (신규)
- Server Component에서 auth() → 현재 세션 사용자를 기본 담당자로 전달
- 날짜 유효성 검사(종료일 ≥ 시작일)
- 등록 성공 시 /witness/[id]로 push

### 9. `app/(dashboard)/witness/[id]/page.tsx` + `WitnessDetailClient.tsx` (신규)
- Server Component: auth() + prisma 직접 조회, WitnessDetailClient에 직렬화 props 전달
- Client Component: 기본정보 인라인 수정, 문서첨부(AttachmentUploader), VoC CRUD 3탭
- .ics 내보내기: 클라이언트 사이드 Blob 생성, URL.createObjectURL

### 10. `components/witness/witness-calendar.tsx` (신규)
- 월별 42칸 그리드 달력, 고객사 뱃지, 오늘 강조, 이번 달 요약 리스트

### 11. `components/witness/witness-list.tsx` (신규)
- 리스트 뷰: 상태별 색상, 날짜 포맷, 상세 링크

### 12. `components/layout/sidebar.tsx` + `header.tsx` (수정)
- 사이드바: "고객 품질 관리" 섹션 신설, 입회검사 메뉴(roles: ALL)
- header.tsx: `/witness`, `/witness/new`, `/witness/[id]` 경로명 추가

---

## 검수 요청 항목

### W-01. 서버 페이지 인증 — requireActivePageSession() 누락
**위치**: `app/(dashboard)/witness/[id]/page.tsx:1-29`, `app/(dashboard)/witness/new/page.tsx`  
**내용**: 두 Server Component 모두 `auth()` 직접 호출. 다른 민감 페이지(QPA·HR·설비수선)는 `requireActivePageSession()`을 사용해 RESTRICTED 계정 차단.  
**리스크**: 정지된 계정(RESTRICTED)이 기존 세션 쿠키로 입회검사 상세·등록 페이지 접근 가능. 과거 코라가 이 패턴을 Critical로 지적한 이력 있음.

### W-02. API 역할 권한 없음 — 모든 인증 사용자 생성/삭제 가능
**위치**: `app/api/witness/route.ts`, `app/api/witness/[id]/route.ts`  
**내용**: POST(등록)·DELETE(삭제) 모두 `requireActiveSession()`만 체크. PRACTITIONER 포함 누구나 등록·삭제 가능. 다른 모듈(QPA, 시험계획)은 TEAM_LEAD 이상으로 쓰기 제한.  
**리스크**: 실무자가 실수로 입회검사 삭제 또는 잘못된 등록 가능. 의도한 권한 정책인지 명확하지 않음.

### W-03. generateInspNo() 채번 레이스 컨디션
**위치**: `app/api/witness/route.ts:6-15`  
**내용**: findFirst(desc) + parseInt + create 사이에 동시 POST가 들어오면 동일 inspNo 시도 → UNIQUE 제약으로 500 에러. 다른 모듈(CLM, NCR)도 동일 패턴이나, 동시 등록 가능성 있음.  
**리스크**: 동시 등록 시 500 오류 및 미등록 → 사용자에게 혼란.

### W-04. 소유권 검증 없는 DELETE
**위치**: `app/api/witness/[id]/route.ts:56-63`, `app/api/witness/[id]/voc/[vocId]/route.ts:33-39`  
**내용**: WitnessInspection.DELETE 및 VoC.DELETE 모두 inspectionId/createdById 일치 여부 확인 없이 세션 인증만 통과하면 삭제.  
**리스크**: 인증된 모든 사용자가 타인의 입회검사·VoC를 삭제 가능.

### W-05. PATCH body enum 서버 검증 없음
**위치**: `app/api/witness/[id]/route.ts:28-52`  
**내용**: `body.status`·`body.result`를 클라이언트 입력 그대로 DB에 write. TypeScript 타입이 `string`이므로 임의 값이 DB에 삽입 가능.  
**리스크**: DB enum 제약으로 500 에러 발생 or 잘못된 상태 저장. 코라는 이 패턴을 다른 모듈에서 반복 지적.

### W-06. WitnessDetailClient 에러 무음 처리
**위치**: `app/(dashboard)/witness/[id]/WitnessDetailClient.tsx:110-113`  
**내용**: `saveInfo()`의 catch 블록이 `/* noop */`으로 비어 있음. 저장 실패 시 사용자에게 아무런 피드백 없이 UI가 editing 모드를 유지.  
**리스크**: 네트워크 오류·서버 에러 발생 시 사용자가 저장 실패를 인지 불가.

### W-07. .ics 타임존 처리 — UTC 하드코딩
**위치**: `app/(dashboard)/witness/[id]/WitnessDetailClient.tsx:52-53`  
**내용**: `toISOString().slice(0, 15) + "Z"` 방식으로 UTC 시각 강제 사용. DB는 KST 기준 입력이지만 .ics에는 UTC 변환값이 들어감. 예: KST 2026-06-20 → UTC 2026-06-19T15:00:00Z → 구글/애플 캘린더에서 6/19로 표시 가능.  
**리스크**: 검사 일정 달력 앱 등록 시 날짜 오류로 혼선 발생.

### W-08. GET /api/witness 무제한 조회
**위치**: `app/api/witness/route.ts:26-39`  
**내용**: year/month 파라미터가 없으면 WitnessInspection 전체를 orderBy asc로 반환. 건수 증가 시 응답 지연.  
**리스크**: 데이터 증가 후 성능 저하. 단기 PoC 범위에서는 허용 가능하나 명시 필요.

### W-09. 테스트 커버리지 없음
**위치**: 전 모듈  
**내용**: 이번 구현에 단위·통합 테스트가 없음. generateInspNo 채번, VoC 상태 전환(closedAt 세팅), DELETE cascade 동작 등 핵심 로직 검증 없음.  
**리스크**: 리팩토링·마이그레이션 시 회귀 감지 불가.

---

## 빌드/테스트 상태

```
npm run build → 미실행 (브라우저 테스트 선행 미완료)
npm test      → 미실행
```

미실행 사유: 세션20 구현 직후 브라우저 골든패스 테스트 전에 검수 요청서를 먼저 작성함.  
코라 검수 완료 후 수정사항 반영과 함께 빌드·테스트 실행 예정.

---

## 원하는 판정

- W-01~W-09 각 항목에 대해 Critical / High / Medium / Low / OK 판정
- 전체에 대해 승인 / 조건부 승인 / 보류 판정
- W-01(requireActivePageSession 누락)·W-02(역할 권한)·W-04(소유권 검증) 우선 확인 요청
