# AGENTS.md

## 1. 목적

이 문서는 이 프로젝트에서 Claude Code (클로이) CLI, Codex CLI (코라), Antigravity CLI (앤), ChatGPT를 어떻게 사용할지 정하는 작업 규칙이다.

이 프로젝트의 기본 운영 방식은 다음과 같다.

- Claude Code (클로이) CLI를 중심으로 개발을 진행한다.
- Codex CLI (코라)는 코드 리뷰와 검증에 사용한다.
- Antigravity CLI (앤)는 기술 조사와 대안 비교가 필요할 때 사용한다.
- ChatGPT는 전략 정리, 학습, 프롬프트 작성, 문서화를 돕는다.

처음부터 여러 Agent가 동시에 코드를 수정하지 않는다.

목표는 많은 AI를 동시에 사용하는 것이 아니라, 역할을 나누어 더 안전하고 체계적으로 개발하는 방법을 배우는 것이다.

---

## 2. 가장 중요한 규칙

한 번에 하나의 Agent만 파일을 수정한다.

기본적으로 파일 수정 권한은 Claude Code (클로이) CLI에게만 있다.

Codex CLI (코라)와 Antigravity CLI (앤)는 사용자가 명확히 허락하지 않는 한 파일을 수정하지 않는다.

기본 역할은 다음과 같다.

```text
Claude는 구현한다.
Codex는 리뷰한다.
Antigravity는 조사한다.
ChatGPT는 정리하고 설명한다.
사용자가 최종 결정한다.
```

---

## 3. 프로젝트 정보

**프로젝트**: quality-dashboard
**설명**: LS전선 품질부문장을 위한 통합 품질 대시보드 + 입찰 심의 시스템 PoC
**D-day**: 2026년 9월 품질전략기능회의 (CEO + 임원진 시연)

---

## 4. 아키텍처

```
quality-dashboard/
├── app/
│   ├── layout.tsx                         # 루트 레이아웃
│   ├── globals.css
│   ├── (dashboard)/                       # 대시보드 라우트 그룹
│   │   ├── layout.tsx                     # 사이드바 + 헤더 공통 레이아웃
│   │   ├── page.tsx                       # 통합 메인 대시보드
│   │   ├── MainDashboard.tsx
│   │   ├── facilities/page.tsx            # ① 시험장·시험 현황 ✅
│   │   ├── claims/page.tsx                # ② 고객 클레임 트래커 ✅
│   │   ├── vendors/page.tsx               # ③ 협력업체 카드 풀 ✅
│   │   ├── hr/page.tsx                    # ④ 인사·면담 ✅
│   │   ├── intelligence/page.tsx          # ⑤ 경쟁사·고객 정보 ✅
│   │   ├── ncr/page.tsx                   # ⑥ 부적합(NCR) 관리 ✅
│   │   ├── qcost/page.tsx                 # ⑦ 품질비용 ✅
│   │   └── knowledge/page.tsx             # ⑧ 지식 저장소 ✅
│   ├── dashboard/                         # 입찰 심의 목록 (TRA)
│   │   ├── page.tsx
│   │   ├── TenderCard.tsx
│   │   ├── TenderList.tsx
│   │   ├── TenderThread.tsx
│   │   └── UploadForm.tsx
│   ├── tender/[id]/                       # 입찰 심의 상세 (TRA)
│   │   ├── page.tsx
│   │   ├── FilesPanel.tsx                 # 파일·재분석
│   │   ├── RequirementsEdit.tsx           # 요구사항 편집
│   │   ├── WorkflowActions.tsx            # 검토·승인 워크플로우
│   │   ├── AnalysisHistory.tsx
│   │   ├── CommentSection.tsx
│   │   ├── DirectorPanel.tsx
│   │   ├── ComplyMark.tsx / DeviationMark.tsx
│   │   ├── MatchStandardsButton.tsx
│   │   └── SysCharEdit.tsx / TitleEdit.tsx
│   ├── api/
│   │   ├── tenders/                       # 입찰 CRUD
│   │   │   └── [id]/analyze|reanalyze|documents/
│   │   ├── analysis/[id]/                 # 분석 결과 관리
│   │   │   ├── requirements/suggest/      # AI 요구사항 제안
│   │   │   ├── match-standards/           # 규격 매핑
│   │   │   ├── submit|review-approve|review-reject|final-approve|final-reject/
│   │   │   ├── draft-opinion|director-memo|export/
│   │   │   └── comments/
│   │   ├── requirements/[id]/comply|deviation/
│   │   ├── auth/[...nextauth]|register/
│   │   ├── admin/users/[id]/
│   │   ├── blob-upload/                   # Vercel Blob 파일 업로드
│   │   ├── feedback/[id]/reply/
│   │   └── knowledge/search/              # RAG 검색
│   ├── admin/users/                       # 사용자 관리
│   ├── feedback/ / help/ / profile/
│   └── login/ / register/ / pending/ / banned/
├── components/
│   ├── layout/                            # 공통 레이아웃
│   │   ├── sidebar.tsx / header.tsx
│   │   ├── dashboard-shell.tsx
│   │   └── role-gate.tsx
│   ├── facilities/ claims/ vendors/       # 대시보드 영역 컴포넌트
│   ├── hr/ intelligence/ ncr/ qcost/
│   ├── knowledge/
│   ├── onboarding/OnboardingModal.tsx
│   └── ui/                               # shadcn/ui 공통 컴포넌트
├── lib/
│   ├── prisma.ts                          # Prisma 클라이언트 싱글턴
│   ├── ai/extract.ts                      # AI 텍스트 추출 (Claude/Gemini)
│   ├── rag.ts                             # RAG 파이프라인
│   ├── knowledge.ts                       # 지식 저장소 유틸
│   ├── pdf.ts                             # PDF 파싱
│   ├── storage.ts                         # Vercel Blob 래퍼
│   ├── session-guard.ts                   # API 세션 검사
│   ├── admin.ts / schemas.ts
│   ├── facilities-utils.ts
│   ├── standard-keywords.ts
│   ├── display-name.ts / utils.ts
│   └── generated/prisma/                  # Prisma 생성 클라이언트
├── types/                                 # TypeScript 타입 정의
│   ├── facility.ts / test.ts / claim.ts
│   ├── vendor.ts / hr.ts / intelligence.ts
│   ├── ncr.ts / qcost.ts / knowledge.ts
│   └── next-auth.d.ts
├── data/                                  # 로컬 JSON 시드 데이터
│   ├── facility.json / tests.json
│   ├── claims.json / vendors.json
│   ├── hr.json / intelligence.json
│   ├── ncr.json / qcost.json / knowledge.json
│   └── *.data.ts                          # 각 영역별 데이터 접근 함수
├── prisma/
│   └── schema/
│       ├── common.prisma                  # User, Feedback, enum (QD·TRA 공유)
│       └── tra.prisma                     # Tender, Analysis, SpecRequirement, Standard, ReviewHistory, Comment
├── docs/
│   ├── research/                          # Antigravity (앤) 조사 결과
│   └── reviews/                           # Codex (코라) 리뷰 결과
├── auth.ts / auth.config.ts               # NextAuth v5 설정
├── middleware.ts                           # Edge 미들웨어
└── PRD.md                                 # 제품 요구사항 (마일스톤 포함)
```

