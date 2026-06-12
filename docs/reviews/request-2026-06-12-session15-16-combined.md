# Codex 검수 요청 — 세션15·16 통합 구현 (회의록·접속현황·Vendor·ITP·NoticeModal 외)

**요청일**: 2026-06-12
**요청자**: Claude Code (클로이, PM)
**리뷰 유형**: Implementation Review
**선행 문서**: `docs/reviews/result-2026-06-10-inspection-ai-ingest-extension.md` (직전 조건부 승인)

---

## 변경 개요

직전 코라 검수(397fd71, 2026-06-10) 이후 세션15·16에 걸쳐 구현된 기능을 통합 검수 요청한다.
QD에서 10개 피처(회의록·내할일·접속현황·리더보드·Vendor 마스터·피드백 이미지·공지 모달 등),
TRA에서 2개 피처(ITP 자동생성·E2E-1 권한 완화)가 추가되었다.
E2E-1 실사용(65명) 진행 중이며 Critical/High 이슈 조기 식별이 핵심 목적이다.

---

## 변경된 파일

### QD — 신규 API 라우트

#### 1. `app/api/meetings/route.ts` (신규)
- Meeting 목록 조회(GET) + 신규 등록(POST)
- `requireActiveSession()` 인증, `session.user.id`를 `createdById`로 저장

#### 2. `app/api/meetings/[id]/route.ts` (신규)
- 회의록 단건 조회(GET), 수정(PATCH), 삭제(DELETE)

#### 3. `app/api/meetings/[id]/actions/route.ts` (신규)
- 액션 아이템 목록 조회(GET), 등록(POST), 완료/수정(PATCH), 삭제(DELETE)

#### 4. `app/api/my-job/route.ts` (신규)
- 미완료 MeetingAction 전체 조회 (E2E-1 임시 전체 공개, TODO 명시)

#### 5. `app/api/presence/heartbeat/route.ts` (신규)
- 30초 주기 하트비트. `auth()` 직접 호출(requireActiveSession 미사용). Upstash Redis TTL 90초

#### 6. `app/api/presence/route.ts` (신규)
- ADMIN-only 접속 현황 조회. `isAdmin()` + `auth()` 조합. `redis.keys("presence:*")` 사용

#### 7. `app/api/admin/activity/[userId]/route.ts` (신규)
- 개별 사용자 9개 테이블 활동 타임라인. ADMIN-only (`requireActiveSession()` + role 체크)

#### 8. `app/api/vendors/route.ts` (신규)
- Vendor 마스터 등록(POST). `requireActiveSession()` 인증, 이름 필수 검증

### QD — 신규 UI 페이지 / 컴포넌트

#### 9. `app/(dashboard)/meetings/page.tsx` + `[id]/page.tsx` (신규)
- 회의록 목록·신규 등록·상세(이슈 연결·액션 아이템·D-Day 뱃지) 3페이지

#### 10. `app/(dashboard)/my-job/page.tsx` (신규)
- 기한초과/오늘/예정/완료 4섹션, MeetingAction 전체 표시

#### 11. `components/board/notice-modal.tsx` (신규)
- 핀된 NOTICE 공지 → 전체화면 오버레이 모달, "확인했습니다" 클릭 시 localStorage 저장

#### 12. `components/board/notice-modal.utils.ts` (신규)
- `getUnacknowledgedNotice()` 순수 함수 분리 (테스트 가능)

#### 13. `app/admin/users/client.tsx` (수정)
- 실시간 접속 현황 탭 추가, 하트비트 직접 주입 (DashboardShell 밖이라 별도 추가)

#### 14. `app/(dashboard)/feedback/FeedbackBoard.tsx` (수정)
- FeedbackReply 이미지 첨부 (attachments JSONB, PNG/JPG/WebP 3장, fail-open)

### QD — DB 변경

#### 15. `prisma/migrations/meetings.sql` (신규)
- `Meeting`, `MeetingAction` 테이블 신규 생성. `MeetingType` enum 추가

#### 16. `prisma/migrations/vendor_master.sql` (신규)
- `Vendor` 테이블 신규 생성 (name, location, mainItem, createdById)

#### 17. `prisma/schema/common.prisma` (수정)
- Meeting·MeetingAction 모델 추가, FeedbackReply.attachments Json? 추가

### TRA — 신규

#### 18. `app/api/tenders/[id]/itp/generate/route.ts` (신규)
- Claude Structured Output + pgvector RAG 컨텍스트 주입으로 ITP 자동생성
- 설계 판단 완료: 덮어쓰기(재생성), fail-closed, 원자적 트랜잭션, SpecRequirement만 전송
- E2E-1 한시적 권한 완화: DRAFT 포함 허용 (TODO 명시)

