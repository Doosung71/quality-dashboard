# Quality Director Board — MVP PRD

## 1. 프로젝트

| 항목 | 내용 |
|------|------|
| 이름 | quality-director-board |
| 한 줄 정의 | 품질부문장의 5개 핵심 업무 영역을 한 화면에 통합한 PoC 대시보드 |
| 목적 | 품질부문장의 5개 핵심 업무 영역을 한 화면에 통합한 PoC 대시보드 |
| 운영자 | 두성님 |

---

## 2. MVP 5개 영역 — 최소 시연 기능

### ① 시험장·시험 현황 ✅ 완료 (2026-05-12)
- 시험장 카드 (전체/가동중/건축중)
- 설비 현황 카드 (신규/정상/노후/도입예정)
- 노후 설비 카드 (교체진행/미착수)
- 설비 상태 자동 분류: 도입연도 기준 (`CURRENT_YEAR` 상수로 전체 재분류)
- _(진행 중 시험 리스트, 간트 차트는 V2)_

### ② 고객 클레임 트래커
- 칸반 보드 5단계: 접수 → 조사 → 대책 → 검증 → 클로징
- KPI: 미클로징 건수, 평균 처리 일수

### ③ 협력업체 카드 풀
- 카테고리 탭 3개: 원자재 / 반제품 외주 / 상품 외주
- 등급별 색상 카드

### ④ 품질부문 인사·면담
- 인원 카드 (가명) + 클릭 시 면담 타임라인

### ⑤ 경쟁사·고객·기타 정보
- 카드형 리스트 + 유형 필터

### + 통합 메인 대시보드
- 5개 영역 핵심 KPI 한 줄 요약

---

## 3. 데이터 규모 (실측 기준)

### ① 시설·설비 (`data/facility.json` — 완성 ✅)

| 데이터 | 건수 | 비고 |
|--------|------|------|
| Sites | 2 | 구미, 동해 |
| TestHall | 12 | 구미 7 + 동해 5 |
| TestYard | 3 | 동해 3 |
| Equipment | 30 | 각 홀·야드별 설비 |

### ② 나머지 영역 (추후 설계)

| 데이터 | 예상 건수 |
|--------|----------|
| 시험 (진행 중) | 8 |
| 클레임 | 12 |
| 협력업체 | 18 |
| 인사 | 12 (면담 25) |
| 외부 정보 | 20 |

---

## 4. 제외 항목 (Non-goals)

- 실시간 동기화
- 알림
- 로그인·권한
- 데이터 입력 폼
- 검색 고도화
- 보고체계 자동 갱신 로직

---

## 5. 기술 스택

| 항목 | 내용 |
|------|------|
| 프레임워크 | Next.js 15 (App Router) |
| UI | Tailwind + shadcn/ui + Tremor |
| 데이터 | `/data/facility.json` (로컬 JSON) → 추후 단계적 Notion API 연동 |
| 배포 | Vercel |
| 개발 환경 | Surface Pro 11 (Windows 11 ARM64) |

### 데이터 스키마 — 시설·설비 계층 구조

`facility.json` 기준으로 확정된 3단계 계층:

```
Sites (사업장)
  └── TestHall / TestYard (시험실·시험장)
        └── Equipment (시험설비)
```

**Equipment 필드:**
`type` (DC/AC/Imp/전류원) · `spec` · `maker` · `makerCountry` · `yearIntroduced` · `quantity` · `status` · `replacedBy` / `replaces`

**미입력 보류 항목 (`_meta.pendingFields`):**
- 전 홀·야드 치수 (도면 확인 후 입력)
- 일부 Imp 설비 에너지 스펙 (동해 DC1/DC2/AC-SR2/Cert)
- 구미 DC2 Hipotronics `'08` 상태 미확인

### 데이터 레이어 확장 전략

