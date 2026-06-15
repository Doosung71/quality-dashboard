# CLAUDE.md

이 파일은 Claude Code(클로이)를 비롯한 AI 어시스턴트가 이 저장소에서 작업할 때
참고하는 코드베이스 가이드다. 코드 구조·개발 워크플로우·핵심 컨벤션을 정리한다.

> **운영 규칙 우선순위**: 멀티 에이전트 협업 규칙(역할 분담, 파일 수정 권한, 요청서/결과서
> 핸드오프, vault 연계)은 [AGENTS.md](AGENTS.md)에 정의되어 있다. 클로이는 작업을 시작할 때
> 반드시 `AGENTS.md`를 읽고 그 규칙을 따른다. 이 문서(CLAUDE.md)는 **기술적 코드베이스
> 가이드**이고, AGENTS.md는 **협업 프로세스 규칙**이다. 두 문서가 충돌하면 협업 규칙은
> AGENTS.md를, 코드 사실관계는 이 문서를 따른다.

---

## 1. 프로젝트 개요

- **프로젝트명**: quality-dashboard (package: `quality-director-dashboard`)
- **설명**: LS전선 품질부문장을 위한 통합 품질 대시보드 + 입찰 검토 보조(TRA) PoC
- **목표 시연**: 2026년 9월 품질전략기능회의 (CEO + 임원진 대상)
- **UI 언어**: 한국어 전용. 정보 밀도 높고 간결하게 유지.
- 상위 기획/마일스톤은 [PRD.md](PRD.md), [QMS_2.0_MASTER_PLAN.md](QMS_2.0_MASTER_PLAN.md) 참조.

---

## 2. 기술 스택

| 항목 | 내용 |
|------|------|
| 프레임워크 | Next.js 15 (App Router, **Turbopack** dev/build) |
| 런타임 | React 19, TypeScript 5 |
| 인증 | NextAuth v5 (`auth.ts`, `auth.config.ts`) + Edge `middleware.ts` |
| DB | PostgreSQL (**Neon serverless**) |
| ORM | Prisma 7 (`prisma-client` generator → `lib/generated/prisma`, Neon adapter) |
| UI | Tailwind CSS v4 + shadcn/ui (`components/ui/`) + `@base-ui/react` + lucide-react |
| 데이터 페칭 | 서버 컴포넌트(직접 Prisma) + 클라이언트 SWR |
| AI | `@anthropic-ai/sdk` (Claude 우선) → OpenAI → Gemini 3단 fallback |
| 파일 저장 | Vercel Blob (`@vercel/blob`) |
| 검색 | Naver 검색 API(`lib/naver-search.ts`) + 하이브리드 Web-RAG |
| Rate limit | Upstash Redis (`@upstash/ratelimit`, `@upstash/redis`) |
| PDF/엑셀 | `pdf-parse`, `xlsx` |
| 테스트 | Vitest (단위), Playwright (E2E) |
| 배포 | Vercel |

---

## 3. 개발 명령어

```bash
npm run dev          # 개발 서버 (Turbopack, http://localhost:3000)
npm run build        # 프로덕션 빌드 — 타입 오류 최종 확인 (Turbopack)
npm run start        # 프로덕션 서버 실행
npm run lint         # ESLint 검사
npm run test         # Vitest 단위 테스트 (vitest run)

npx prisma generate  # Prisma 클라이언트 재생성 → lib/generated/prisma
npx prisma db push   # 스키마를 DB에 반영 (개발용)
```

- 스키마/마이그레이션 설정은 `prisma.config.ts`가 관리한다 (`schema: "prisma/schema"`,
  `migrations: prisma/migrations`, `DATABASE_URL` 사용, `.env.local` override).
- Prisma 모델을 변경하면 **반드시 `npx prisma generate` 후 `npm run build`** 로
  타입 정합성을 확인한다.

---

## 4. 디렉토리 구조

