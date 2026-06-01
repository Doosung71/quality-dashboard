# Quality Director Board — MVP PRD

## 1. 프로젝트

| 항목 | 내용 |
|------|------|
| 이름 | quality-director-board |
| 한 줄 정의 | 품질부문장의 핵심 업무를 한 화면에 통합한 PoC 대시보드 + 입찰 심의 시스템 |
| 목적 | 품질 KPI 모니터링 + 입찰 사양 심의 업무 디지털화 |
| 운영자 | 두성님 |

---

## 2. 구현 영역

### 대시보드 8개 영역

| # | 영역 | 상태 | 완료 |
|---|------|------|------|
| ① | 시험장·시험 현황 | ✅ 완료 | 2026-05-12 |
| ② | 고객 클레임 트래커 | ✅ 완료 | 2026-05 |
| ③ | 협력업체 카드 풀 | ✅ 완료 | 2026-05 |
| ④ | 품질부문 인사·면담 | ✅ 완료 | 2026-05 |
| ⑤ | 경쟁사·고객·기타 정보 | ✅ 완료 | 2026-05 |
| ⑥ | 부적합(NCR) 관리 | ✅ 완료 | 2026-05 |
| ⑦ | 품질비용(Q-Cost) | ✅ 완료 | 2026-05 |
| ⑧ | 지식 저장소 (RAG) | ✅ 완료 | 2026-05 |

### 입찰 심의 시스템 (TRA — Tender Review Assistant)

| 기능 | 상태 |
|------|------|
| 입찰 목록 + 파일 업로드 | ✅ 완료 |
| AI 사양 요구사항 추출 | ✅ 완료 |
| 다중 파일 분석 + 재분석 | ✅ 완료 |
| 요구사항 편집 (Comply/Deviation) | ✅ 완료 |
| 규격 매핑 (match-standards) | ✅ 완료 |
| AI 요구사항 제안 + 웹 검색 | ✅ 완료 |
| 검토·승인 워크플로우 (DRAFT→REVIEWED→APPROVED) | ✅ 완료 |
| 부문장 코멘트·메모·의견서 | ✅ 완료 |
| 분석 이력 누적 관리 | ✅ 완료 |
| 피드백 게시판 | ✅ 완료 |

---

## 3. 데이터 규모 (실측 기준)

### 대시보드 로컬 시드 (`data/`)

| 데이터 | 건수 | 비고 |
|--------|------|------|
| Sites | 2 | 구미, 동해 |
| TestHall | 12 | 구미 7 + 동해 5 |
| TestYard | 3 | 동해 3 |
| Equipment | 30 | 각 홀·야드별 설비 |
| Claims | 12 | 칸반 시드 |
| Vendors | 18 | 탭 3개 |
| HR 인원 | 12 | 면담 이력 포함 |
| Intelligence | 20 | 카드형 |
| NCR | — | 시드 데이터 |
| QCost | — | 시드 데이터 |
| Knowledge | — | 시드 데이터 |

### TRA DB (Neon PostgreSQL / Prisma)

| 모델 | 설명 |
|------|------|
| User | 역할(PRACTITIONER/TEAM_LEAD/DIRECTOR), 상태(PENDING/ACTIVE/RESTRICTED/BANNED) |
| Tender | 입찰 건 |
| TenderDocument | 업로드 파일 (Vercel Blob) |
| Analysis | AI 분석 결과 (DRAFT/REVIEWED/APPROVED) |
| SpecRequirement | 추출된 요구사항 (Comply/Deviation/TBD) |
| Standard | IEC·KS 규격 데이터베이스 |
| ReviewHistory | 검토 이력 (append-only) |
| Comment | 분석별 코멘트·답글 |
| Feedback | 피드백 게시판 |

---

## 4. 제외 항목 (Non-goals)

- 실시간 동기화 (WebSocket)
- 알림 (이메일·푸시)
- 데이터 입력 폼 (대시보드 영역) — TRA는 폼 있음
- 검색 고도화 (대시보드 영역)
- 보고체계 자동 갱신 로직

---

## 5. 기술 스택

| 항목 | 내용 |
|------|------|
| 프레임워크 | Next.js 15 (App Router) |
| UI | Tailwind + shadcn/ui |
| 인증 | NextAuth v5 |
| DB ORM | Prisma (multi-file schema) |
| DB 호스팅 | Neon PostgreSQL |
| 파일 저장 | Vercel Blob |
| AI 추출 | Claude (primary) / Gemini (fallback) |
| RAG | lib/rag.ts + lib/knowledge.ts |
| PDF 파싱 | lib/pdf.ts |
| 배포 | Vercel (Production) |
| 개발 환경 | Surface Pro 11 (Windows 11 ARM64) |

### 데이터 레이어 전략

