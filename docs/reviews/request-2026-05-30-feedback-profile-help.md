# Codex (코라) 검수 요청 — 피드백·프로필·헬프 페이지 추가 (TRA 수준 이식)

**요청일**: 2026-05-30  
**요청자**: Claude Code (클로이) (PM / 클로이)  
**리뷰 유형**: Implementation Review  
**선행 문서**: 없음 (신규 기능 추가)

---

## 변경 개요

QMS 2.0 통합 플랫폼의 최종 목표(3개 모듈 통합 + 실사용자 E2E 검증)를 위해, tender-review-assistant(TRA)에 이미 구현된 피드백 게시판·프로필·사용 가이드 기능을 quality-dashboard(QD)에 이식했다.  
QD는 TRA와 동일한 Neon PostgreSQL DB를 공유하며, Feedback·FeedbackReply 테이블은 TRA 마이그레이션을 통해 이미 존재한다. QD는 Prisma 스키마에 두 모델을 추가하고 클라이언트를 재생성하는 방식으로 적용했다 (migrate dev 실행 없음).  
빌드 및 Vercel 프로덕션 배포(`quality-dashboard-flax.vercel.app`)까지 완료된 상태다.

---

## 변경된 파일

### 1. `prisma/schema.prisma` (수정)
- `User` 모델에 `feedbacks`, `feedbackReplies` 관계 필드 추가
- `Feedback`, `FeedbackReply` 모델 신규 추가

### 2. `prisma.config.ts` (신규)
- `.env.local` 기반 DATABASE_URL 로딩 설정 (TRA와 동일 방식)

### 3. `lib/session-guard.ts` (수정)
- `requireActivePageSession()` 함수 추가: DB 재조회로 최신 role/status 반영, PENDING → /pending, BANNED → /banned 리다이렉트
- 기존 `requireActiveSession()` (API route용)도 동일 방식으로 DB 재조회하도록 강화

### 4. `app/feedback/page.tsx` + `app/feedback/FeedbackBoard.tsx` (신규)
- 피드백 게시판: 작성(텍스트 + 이미지 최대 3장), 목록, 댓글
- 이미지는 Vercel Blob 업로드 후 URL 저장

### 5. `app/api/feedback/route.ts` (신규)
- GET: 전체 피드백 목록 조회 (author·replies 포함)
- POST: 피드백 등록 (Blob URL 도메인 검증 포함)

### 6. `app/api/feedback/[id]/reply/route.ts` (신규)
- POST: 특정 피드백에 댓글 등록

### 7. `app/api/feedback/image/route.ts` (신규)
- POST: 이미지 파일을 Vercel Blob에 업로드, URL 반환
- 허용 타입: PNG/JPG/WebP/GIF, 최대 4MB

### 8. `app/profile/page.tsx` + `NicknameForm.tsx` + `actions.ts` (신규)
- 기본 정보 표시 (이름/이메일/역할/부서/사번/연락처)
- 닉네임 Server Action으로 저장

### 9. `app/help/page.tsx` (신규)
- 역할별(PRACTITIONER/TEAM_LEAD/DIRECTOR) 사용 가이드
- QD 기능(시험장·클레임·협력업체·관리자) 기준으로 내용 작성

### 10. `components/layout/sidebar.tsx` (수정)
- 하단 공통 링크 추가: 피드백 / 내 프로필 / 사용 가이드
- 사용자 관리(ShieldCheck)는 DIRECTOR에만 유지

### 11. `components/ui/card.tsx`, `input.tsx` (신규)
- shadcn/ui 컴포넌트 추가 (profile 페이지에서 사용)

### 12. `package.json` (수정)
- `@vercel/blob` 의존성 추가
- `dotenv` devDependency 추가 (prisma.config.ts용)

---

## 검수 요청 항목

### R-01. 공유 DB에서의 Prisma 스키마 충돌 가능성
**위치**: `prisma/schema.prisma`  
**내용**: QD와 TRA가 동일한 Neon DB를 공유한다. Feedback·FeedbackReply 테이블은 TRA가 이미 생성했으며, QD는 `prisma generate`만 실행해 클라이언트를 재생성했다. `migrate dev`는 실행하지 않았다.  
**리스크**: QD 스키마와 실제 DB 스키마 간 구조 불일치가 있을 경우 런타임 오류 발생 가능. 또한 향후 QD에서 `migrate dev` 실행 시 TRA 테이블을 덮어쓰거나 삭제할 수 있음.