```
app/
├── (dashboard)/                  # 대시보드 라우트 그룹 (공통 사이드바+헤더 레이아웃)
│   ├── page.tsx                  # 통합 메인 대시보드
│   ├── facilities/               # 시험장·시험설비 현황 (간트)
│   ├── assets/                   # 설비 자산 (신규 등록·수선 이력)
│   ├── claims/[id]/              # 고객 클레임 트래커 + Back-claim
│   ├── ncr/[id]/                 # 부적합(NCR) 관리
│   ├── qcost/                    # 품질비용
│   ├── vendors/                  # 협력업체 (audits·incoming·inspections·qpa 하위)
│   ├── witness/[id]/ new/        # 입회검사 (시험장 선택·충돌감지·권역 캘린더)
│   ├── meetings/[id]/            # 회의록
│   ├── projects/awarded/         # 수주 프로젝트 / 계약 검토
│   ├── quality-issues/           # 품질 이슈
│   ├── hr/                       # 인사·면담
│   ├── intelligence/             # 경쟁사·고객 정보 (Naver 웹검색)
│   ├── knowledge/ search/ status/# 지식 저장소 + Web-RAG 검색
│   ├── board/                    # 품질부문 게시판
│   ├── my-job/                   # 내 업무 모음
│   └── feedback/                 # 피드백
├── dashboard/                    # 입찰 검토(TRA) — 업로드·목록
│   └── (TenderCard/List/Thread/UploadForm)
├── tender/[id]/                  # 입찰 검토(TRA) — 상세·워크플로우·댓글
├── api/                          # ~100개 Route Handler (아래 §5)
├── admin/users/                  # 사용자 관리
├── review-demo/                  # 데모 화면 (ENABLE_REVIEW_DEMO로 게이트)
├── login/ register/ pending/ banned/ profile/ help/ projects/
└── layout.tsx, globals.css

components/                       # 영역별 클라이언트 컴포넌트
├── layout/                       # sidebar, header, dashboard-shell, role-gate
├── ui/                           # shadcn/ui 공통 컴포넌트
├── facilities/ assets/ claims/ ncr/ qcost/ vendors/ witness/
├── meetings/ hr/ intelligence/ knowledge/ board/ onboarding/ review-demo/

lib/
├── prisma.ts                     # Prisma 싱글턴 (Neon adapter) — 직접 new 금지
├── generated/prisma/             # Prisma 생성 클라이언트 (커밋됨, import 대상)
├── ai/extract.ts                 # AI 추출 (Claude→OpenAI→Gemini fallback)
├── rag.ts                        # 하이브리드 Web-RAG 파이프라인
├── knowledge.ts ingest-qms.ts    # 지식 저장소 / QMS 자동 인제스트
├── naver-search.ts               # Naver 검색 API 래퍼
├── pdf.ts storage.ts             # PDF 파싱 / Vercel Blob 래퍼
├── session-guard.ts              # API·페이지 세션 검사 (requireActiveSession 등)
├── permissions.ts                # 역할별 섹션 쓰기 권한 (canWrite/canAccess)
├── admin.ts                      # isAdmin 등 관리자 판별
├── schemas.ts                    # Zod 스키마 (AI 추출 결과 등)
├── facilities-utils.ts standard-keywords.ts qpa-template.ts
├── board-visibility.ts rate-limit.ts display-name.ts utils.ts
└── *.test.ts                     # Vitest 단위 테스트 (lib 옆에 둠)

prisma/schema/                    # 도메인별로 분할된 멀티파일 스키마
├── common.prisma     # User, Feedback, BoardPost/Comment, Meeting, 공통 enum
├── tra.prisma        # Tender, Analysis, SpecRequirement, Standard, Review, Comment,
│                     #   AwardedProject, Contract* (수주/계약 검토)
├── customer.prisma   # InspectionRoom, WitnessInspection, WitnessVoC
├── facilities.prisma # Equipment, TestPlan, *OwnerHistory, EquipmentRepair
├── qcost.prisma      # Claim, BackClaim, Ncr (+ 관련 enum)
├── vendors.prisma    # Vendor, SupplierAudit, AuditFinding, Incoming/SourceInspection, Qpa*
└── knowledge.prisma  # InternalStandard
prisma/migrations/    # 수동 SQL 마이그레이션 모음

types/                # TypeScript 타입 (facility, asset, test, claim, vendor, hr,
                      #   intelligence, ncr, qcost, knowledge, qpa, next-auth.d.ts)
data/                 # 정적 시드 JSON + *.data.ts 접근 함수 (DB 미이전 영역용)

docs/
├── research/         # Antigravity(앤) 리서치 요청서/결과서
├── reviews/          # Codex(코라) 리뷰 요청서/결과서
├── runbooks/ specs/ samples/
```

루트 문서: `AGENTS.md`(협업 규칙), `PRD.md`, `QMS_2.0_MASTER_PLAN.md`,
`MULTI_AGENT_STARTUP_GUIDE.md`, `*_START.md`(에이전트별 시작 프롬프트), `README.md`.

---

## 5. 데이터 흐름 (중요 — 하이브리드)

