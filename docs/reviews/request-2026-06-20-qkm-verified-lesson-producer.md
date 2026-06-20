# Codex 검수 요청 — QKM Q4 verified_lesson producer (교훈 확정 파이프라인)

**요청일**: 2026-06-20
**요청자**: Claude Code (클로이, PM)
**리뷰 유형**: Implementation Review
**선행 문서**: `QKM/migrations/011_add_verified_lesson_source_type.sql` (세션45, `verified_lesson` 등급 레일), 메모리 `project-qkm-tender-lifecycle-loop.md`

---

## 변경 개요

QKM 지식 선순환 루프의 Q4 producer를 구현했다. 세션45에서 `verified_lesson` source_type(가중치 1.5, 등급 사다리 최상위)을 **신설만** 했고, 이 칸을 실제로 채우는 생산 경로(producer)가 없었다. 이번 구현은 **종결된 NCR/클레임 보고서 → LLM 구조화 교훈 초안 → 사람이 검토·편집·확정 → `verified_lesson` 인제스트** 흐름을 완성한다.

QMS 원칙②(AI Draft → 사람 확정)의 실제 구현체로, 기존 자동 생성 `qms_summary`(가중치 1.0, 미확정)와 등급을 구분한다.

### 설계 판단 (Dennis 승인, 2026-06-20)
| 항목 | 결정 |
|------|------|
| 초안 생성 | LLM structured output (tool_choice) — `root_cause` / `action_taken` / `tender_checklist_item` 3필드 |
| 실패 시 동작 | **fail-closed** — 사람의 명시적 확정 액션이므로 실패 시 500 + 에러 UI (자동 인제스트 fail-open과 구분) |
| 마스킹 | 이번엔 **보류** — `qms_summary`가 이미 마스킹 없이 적재 중이라 통일성 위해 producer 골격에 집중. 'qms 파생 청크 전체 일괄 마스킹'을 별도 과제로 분리·추적 |
| 중복 방지 | `source_path = verified_lesson/{ncr\|claim}/{id}` 기준 DELETE+INSERT (재확정 시 덮어쓰기) |
| 상태 전환 원자성 | `sql.transaction([DELETE, INSERT])` |
| 확정 상태 추적 | 별도 Prisma 필드 없이 KB의 `verified_lesson/{type}/{id}` 존재 여부로 판단 (DB 마이그레이션 0건) |
| 역할 가드 | `canWrite(role, "/ncr"|"/claims")` 재사용 — 해당 산출물 쓰기 권한자(담당자/팀장+)만 확정 |

---

## 변경된 파일

### 1. `lib/ingest-qms.ts` (수정, +180줄)
- `LessonRefType` / `LessonDraft` / `LessonDraftResult` 타입 신설
- `generateStructuredLesson()` — Anthropic tool_choice 구조화 출력 (Sonnet). prompt injection 방어 위해 `<REPORT>` 태그 격리
- `formatLessonMarkdown()` — 3필드 → 편집 가능한 마크다운 본문
- `loadClosedReport()` — 종결(`status==="Closed"`) 건만 로드, 아니면 null. `buildNcrMarkdown`/`buildClaimMarkdown` 재사용
- `getExistingLesson()` — 기존 확정 교훈 SQL 조회 (LLM 재생성 회피)
- `getOrDraftLesson()` — GET 경로 오케스트레이션 (기존 있으면 그대로, 없으면 LLM 초안)
- `ingestVerifiedLesson()` — POST 경로. **권위 재검증**(loadClosedReport로 종결 여부 서버 재확인) + 임베딩 + DELETE/INSERT 트랜잭션. 에러를 throw(fail-closed)

### 2. `app/api/ai/verified-lesson/route.ts` (신규)
- `GET ?type=&id=` — 초안 조회/생성. type/id validation, 종결 아님 400, 오류 500
- `POST` — 확정 인제스트. JSON validation, content 길이(≤5000) 검증, **역할 가드 403**, 인제스트 실패 **500(fail-closed)**
- 두 핸들러 모두 `requireActiveSession` + `checkRateLimit`

### 3. `components/ui/verified-lesson-panel.tsx` (신규)
- 종결 NCR/클레임 상세에 접이식 패널 (emerald 테마, 기존 `ai-suggestion-panel` 패턴)
- 펼침 시 GET → textarea 편집 → [교훈 확정]/[재확정] POST. 에러 표시(fail-closed). `canVerify=false`면 읽기만

