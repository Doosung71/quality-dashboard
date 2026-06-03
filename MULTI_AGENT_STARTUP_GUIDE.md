# Multi-Agent Session Startup Guide

이 문서는 새 세션을 시작할 때 Claude Code (클로이), Gemini CLI, Codex CLI (코라)를 어떤 순서로 깨우고 어떤 파일을 읽게 할지 정리한 가이드다.

**이 프로젝트**: LS전선 품질부문장 대시보드 (quality-dashboard)  
**D-day**: 2026년 9월 품질전략기능회의 (CEO + 임원진 시연)

## 결론

권장 방식은 다음과 같다.

```text
1. 각 Agent에게 자기 역할 파일을 먼저 읽힌다.
2. Claude Code (클로이)에게 프로젝트를 읽고 오늘 작업 계획을 만들게 한다.
3. Claude Code (클로이)가 필요할 때 Gemini와 Codex에게 구체 요청문을 작성한다.
4. Gemini와 Codex는 자기 역할 파일을 기준으로 응답한다.
```

매번 전체 운영 프롬프트를 다시 붙여 넣는 방식은 권장하지 않는다. 길고 반복적이며, 세션마다 작은 누락이 생기기 쉽다.

## 파일 구성

이 프로젝트의 Agent 관련 파일 (모두 프로젝트 루트에 위치):

```text
AGENTS.md                   # 전체 운영 규칙 + 프로젝트 아키텍처 + 코딩 규칙
CLAUDE.md                   # Claude Code (클로이) 특화 지침
CLAUDE_AGENT_START.md       # Claude Code (클로이) 세션 시작 지침
GEMINI_RESEARCHER_START.md  # Gemini CLI 시작 지침
CODEX_REVIEWER_START.md     # Codex CLI (코라) 시작 지침
PRD.md                      # 제품 요구사항 (D-day 역산 마일스톤)
```

산출물 저장 위치:

```text
docs/research/     Gemini 조사 결과
docs/reviews/      Codex (코라) 리뷰 결과
```

## 새 세션 시작 순서

### 1. Claude Code (클로이) 세션

Claude Code (클로이)에게 먼저 아래처럼 말한다.

```markdown
프로젝트 루트의 AGENTS.md, CLAUDE_AGENT_START.md, PRD.md를 읽어줘.

너는 이 프로젝트의 PM 겸 메인 코더야.
현재 프로젝트 구조와 문서를 파악한 뒤, 오늘 진행할 작업 계획을 3단계 이내로 제안해줘.
```

Claude가 프로젝트를 파악한 뒤 Gemini 또는 Codex에게 줄 요청문을 만들게 한다.

### 2. Gemini CLI 세션

Gemini CLI에는 아래처럼 시작한다.

```markdown
아래 파일의 역할 지침을 기준으로 이 세션에서 리서처 역할을 수행해줘.

- GEMINI_RESEARCHER_START.md

파일을 직접 수정하지 말고, Claude Code (클로이)가 docs/research/에 저장할 수 있는 Markdown 형식으로 조사 결과를 작성해줘.
앞으로 내가 주는 Research Request에만 답해줘.
```

그 뒤 Claude가 만든 리서치 요청문을 붙여 넣는다.

### 3. Codex CLI (코라) 세션

Codex CLI (코라)에는 아래처럼 시작한다.

```markdown
아래 파일의 역할 지침을 기준으로 이 세션에서 리뷰어 겸 품질 책임자 역할을 수행해줘.

- AGENTS.md
- CODEX_REVIEWER_START.md

기본적으로 파일을 직접 수정하지 말고, 리뷰 결과와 수정 권고안을 작성해줘.
앞으로 내가 주는 Plan Review Request 또는 Implementation Review Request에만 답해줘.
```

그 뒤 Claude가 만든 리뷰 요청문을 붙여 넣는다.

## 누가 누구에게 요청하나?

기본 운영은 Claude 중심이다.

```text
사용자
  ↓
Claude Code (클로이) = PM + Main Coder
  ├─ Gemini CLI = Researcher
  └─ Codex CLI (코라) = Reviewer + Quality Owner
```

사용자는 세 Agent 모두에게 직접 전체 맥락을 반복 설명하지 않는다.

Claude가 할 일:

- 필요한 질문을 Gemini용 리서치 요청문으로 바꾼다.
- 구현 결과를 Codex용 리뷰 요청문으로 바꾼다.
- Gemini/Codex (코라) 결과를 프로젝트 문서와 코드에 반영한다.

Gemini가 할 일:

- 조사 요청에만 답한다.
- 출처, 확인 날짜, 추천안을 포함한다.
- 파일 수정은 하지 않는다.

Codex가 할 일:

- 리뷰 요청에만 답한다.
- Critical/High/Medium/Low 기준으로 판단한다.
- 완료 가능 여부를 판정한다.

## 매 세션 전체 프롬프트를 다시 줘야 하나?

아니다.

세션 시작 때는 각 Agent에게 자기 시작 파일만 읽게 한다.

```text
Claude: AGENTS.md + CLAUDE_AGENT_START.md + PRD.md
Gemini: GEMINI_RESEARCHER_START.md
Codex (코라):  AGENTS.md + CODEX_REVIEWER_START.md
```

Gemini가 로컬 파일을 직접 읽지 못하는 환경이면 `GEMINI_RESEARCHER_START.md` 내용을 처음 한 번 붙여 넣는다.

## 좋은 운영 패턴

### 새 페이지(업무 영역) 구현 전

```text
Claude가 PRD.md 해당 영역 요구사항 확인 + 불확실성 정리
→ 필요 시 Gemini에게 리서치 요청 (예: Notion API 연동, 외부 라이브러리 선택)
→ Claude가 타입·데이터·컴포넌트 설계 문서 작성
→ 필요 시 Codex에게 설계 리뷰
→ Claude가 구현 시작
```

### 구현 후

```text
Claude가 구현 및 npm run build 확인
→ Codex에게 구현 리뷰
→ Claude가 Critical/High 수정
→ Codex (코라) 재리뷰 (필요 시)
→ docs/reviews/ 에 결과 저장
```

### 데이터 스키마 변경 전

```text
Claude가 변경 계획 작성 (타입 변경 범위, 영향받는 컴포넌트 목록)
→ Codex가 타입 안전성·하위 컴포넌트 영향·데이터 손실 위험 검토
→ Claude가 types/ → data/ → components/ 순으로 반영
→ npm run build 로 타입 오류 최종 확인
```

### Notion API 연동 전 (V1.5 단계)

```text
Gemini에게 Notion API 최신 스펙 + 인증 방법 조사 요청
→ Claude가 lib/data.ts 추상화 레이어 설계
→ Codex가 API key 노출 위험·레이트 리밋 처리 검토
→ Claude가 영역별로 단계적으로 연동
```

## 최소 시작 프롬프트

시간이 없을 때는 아래만 써도 된다.

Claude:

```markdown
AGENTS.md, CLAUDE_AGENT_START.md, PRD.md를 읽고 PM 겸 메인 코더로 시작해줘.
현재 상태를 파악하고 오늘 할 작업 계획을 3단계 이내로 제안해줘.
```

Gemini:

```markdown
GEMINI_RESEARCHER_START.md 기준으로 리서처 역할을 해줘.
파일 수정 없이, 출처 포함 Markdown 조사 결과만 작성해줘.
```

Codex (코라):

```markdown
AGENTS.md와 CODEX_REVIEWER_START.md 기준으로 리뷰어 겸 품질 책임자 역할을 해줘.
파일 수정 없이, 심각도별 리뷰와 완료 판정을 작성해줘.
```