이 프로젝트는 **DB 기반 영역**과 **정적 JSON 시드 영역**이 공존한다.

- **DB 기반 (Prisma + Postgres)**: TRA(입찰/수주/계약), claims, ncr, vendors,
  facilities(Equipment/TestPlan), witness, meetings, board, assets, internal-standards 등.
- **정적 JSON 시드 (`data/*.data.ts`)**: 아직 DB로 이전하지 않은 참조성 영역
  (예: `hr.data.ts`, 일부 facilities/qcost 참조 데이터). 시드는 `data/*.json` →
  `data/*.data.ts`에서 타입 캐스팅 후 export.

### 읽기/쓰기 규칙
- **서버 컴포넌트 페이지**(`app/(dashboard)/*/page.tsx`)는 읽기 시 `prisma`를 직접
  호출할 수 있다 (예: `claims/page.tsx`, `facilities/page.tsx`). 페이지 진입 시
  `requireActivePageSession()` 등으로 세션을 먼저 검사한다.
- **쓰기/변경(mutation)** 은 항상 `app/api/` Route Handler를 경유한다.
  클라이언트 컴포넌트는 SWR/fetch로 API를 호출하고, **클라이언트에서 직접 Prisma 호출 금지**.
- 정적 JSON 영역은 `data/*.data.ts`에서 import (컴포넌트는 데이터 출처를 모른다).

### API 라우트 패턴 (`app/api/`)
- 리소스별 CRUD: `tenders/`, `claims/`, `ncr/`, `vendors/`, `assets/`, `witness/`,
  `meetings/`, `awarded-projects/`, `incoming-inspections/`, `source-inspections/`,
  `supplier-audits/`, `qpa-audits/`, `test-plans/`, `internal-standards/`, `board/` 등.
- AI/분석: `analysis/[id]/`(submit·review-approve/reject·final-approve/reject·export 등),
  `ai/suggest/`, `contract-analysis/`, `requirements/[id]/comply|deviation/`.
- 인프라: `auth/[...nextauth]`, `auth/register`, `admin/users`, `admin/activity`,
  `blob-upload`·`blob/serve`, `attachments/upload`, `presence/heartbeat`,
  `knowledge/search`·`knowledge/suggest`, `intelligence/websearch`.

---

## 6. 인증 · 권한

- **NextAuth v5**: `auth.ts` / `auth.config.ts` + Edge `middleware.ts`.
- **세션 검사**: API 라우트는 `lib/session-guard.ts`의 `requireActiveSession()`,
  서버 페이지는 `requireActivePageSession()` 사용. `TEST_MODE=true`면 우회 (테스트용).
- **역할(Role)**: `DIRECTOR`, `ADMIN`, `TEAM_LEAD`, `PRACTITIONER` (prisma `Role` enum).
- **쓰기 권한**: `lib/permissions.ts`의 `canWrite(role, section)` 으로 섹션별 판정.
  - `DIRECTOR`·`ADMIN` = 전체(`*`). `TEAM_LEAD`/`PRACTITIONER`는 허용 경로 목록 기반.
- **UI 게이트**: `components/layout/role-gate.tsx` 로 편집/드래그 등 변경 액션을 비활성화.
  권한 없으면 읽기만 가능.
- 사용자 상태(`UserStatus`): `PENDING`/`RESTRICTED`/활성 등 — 제한 만료 처리 로직 포함.

---

## 7. AI 추출 파이프라인 (`lib/ai/extract.ts`)

- **3단 fallback**: Claude → OpenAI → Gemini. 모두 실패 시 합산 오류 메시지를 throw.
- 반환 값에 `aiUsed: "Claude" | "OpenAI" | "Gemini"` 로 실제 사용 모델을 표시.
- 추출 결과는 `lib/schemas.ts`의 Zod 스키마(`ExtractionResultSchema`,
  `ContractGapResultSchema`)로 검증한다.
- **모델 ID/키 변경 시 반드시 환경 변수를 확인**하고, Claude를 기본·우선 경로로 유지한다.
- 지식/웹 컨텍스트를 프롬프트에 주입(RAG)할 수 있다 (`buildContextSection`).

---

## 8. 핵심 코딩 컨벤션

1. **JSON 시드 캐스트**: `as unknown as Type` 사용. JSON import는 union 리터럴을
   string으로 넓히므로 `satisfies` 사용 불가 (예: `raw as unknown as ClaimsData`).
2. **Prisma 싱글턴**: 항상 `lib/prisma.ts`에서 import. 직접 `new PrismaClient()` 금지.
   생성 클라이언트는 `@/lib/generated/prisma/client`에서 import (Neon adapter 사용).