#### 19. `app/api/tenders/[id]/itp/route.ts` + `export/route.ts` (신규)
- ITP 조회·수정(PATCH), ExcelJS xlsx 내보내기

#### 20. `app/tender/[id]/ITPPanel.tsx` (신규)
- 인라인 편집·재생성 확인 모달 UI

---

## 검수 요청 항목

### R1. `meetings/route.ts` — MeetingType enum 검증 누락
**위치**: `app/api/meetings/route.ts` POST 핸들러
**내용**: `body.type`을 `as never`로 캐스팅하여 DB에 저장. 유효하지 않은 type 값이 들어와도 거부하지 않음
**리스크**: Prisma가 런타임에 invalid enum 오류를 던져 500 반환. 클라이언트에는 의미 없는 에러만 노출

### R2. `my-job/route.ts` — 전체 공개 임시 조치
**위치**: `app/api/my-job/route.ts`
**내용**: E2E-1 임시로 모든 사용자의 미완료 액션 아이템을 전체 공개. TODO 주석 명시됨
**리스크**: E2E-2 착수 시 역할별 제한을 복원하지 않으면 개인 업무 정보 노출. 복원 조건 명확화 필요

### R3. `presence/heartbeat/route.ts` — RESTRICTED 계정 하트비트 허용
**위치**: `app/api/presence/heartbeat/route.ts`
**내용**: `auth()` 직접 호출. `requireActiveSession()`을 사용하지 않아 정지(RESTRICTED) 계정도 하트비트 전송 가능
**리스크**: 정지 계정이 접속 현황에 "접속 중"으로 표시됨

### R4. `vendors/route.ts` — Vendor 중복 등록 방지 없음
**위치**: `app/api/vendors/route.ts` POST 핸들러
**내용**: 동일 이름의 Vendor가 이미 존재해도 중복 생성 가능. 정적 JSON vendors.json과 DB 간 동명 충돌도 처리 안 됨
**리스크**: 드롭다운에 동일 업체가 중복 노출. QPA 데이터 연결 혼란

### R5. `meetings/route.ts` — issueLinks JSONB 입력 검증 없음
**위치**: `app/api/meetings/route.ts` POST 핸들러
**내용**: `issueLinks`가 배열이면 그대로 DB에 저장. 배열 내 객체의 구조(issueType/issueId/issueLabel) 검증 없음
**리스크**: 오염된 데이터가 JSONB에 저장되어 UI 파싱 오류 발생 가능

### R6. `presence/route.ts` — Redis `keys()` 명령 사용
**위치**: `app/api/presence/route.ts` GET 핸들러
**내용**: `redis.keys("presence:*")` 사용. ADMIN-only 라우트이고 현재 사용자 수가 소규모라 당장 문제 없음
**리스크**: Redis `KEYS` 명령은 O(N). 사용자 수 증가 시 Redis 블로킹 가능. SCAN 패턴이 권장됨

### R7. `itp/generate/route.ts` — E2E-1 권한 완화 복원 조건
**위치**: `app/api/tenders/[id]/itp/generate/route.ts`
**내용**: DRAFT 분석에서도 ITP 생성 허용. TODO 주석으로 복원 조건 명시됨
**리스크**: 정식 운영 전 복원하지 않으면 미검토 분석 기반 ITP가 출력되어 품질 신뢰도 저하

### R8. `notice-modal.utils.ts` — getUnacknowledgedNotice 다중 공지 처리
**위치**: `components/board/notice-modal.utils.ts`
**내용**: `posts.find()`로 첫 번째 NOTICE+pinned 공지 1개만 반환. 핀된 공지가 2개 이상인 경우 나머지 무시
**리스크**: 복수 공지 시나리오에서 사용자가 일부 공지를 놓칠 수 있음. 현 시스템 정책 확인 필요

---

## 빌드/테스트 상태

```
# QD 테스트
npx vitest run → 8 files, 70 passed (2026-06-12 08:54)

# QD 빌드
npm run build → 미실행 (로컬 환경변수 미완비)

# TRA 빌드/테스트
npm run build, npm test → 미실행 (TRA 로컬 환경변수 미완비)
```

> TRA 빌드·테스트는 로컬 Neon 환경변수 없이는 실행 불가. 미실행 사유: `.env.local`에 TRA 프로덕션 DB 접속 정보 없음.

---

## 원하는 판정

- 각 항목(R1~R8)에 Critical / High / Medium / Low / OK 판정
- QD 전체 승인 / 조건부 승인 / 보류
- TRA 전체 승인 / 조건부 승인 / 보류
- E2E-1 계속 진행 가능 여부 명시