---

## 5. 핵심 워크플로우

**대시보드 영역 추가 시**
```
PRD.md에서 해당 영역 요구사항 확인
→ types/ 에 TypeScript 타입 정의
→ data/ 에 JSON 시드 + .data.ts 파일 작성
→ components/ 에 클라이언트 컴포넌트 구현
→ app/(dashboard)/ 에 서버 컴포넌트 페이지 연결
→ npm run build 로 타입 오류 확인
→ Codex에게 구현 리뷰 요청
```

**TRA(입찰 심의) 기능 변경 시**
```
prisma/schema/tra.prisma 확인 (모델 변경 필요 시 마이그레이션)
→ lib/ai/extract.ts — AI 추출 프롬프트 수정
→ app/api/ 라우트 수정
→ app/tender/[id]/ 컴포넌트 수정
→ npm run build → npx prisma generate 순서 확인
→ Vercel 배포 후 검증
```

---

## 6. 개발 명령어

```bash
npm run dev          # 개발 서버 시작 (http://localhost:3000)
npm run build        # 프로덕션 빌드 (타입 오류 최종 확인)
npm run lint         # ESLint 검사
npx prisma generate  # Prisma 클라이언트 재생성
npx prisma db push   # 스키마를 DB에 반영 (개발용)
```

---

## 7. 코딩 규칙

1. **JSON 데이터 캐스트**: `as unknown as Type` 방식 사용
   - JSON import는 union 리터럴을 string으로 넓히므로 `satisfies` 사용 불가
   - 예: `const data = raw as unknown as FacilityData`

2. **설비 상태 계산**: `computeStatus(eq)` 함수 사용
   - raw `eq.status` 직접 사용 금지
   - 도입연도 기준 자동 분류: 20년↑ = 노후, 10년↑ = 정상, 미만 = 신규

3. **간트 차트 연도**: `GANTT_START` / `GANTT_END` 상수로 관리

4. **데이터 레이어 분리**: 컴포넌트는 데이터 출처를 모름
   - 대시보드 영역 데이터 접근 함수는 `data/*.data.ts`에 집중
   - TRA 데이터 접근은 API 라우트 (`app/api/`) 경유 — 컴포넌트에서 직접 Prisma 호출 금지

5. **Prisma 싱글턴**: `lib/prisma.ts`에서 import, 직접 new PrismaClient 금지