| 단계 | 영역 | 데이터 레이어 |
|------|------|-------------|
| MVP (현재) | 대시보드 8개 영역 | `/data/*.json` 로컬 JSON (시연용) |
| MVP (현재) | TRA 입찰 심의 | Neon PostgreSQL + Prisma |
| V1.5 | 대시보드 영역 | Notion API 연동 (단계적) |
| V2+ | 전 영역 | 단일 DB 통합 |

---

## 6. 마일스톤

| 순서 | 작업 | 상태 |
|------|------|------|
| 1 | 셋업 + 공통 레이아웃 + ① 시험장·시험 현황 | ✅ 완료 (2026-05-12) |
| 2 | ② 클레임 트래커 + 역할 인증 + Vercel 배포 | ✅ 완료 (2026-05-29) |
| 3 | ③~⑧ 대시보드 영역 완성 (로컬 JSON 시드) | ✅ 완료 (2026-05) |
| 4 | TRA 입찰 심의 시스템 통합 (DB + AI + 워크플로우) | ✅ 완료 (2026-06) |
| 5 | 모바일 다듬기 + 시연 준비 | 🔲 예정 (2026-09 전) |

---

## 7. 구현 완료 내역

### 역할 기반 인증 시스템 + Vercel 배포 (2026-05-29)

**인증 플로우:**
```
/register → status: PENDING → /pending 대기
관리자(/admin/users) 승인 + 역할 부여
재로그인 → 대시보드 접근
```

**역할 3단계:** `PRACTITIONER(실무자)` / `TEAM_LEAD(팀장)` / `DIRECTOR(임원)`

**User 모델 주요 필드:** role, status(PENDING/ACTIVE/RESTRICTED/BANNED), department, employeeId, nickname

**배포:** https://quality-dashboard-flax.vercel.app (Vercel Production)

**핵심 버그 수정:** `auth.config.ts`에 session 콜백 추가
- 미들웨어는 auth.config.ts만 사용 → token.status가 session.user에 매핑 안 됨
- → 전원 /banned 리다이렉트 버그 → session 콜백으로 수정

---

### 대시보드 8개 영역 (2026-05)

**파일 구조 패턴:**
```
types/{영역}.ts          TypeScript 타입
data/{영역}.json         시드 데이터
data/{영역}.data.ts      데이터 접근 함수
components/{영역}/       클라이언트 컴포넌트
app/(dashboard)/{영역}/page.tsx  서버 컴포넌트
```

**라우트 구조:**
```
app/(dashboard)/
  page.tsx            통합 메인 대시보드 ✅
  facilities/         ① 시험장·시험 현황 ✅
  claims/             ② 클레임 트래커 ✅
  vendors/            ③ 협력업체 카드 풀 ✅
  hr/                 ④ 인사·면담 ✅
  intelligence/       ⑤ 경쟁사·고객 정보 ✅
  ncr/                ⑥ 부적합(NCR) 관리 ✅
  qcost/              ⑦ 품질비용 ✅
  knowledge/          ⑧ 지식 저장소 ✅
```

---

### TRA 입찰 심의 시스템 (2026-05~06)

**DB 스키마 (prisma/schema/tra.prisma):**
```
Tender → TenderDocument(Blob) → Analysis(DRAFT/REVIEWED/APPROVED)
  └── SpecRequirement(Comply/Deviation/TBD) ←→ Standard(IEC·KS)
  └── ReviewHistory (append-only)
  └── Comment (스레드)
```

**AI 파이프라인:**
```
파일 업로드(Vercel Blob)
→ PDF 파싱(lib/pdf.ts)
→ 청크 분할 + RAG(lib/rag.ts)
→ Claude 추출(lib/ai/extract.ts) → Gemini fallback
→ SpecRequirement 저장 (DRAFT)
→ 웹 검색(DuckDuckGo) 보강 (선택)
```

**검토 워크플로우:**
```
PRACTITIONER: 작성 → 제출(submit)
TEAM_LEAD: 검토 승인(review-approve) / 반려(review-reject)
DIRECTOR: 최종 승인(final-approve) / 반려(final-reject)
```

**주요 API 엔드포인트:**
```
POST /api/tenders                          입찰 생성
POST /api/tenders/[id]/analyze             최초 분석
POST /api/tenders/[id]/reanalyze           재분석 (파일 선택 가능)
GET  /api/analysis/[id]                    분석 상세
POST /api/analysis/[id]/requirements/suggest  AI 요구사항 제안
POST /api/analysis/[id]/match-standards    규격 매핑
POST /api/analysis/[id]/submit|review-approve|...  워크플로우
GET  /api/analysis/[id]/export             결과 내보내기
POST /api/blob-upload                      파일 업로드
GET  /api/knowledge/search                 RAG 검색
```

---

## 8. 미입력 보류 항목 (`_meta.pendingFields`)

- 전 홀·야드 치수 (도면 확인 후 입력)
- 일부 Imp 설비 에너지 스펙 (동해 DC1/DC2/AC-SR2/Cert)
- 구미 DC2 Hipotronics `'08` 상태 미확인