### 4. `app/(dashboard)/ncr/[id]/NCRDetailPage.tsx` / `claims/[id]/ClaimDetailPage.tsx` (수정, 각 +6줄)
- `status === "Closed"`일 때만 `VerifiedLessonPanel` 렌더, `canVerify={canEdit}` 전달

### 5. `lib/knowledge.ts` (수정, +1)
- **`DEFAULT_SOURCE_TYPES`에 `verified_lesson` 추가** — 누락 시 확정 교훈이 검색에 안 잡혀 루프가 무효화됨 (구현 중 발견)

### 6. `app/api/ai/verified-lesson/route.test.ts` (신규)
- 13 케이스 (GET 5 + POST 8)

---

## 검수 요청 항목

### VL-01. fail-closed 에러 전파 일관성
**위치**: `lib/ingest-qms.ts` `ingestVerifiedLesson()`, `route.ts` POST
**내용**: 인제스트 실패 시 throw → 라우트 500 → 패널 에러 표시 경로가 끊김 없이 이어지는지. 기존 `ingestClosedNcr` 등은 fail-open(try/catch 흡수)인데, 이 함수만 의도적으로 fail-closed로 분기한 것이 맞는지.
**리스크**: 부분 실패(임베딩 성공 후 INSERT 실패 등) 시 사용자가 "확정됨"으로 오인하면 신뢰 붕괴.

### VL-02. 역할 가드 적정성
**위치**: `route.ts` POST — `canWrite(session.user.role, SECTION[type])`
**내용**: verified_lesson은 가중치 1.5로 TRA 입찰 검토까지 노출되는 최상위 조직 지식이다. 확정 권한을 "해당 산출물 쓰기 권한자(PRACTITIONER 포함, 본인 NCR/클레임)"로 둔 것이 적정한지, 아니면 TEAM_LEAD+로 좁혀야 하는지 의견.
**리스크**: 권한이 너무 넓으면 미검증 교훈이 고가중치로 유입.

### VL-03. 구조화 출력 파싱 안전성
**위치**: `lib/ingest-qms.ts` `generateStructuredLesson()`
**내용**: `tool_use.input`의 3필드를 타입 가드 후 빈 값이면 throw. tool_choice 강제 호출이 실패하거나 빈 응답일 때 처리가 충분한지.
**리스크**: 잘못된 파싱으로 빈/깨진 교훈이 확정될 가능성.

### VL-04. 권위 재검증 (클라이언트 우회 방지)
**위치**: `ingestVerifiedLesson()`의 `loadClosedReport()` 재호출
**내용**: POST 본문의 type/id만 믿지 않고 서버에서 종결 여부를 다시 확인한다. 미종결 건을 직접 POST로 확정 시도하면 차단되는지.
**리스크**: 종결 안 된 건이 교훈으로 적재.

### VL-05. 검색 누락 회귀 (knowledge.ts)
**위치**: `lib/knowledge.ts` `DEFAULT_SOURCE_TYPES`
**내용**: `verified_lesson` 추가가 기존 검색(QD 지식검색·TRA RAG)에 의도치 않은 영향(예: 노이즈 증가)을 주지 않는지. `tra_approved` 차단 로직과 무간섭인지.
**리스크**: 검색 결과 구성 변화.

### VL-06. content/metadata 정합성
**위치**: `ingestVerifiedLesson()` metadata `tender_checklist_item`
**내용**: 사용자가 textarea 본문을 편집해도 metadata의 `tender_checklist_item`은 초안 생성 시점 값으로 고정된다(PoC 허용 결정). 이 drift가 향후 루프(체크리스트 필터)에서 문제될 소지가 있는지 의견.
**리스크**: 본문과 메타데이터 불일치.

---

## 빌드/테스트 상태

```
npx vitest run app/api/ai/verified-lesson/route.test.ts → 13 passed
npx vitest run (전체)                                    → 102 passed (10 files)
npm run build                                            → 성공 (verified-lesson 라우트 포함 컴파일)
```

브라우저 골든패스 테스트는 **미실행** (코라 검수 후 배포 전 수행 예정).

---

## 원하는 판정

- VL-01~VL-06 각 항목 Critical / High / Medium / Low / OK 판정
- 전체: 승인 / 조건부 승인 / 보류
- 특히 VL-02(역할 범위)는 보안·지식 품질 트레이드오프이므로 명확한 권고 요청