6. **AI 추출 모델 순서**: `lib/ai/extract.ts` — Claude 우선, Gemini fallback
   - 모델 ID 변경 시 항상 환경 변수 확인

7. **필터 상태**: URL 쿼리 파라미터로 관리 (딥링크 + 서버사이드 전환 용이)

8. **UI 언어**: 한국어 전용, 간결하고 정보 밀도 높게 유지

9. **분석 상태 흐름**: DRAFT → REVIEWED → APPROVED (역방향 없음)
   - 자동 확정 없음 — 모든 상태 전환은 명시적 액션

---

## 8. 보안 원칙

- 비밀키, `.env`, API key, token 절대 노출 또는 임의 수정 금지
- 새 패키지 설치, 대규모 리팩토링, 파일 삭제는 사용자 승인 후 진행
- 역할 기반 접근 제어: `lib/session-guard.ts` + `components/layout/role-gate.tsx` 사용
- Vercel Blob URL은 외부 공개 — 민감 파일 업로드 금지

---

## 9. Antigravity (앤)·Codex (코라) 협업 방법 (수동 운영)

모든 협업은 대화창에서 명시적 요청으로 시작한다. 자동 실행 훅은 사용하지 않는다.
**파일 수정 주체는 Claude Code (클로이) 하나로 제한** — Antigravity와 Codex는 코드를 직접 작성하거나 파일을 수정하지 않는다.

### Antigravity (앤) 리서치 요청
설계 전 조사가 필요할 때 아래 형식으로 대화창에 직접 요청.
결과는 `docs/research/` 에 저장 후 참조.

```text
프로젝트 배경:
조사 주제:
확인할 질문:
제약:
원하는 출력:
출처 요구:
```

### Codex (코라) 리뷰 요청
구현 완료 후 아래 형식으로 대화창에 직접 요청.
결과는 `docs/reviews/` 에 저장.

> ⛔ **단계 간 자율 진행 금지**:  
> 클로이는 요청서 작성 후 → Dennis "보내줘" 지시 후 → Codex 호출.  
> Codex 결과 수신 후 → Dennis "수정해줘" 지시 후 → 코드 반영.  
> 각 단계 사이에서 Dennis의 명시적 지시 없이 다음 단계로 자율 진행하지 않는다.

🔴 Critical 항목 발생 시 Dennis에게 즉시 보고 후 수정 지시를 기다린다.

```text
변경 목적:
변경 파일:
실행한 테스트:
특별히 봐야 할 리스크:
원하는 판정:
```

---

## 10. 지식 보관함 연계 (Vault Context)

**보관함 경로**: `C:\Obsidian\Dennis-Knowledge-Vault\`

코드 설계·데이터 시드 작성 전, 아래 vault 문서를 먼저 읽어 도메인 맥락을 확보한다.
Claude Code (클로이)는 구현 중 모르는 도메인 사항이 생기면 vault를 조회하고 Dennis에게 확인을 구한다.

### 대시보드 영역별 참조 vault 문서

| 영역 | 참조할 vault 문서 | 용도 |
|------|-----------------|------|
| ① 시험장·시험 현황 | `05_Work/wiki/2026-05-13_구미동해_시험설비_현황.md` | 구미·동해 실제 설비 현황, 투자 계획 |
| ① 시험장·시험 현황 | `05_Work/wiki/2026-05-20_구미동해_시험설비_투자_크로스레퍼런스.md` | 투자 방향 교차 분석 |
| ② 클레임 트래커 | `05_Work/wiki/MOC_업무_지식_허브.md` | 팀별 업무 구조 파악 |
| ③ 협력업체 카드 풀 | `05_Work/wiki/2026-05-20_구매품질팀.md` | 구매품질팀 현황, 협력사 관리 방식 |
| ③ 협력업체 카드 풀 | `05_Work/wiki/standards/MOC_규격_허브.md` | 협력사 인증·규격 항목 참고 |
| ④ 인사·면담 | `05_Work/wiki/2026-05-20_지중가공QA팀.md` 외 6개 팀 파일 | 팀별 인원·역할 구조 |
| ④ 인사·면담 | `05_Work/wiki/2026-05-20_품질경영팀.md` | QMS 인증 총괄 팀 현황 |
| 전 영역 공통 | `05_Work/wiki/standards/` 폴더 | IEC·KS 규격 내용 (시드 데이터 정확도) |

### 사용 원칙

- 데이터 시드(`data/*.json`) 작성 시 vault의 실제 수치·항목명을 우선 참조한다.
- 단, **원본 민감 정보(실명, 실제 거래처명 등)는 코드·시드에 절대 사용하지 않는다** — 반드시 가명 처리.
- vault 문서 내용과 PRD 요구사항이 충돌하면 Dennis에게 확인 후 결정한다.
- vault 문서는 읽기 전용이다. 코딩 작업 중 vault 파일을 수정하지 않는다.