3. **설비 상태 계산**: raw `eq.status` 직접 사용 금지. 도입연도 기준 자동 분류 유틸 사용
   (20년↑ 노후 / 10년↑ 정상 / 미만 신규). 간트 연도는 `GANTT_START`/`GANTT_END` 상수.
4. **데이터 레이어 분리**: 컴포넌트는 데이터 출처를 모른다. 정적 데이터는 `data/*.data.ts`,
   DB 변경은 `app/api/` 경유 (클라이언트에서 Prisma 직접 호출 금지).
5. **필터 상태**: URL 쿼리 파라미터로 관리 (딥링크 + 서버사이드 전환 용이).
6. **분석 상태 흐름**: `DRAFT → REVIEWED → APPROVED` (역방향 없음). 자동 확정 없음 —
   모든 상태 전환은 명시적 액션. (prisma `AnalysisStatus` / `ReviewAction` 참조)
7. **세션 우선**: API/페이지 핸들러는 비즈니스 로직 전에 세션·권한을 먼저 검사한다.
8. **UI 언어**: 한국어 전용, 간결·고밀도. 금액·날짜 등 표시 포맷 일관 유지.
9. **테스트**: 단위 테스트는 대상 옆 `lib/*.test.ts`에 두고 `npm run test`(Vitest)로 실행.

---

## 9. 보안 원칙

- 비밀키, `.env`/`.env.local`, API key, token을 **절대 노출하거나 임의 수정하지 않는다**.
- 코드에서 참조하는 환경 변수(값이 아닌 이름만): `DATABASE_URL`, `DATABASE_URL_UNPOOLED`,
  `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`, `BLOB_READ_WRITE_TOKEN`,
  `NAVER_CLIENT_ID`/`NAVER_CLIENT_SECRET`, `UPSTASH_REDIS_REST_URL`/`_TOKEN`,
  `RAG_THRESHOLD`, `PKM_SUGGEST_ENABLED`, `ENABLE_REVIEW_DEMO`, `TEST_MODE`.
- 새 패키지 설치, 대규모 리팩토링, 파일 삭제는 **사용자 승인 후** 진행한다.
- 역할 기반 접근 제어를 우회하지 않는다 (`lib/session-guard.ts` + `lib/permissions.ts`
  + `role-gate.tsx`).
- Vercel Blob URL은 외부 공개 가능 — 민감 파일 업로드 금지.
- 시드/데모 데이터에 **실명·실제 거래처명 등 민감 정보 사용 금지** (가명 처리).

---

## 10. 핵심 워크플로우

**대시보드 영역 추가/수정 시**
```
PRD.md에서 요구사항 확인
→ DB 영역: prisma/schema/<도메인>.prisma 모델 정의 → npx prisma generate
   정적 영역: types/ 타입 정의 → data/*.json + data/*.data.ts 작성
→ components/<영역>/ 클라이언트 컴포넌트 구현
→ app/(dashboard)/<영역>/page.tsx 서버 컴포넌트 연결 (세션 검사 포함)
→ 변경(mutation)은 app/api/<리소스>/ Route Handler로
→ npm run build (타입 확인) + npm run test
→ Codex(코라)에게 리뷰 요청 (AGENTS.md 프로토콜)
```

**TRA(입찰/계약 검토) 기능 변경 시**
```
prisma/schema/tra.prisma 확인 (모델 변경 시 마이그레이션)
→ lib/ai/extract.ts (AI 추출 프롬프트) / lib/schemas.ts (검증 스키마)
→ app/api/analysis|tenders|contract-analysis 라우트 수정
→ app/tender/[id]/ 컴포넌트 수정
→ npx prisma generate → npm run build 순서 확인
→ Vercel 배포 후 검증
```

---

## 11. Claude Code(클로이)의 역할 요약

- 메인 PM 겸 구현 담당 에이전트. 파일 수정 기본 권한 보유.
- 큰 변경 전 계획을 설명하고, 작은 단위로 구현한다.
- 수정 파일·변경 내용·이유·확인 방법을 함께 설명한다.
- 한 번에 하나의 에이전트만 파일을 수정한다 (Codex·Antigravity는 기본적으로 읽기/리뷰만).
- 협업 단계 전환(요청서 작성 → 발송 → 리뷰 반영)은 Dennis의 명시적 지시 후 진행한다.
- 상세 프로토콜은 [AGENTS.md](AGENTS.md) §9 참조.
</content>
</invoke>