| 단계 | 데이터 레이어 | 비고 |
|------|-------------|------|
| MVP (현재) | `/data/facility.json` 로컬 JSON | 시연용 |
| V1.5 | Notion API 연동 | 단계적, 영역별 |
| V2+ | DB (Supabase 등) | 수천 건↑, 페이징 필요 시 |

**설계 원칙 (5월 셋업 시 반영):**
- `lib/data.ts`에 데이터 접근 함수를 집중 → 컴포넌트는 데이터 출처를 모름
- 리스트 컴포넌트는 `page` / `limit` 파라미터를 처음부터 수용
- 필터 상태는 URL 쿼리 파라미터로 관리 → 딥링크 + 서버사이드 전환 용이

---

## 6. 마일스톤

| 순서 | 작업 | 상태 |
|------|------|------|
| 1 | 셋업 + 공통 레이아웃 + 시드 구조 + ① 시험장·시험 현황 | ✅ 완료 (2026-05-12) |
| 2 | ② 클레임 트래커 (칸반 5단계 + 시드 12건) + 역할 인증 + Vercel 배포 | ✅ 완료 (2026-05-29) |
| 3 | ③ 협력업체 카드 풀 (탭 3개 + 시드 18건) | 🔲 예정 |
| 4 | ④ 인사·면담 + ⑤ 외부정보 + 통합 메인 대시보드 | 🔲 예정 |
| 5 | 모바일 다듬기 | 🔲 예정 |

## 7. 구현 완료 내역

### 역할 기반 인증 시스템 + Vercel 배포 (2026-05-29)

**인증 플로우:**
```
/register → status: PENDING → /pending 대기
관리자(/admin/users) 승인 + 역할 부여
재로그인 → 대시보드 접근
```

**역할 3단계:** `PRACTITIONER(실무자)` / `TEAM_LEAD(팀장)` / `DIRECTOR(임원)`

**User 모델 주요 필드:** role, status(PENDING/ACTIVE/RESTRICTED/BANNED), department, employeeId

**추가 파일:**
```
app/login/page.tsx                     로그인
app/register/page.tsx                  가입 신청
app/pending/page.tsx                   승인 대기
app/banned/page.tsx                    접근 제한
app/admin/users/page.tsx               관리자 유저 관리
components/layout/role-gate.tsx        역할별 렌더링 게이트
lib/session-guard.ts                   API 세션 검사
auth.ts / auth.config.ts               NextAuth v5 설정
middleware.ts                          Edge 미들웨어
```

**배포:** https://quality-dashboard-flax.vercel.app (Vercel Production)
- DATABASE_URL, AUTH_SECRET 환경 변수 설정 완료
- 팀원 회원가입 → 관리자 승인 플로우 동작

**핵심 버그 수정:** `auth.config.ts`에 session 콜백 추가
- 미들웨어는 auth.config.ts만 사용 → token.status가 session.user에 매핑 안 됨
- → 전원 /banned 리다이렉트 버그 → session 콜백으로 수정

---

### ② 고객 클레임 트래커 (2026-05)

**파일 구조:**
```
types/claim.ts
data/claims.json                       시드 12건
components/claims/claims-kanban.tsx    칸반 5단계
components/claims/claims-kpi.tsx       KPI 카드
components/claims/claim-detail.tsx     상세 패널
app/(dashboard)/claims/page.tsx
```

---

### ① 시험장·시험 현황 (2026-05-12)

**파일 구조:**
```
types/facility.ts                              TypeScript 타입
data/facility.json                             시드 데이터 (구미·동해)
components/facilities/facilities-view.tsx      클라이언트 컴포넌트
app/(dashboard)/facilities/page.tsx            서버 컴포넌트
```

**라우트 구조:**
```
app/(dashboard)/
  page.tsx            통합 메인 대시보드 (뼈대)
  facilities/         ✅ 완료
  claims/             ✅ 완료
  vendors/            🔲 6월
  hr/                 🔲 8월
  intelligence/       🔲 8월
```
