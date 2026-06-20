**검수일**: 2026-06-20
**검수자**: Codex CLI (코라)
**요청서**: `C:\Dev\QMS 2.0 Integration\quality-dashboard\docs\reviews\request-2026-06-20-qkm-verified-lesson-producer.md`

# Codex (코라) Review: QKM Q4 verified_lesson producer

## 최종 판정

보류

Critical 발견 사항은 없습니다. 다만 High 1건이 남아 있어 완료 승인하지 않습니다.

## 발견 사항

### Critical

없음.

### High

1. `app/api/ai/verified-lesson/route.ts:74`, `lib/permissions.ts:21`
   - 항목: VL-02 역할 가드
   - 내용: `POST /api/ai/verified-lesson`는 `canWrite(session.user.role, SECTION[type])`만 확인한다. `PRACTITIONER`도 `/ncr`, `/claims` 쓰기 권한이 있으므로 확정 가능하고, API 경로에서는 해당 NCR/클레임이 본인 담당인지, 본인 팀 범위인지, 또는 팀장 이상인지 확인하지 않는다.
   - 리스크: ID를 아는 실무자가 다른 팀/타 담당 종결 NCR 또는 클레임을 `verified_lesson`으로 확정할 수 있다. 이 source_type은 migration 011에서 1.5 가중치로 `tra_approved`, `obsidian`, `standards`와 동급 처리되므로 미검증 또는 권한 밖 교훈이 입찰 RAG 최상위 신뢰 레일에 유입될 수 있다.
   - 권고: PoC라도 기본 정책은 `TEAM_LEAD`, `DIRECTOR`, `ADMIN`으로 좁히는 것이 안전하다. PRACTITIONER 허용이 필요하면 `loadClosedReport`가 assignee/createdBy/team scope를 함께 반환하고, 서버에서 "본인 담당 또는 TEAM_LEAD+"를 검증해야 한다. 테스트에는 `PRACTITIONER` 타인 건 403, 본인 건 허용 또는 TEAM_LEAD+만 허용 케이스를 추가한다.

### Medium

1. `app/api/ai/verified-lesson/route.ts:60`, `app/api/ai/verified-lesson/route.ts:66`, `lib/ingest-qms.ts:592`
   - 항목: VL-03 / POST 확정 품질 검증
   - 내용: 초안 생성의 structured output 파싱은 필수 3필드 빈 값 검사를 수행하지만, 최종 확정 POST는 `content`가 비어 있지 않고 5000자 이하인지 만 확인한다. 사용자가 본문을 전부 지우고 임의 텍스트를 넣어도 `verified_lesson`으로 저장된다.
   - 리스크: 사람 확정 액션이 있더라도 최상위 신뢰 source_type에 구조가 깨진 교훈이 들어갈 수 있다.
   - 권고: 서버에서 최소한 `## 근본원인`, `## 시정·예방 조치`, `## 입찰 검토 체크포인트` 섹션 존재와 각 섹션 비어 있지 않음을 검증한다.

2. `components/ui/verified-lesson-panel.tsx:53`, `lib/ingest-qms.ts:595`, `lib/ingest-qms.ts:599`
   - 항목: VL-06 content/metadata 정합성
   - 내용: 사용자가 textarea의 체크포인트 문장을 수정해도 POST의 `checklistItem`은 GET 시점 state 값 그대로 전송되고, metadata의 `tender_checklist_item`도 그 값으로 저장된다.
   - 리스크: 본문과 metadata가 갈라져 향후 checklist 필터, 통계, tender 매칭에서 서로 다른 교훈을 가리킬 수 있다.
   - 권고: POST 시 최종 `content`에서 체크포인트 섹션을 서버에서 재파싱해 metadata를 생성하거나, 체크포인트를 별도 입력 필드로 노출해 본문 수정과 동기화한다.

3. `components/knowledge/search-card.tsx:36`, `components/ui/knowledge-suggest.tsx:24`, `lib/knowledge.ts:33`
   - 항목: VL-05 검색 노출 UX
   - 내용: `DEFAULT_SOURCE_TYPES`에 `verified_lesson`을 포함한 것은 검색 누락 방지 측면에서 맞다. 그러나 검색 UI는 `qms_summary`만 "AI 요약 · 미검토"로 구분하고, `verified_lesson`은 일반 노트처럼 보인다. `KnowledgeSuggest`도 `standards` 외에는 모두 "노트"로 표시한다.
   - 리스크: 사용자가 고신뢰 확정 교훈과 일반 노트/원시 QMS 청크의 성격 차이를 구분하기 어렵다.
   - 권고: `verified_lesson` 전용 배지("확정 교훈", "사람 검증")를 추가하고 `qms_summary`와 시각적으로 반대되는 신뢰 표시를 제공한다.