### R-02. Blob URL 도메인 검증 로직
**위치**: `app/api/feedback/route.ts` (POST, L31~44)  
**내용**: 클라이언트가 제출한 imageUrls를 `*.blob.vercel-storage.com/feedback/` 경로로 제한하는 방식으로 검증한다.  
**리스크**: Vercel Blob 도메인 변경 시 검증 실패. 또한 다른 프로젝트(TRA)의 Blob URL도 동일 도메인이므로, TRA에서 업로드한 이미지를 QD 피드백에 삽입할 수 있음.

### R-03. requireActivePageSession의 redirect 호출 방식
**위치**: `lib/session-guard.ts` (L52~70)  
**내용**: `redirect()`를 try/catch 없이 직접 호출한다. Next.js App Router에서 `redirect()`는 내부적으로 예외를 throw하는 방식으로 동작하며, Server Component에서는 정상이지만 Server Action이나 미들웨어에서 호출 시 동작이 다를 수 있음.  
**리스크**: Server Action에서 `requireActivePageSession`을 호출할 경우 `redirect()`가 의도대로 동작하지 않을 수 있음. 현재는 page.tsx에서만 호출되므로 문제없으나, 향후 오용 가능성 존재.

### R-04. FeedbackBoard 이미지 업로드 에러 처리
**위치**: `app/feedback/FeedbackBoard.tsx` (L159~175)  
**내용**: 다중 이미지 업로드 중 하나가 실패하면 loop를 break하고 나머지 업로드를 중단한다. 이미 성공한 이미지는 `uploadedUrls`에 남아 있는 상태로 유저에게 보여진다.  
**리스크**: 부분 성공 상태에서 유저가 피드백을 제출하면 일부 이미지만 포함된 불완전한 피드백이 등록될 수 있음. 실패한 이미지에 대한 Blob 정리 로직 없음.

### R-05. Help 페이지 역할 분기 — ADMIN 케이스
**위치**: `app/help/page.tsx` (L176~179)  
**내용**: `SECTIONS[role]`이 없으면 `/`로 redirect한다. ADMIN 계정(doosung71@gmail.com)의 경우 role이 `DIRECTOR`로 설정되어 있지 않으면 SECTIONS에 없어 무한 redirect가 발생할 수 있음.  
**리스크**: 관리자 계정의 role이 DB에 없거나 enum에 없는 값인 경우 redirect 루프 발생 가능. 현재 관리자는 별도 role 없이 email 기반으로 판별함.

### R-06. Sidebar 링크 — 대시보드 레이아웃 외부 페이지
**위치**: `components/layout/sidebar.tsx`  
**내용**: `/feedback`, `/profile`, `/help`는 `(dashboard)` 레이아웃 그룹 밖에 위치하며, 해당 페이지들은 독립적인 레이아웃을 가진다. Sidebar는 `(dashboard)` 레이아웃 안에서만 렌더링된다.  
**리스크**: 없음으로 판단하나, 일관성 측면에서 세 페이지를 `(dashboard)` 레이아웃 안으로 이동할지 여부를 검토 요청.

---

## 빌드/테스트 상태

```
npx next build  →  ✅ 성공 (26개 라우트, 오류 없음, ESLint 경고 3개는 기존 파일)
vercel --prod   →  ✅ READY (quality-dashboard-flax.vercel.app, 빌드 36초)
prisma generate →  ✅ 성공 (Prisma Client 7.8.0)
런타임 에러 스캔 →  ✅ 오류 없음 (vercel logs --level error)
```

테스트 코드: 미작성 (QD는 현재 테스트 스위트 없음)

---

## 원하는 판정

- 각 항목(R-01~R-06)에 대해 Critical / High / Medium / Low / OK 판정
- R-01(공유 DB 스키마 충돌)과 R-05(Admin redirect 루프)를 중점 검토 요청
- 전체에 대해 승인 / 조건부 승인 / 보류 판정