4. `lib/ingest-qms.ts:491`, `lib/ingest-qms.ts:564`, `components/ui/verified-lesson-panel.tsx:84`
   - 항목: 외부 AI API 전송 및 마스킹
   - 내용: 교훈 초안 생성 시 종결 NCR/클레임 markdown 전체가 Anthropic API로 전송된다. UI에는 "외부 AI API 전송" 표시가 있으나, 요청서의 결정대로 마스킹은 보류되어 있다.
   - 리스크: 고객명, 귀책처, 비용성 문구, 담당자명 등이 보고서 본문에 포함될 경우 외부 전송 경로에 노출될 수 있다.
   - 권고: 이번 producer 승인 전 필수는 아니더라도, "qms 파생 청크 전체 일괄 마스킹" 과제를 공식 backlog/runbook에 연결하고, 초안 생성 API에도 동일한 전처리 함수를 적용할 수 있게 분리한다.

### Low

1. `app/api/ai/verified-lesson/route.ts:37`, `app/api/ai/verified-lesson/route.ts:88`
   - 내용: 서버 로그에는 내부 오류 메시지를 남기지만 클라이언트 응답은 일반 메시지로 고정되어 있어 보안상 적절하다. 다만 운영자가 원인 추적을 쉽게 하려면 request id 또는 ref type/id를 민감정보 없이 함께 로깅하는 것이 좋다.

## VL-01~VL-06 판정

| 항목 | 판정 | 근거 |
|---|---|---|
| VL-01 fail-closed 에러 전파 | OK | `ingestVerifiedLesson()`가 throw하고 route POST가 500을 반환하며 패널이 에러를 표시한다. targeted test도 500 케이스 통과. |
| VL-02 역할 가드 | High | `canWrite` 재사용으로 PRACTITIONER까지 통과하고 객체 소유/팀 범위 검증이 없다. |
| VL-03 구조화 출력 파싱 안전성 | Medium | LLM tool_use 파싱 자체는 OK. 다만 POST 확정 content 구조 검증이 없어 최종 확정 데이터 품질을 보장하지 못한다. |
| VL-04 권위 재검증 | OK | POST에서 `loadClosedReport()`를 재호출해 종결 여부를 서버에서 다시 확인한다. |
| VL-05 검색 누락 회귀 | OK / Medium UX | `DEFAULT_SOURCE_TYPES` 추가와 `tra_approved` 차단은 충돌하지 않는다. 다만 검색 UI에서 확정 교훈 배지가 없다. |
| VL-06 content/metadata 정합성 | Medium | 최종 편집 본문과 metadata `tender_checklist_item`이 drift될 수 있다. |

## 반드시 수정할 항목

1. `verified_lesson` 확정 권한을 `TEAM_LEAD+`로 좁히거나, PRACTITIONER 허용 시 서버에서 본인 담당/팀 범위까지 검증한다.
2. POST 확정 시 최종 `content`의 필수 섹션과 비어 있지 않은 값을 서버에서 검증한다.
3. metadata `tender_checklist_item`은 최종 본문에서 재파싱하거나 별도 필드와 동기화한다.

## 테스트/검증 제안

- `npx vitest run app/api/ai/verified-lesson/route.test.ts`: 실행 확인, 13 passed.
- `npx vitest run lib/knowledge.test.ts`: 실행 확인, 6 passed.
- 추가 필요:
  - PRACTITIONER 권한 정책 테스트: 허용 정책에 따라 `TEAM_LEAD+ only` 또는 `own item only` 검증.
  - POST content 구조 검증 테스트: 필수 섹션 누락/빈 섹션 400.
  - checklist drift 테스트: 본문 수정 후 metadata가 최종 체크포인트와 일치하는지.
  - 운영 DB 검증: migration 011 적용 후 `knowledge_chunks_source_type_check`와 `search_knowledge_hybrid`의 `verified_lesson` 1.5 포함 여부 출력 저장.
  - 브라우저 골든패스: Closed NCR/Claim 상세에서 GET 초안 생성, 편집, 확정, 재확정, 권한 없음 읽기 전용, 실패 500 에러 표시.

## 재리뷰 필요 여부

필요.

High 항목(VL-02)이 수정된 뒤 재리뷰를 권고한다. Critical은 없지만, `verified_lesson`이 최상위 신뢰 레일이라는 점 때문에 권한 범위가 확정되기 전에는 완료 승인할 수 없다.
