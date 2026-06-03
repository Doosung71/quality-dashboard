# team-protocol.md

## 팀 구성

| Agent | Role | 운영 방식 |
|-------|------|-----------|
| **Claude Code (클로이)** | PM & Senior Developer | 파일 수정 유일 주체 — [AGENTS.md](AGENTS.md) 참조 |
| **Gemini** | Technical Researcher | 코드 수정 불가; 리서치 결과를 `docs/research/*.md`에만 저장 가능 |
| **Codex (코라)** | Code Reviewer | 코드 수정 불가; 리뷰 결과를 `docs/reviews/*.md`에만 저장 가능 |

---

## 기본 원칙

1. **Claude Code (클로이)가 PM이자 최종 의사결정자**다. Gemini와 Codex의 결과는 인풋이며, 최종 판단은 Claude Code (클로이)가 내린다.
2. **각 에이전트는 자신의 영역에서만 행동**한다. Gemini는 코드를 쓰지 않고, Codex는 아키텍처를 결정하지 않는다.
3. **모든 협업은 명시적 요청으로 시작**된다. 암묵적 전달 없이 요청-응답 형식을 지킨다.
4. **Critical 이슈는 작업을 멈춘다.** 🔴 Critical 리뷰 결과가 나오면 다음 단계로 진행하지 않는다.
5. **파일 쓰기 경계는 경로 단위로 고정된다.**
   - Gemini: `docs/research/*.md`에만 쓰기 허용
   - Codex (코라): `docs/reviews/*.md`에만 쓰기 허용
   - `src/`, `tests/`, `config/`, `.env`, `data/`, `.claude/`, `memory/`는 Gemini·Codex (코라) 절대 수정 금지
   - 새 Markdown 보고서 파일 생성은 가능하지만, 기존 파일 덮어쓰기는 Claude Code (클로이) 또는 Dennis의 승인 후에만 허용
   - Claude Code (클로이)는 Gemini·Codex가 저장한 보고서를 읽고 반영 여부를 판단한 뒤, 실제 코드 수정을 직접 수행한다.

---

## 표준 개발 워크플로우

```
┌─────────────────────────────────────────────────────────────┐
│                    새 기능 개발 사이클                        │
└─────────────────────────────────────────────────────────────┘

  Claude (설계 시작)
      │
      ▼
  [리서치 필요?] ──YES──▶ Gemini 조사 요청
      │                       │
      │                  Gemini 보고
      │                       │
      ◀───────────────────────┘
      │
      ▼
  Claude (구현)
      │
      ▼
  [구현 완료] ──────────▶ Codex (코라) 리뷰 요청
                              │
                         Codex (코라) 보고
                              │
                    ┌─────────┴──────────┐
                    │                    │
              Critical 없음?        Critical 있음?
                    │                    │
              Claude 적용          Claude 즉시 수정
                    │                    │
              다음 단계            Codex (코라) 재확인 요청
```

---

## 요청 형식

### Claude → Gemini (리서치 요청)
```
[리서치 요청] {주제}

배경: {왜 이 정보가 필요한지}
필요한 정보:
1. {질문 1}
2. {질문 2}
마감: {언제까지 필요한지}
```

### Claude → Codex (코라) (리뷰 요청)
```
[리뷰 요청] {모듈명 또는 파일 경로}

변경 내용: {무엇을 구현했는지 한 줄 요약}
특히 확인 요망: {집중 검토 필요한 부분}
```

### Gemini → Claude (리서치 보고)
> `GEMINI_RESEARCHER_START.md`의 보고 형식 준수

### Codex (코라) → Claude (리뷰 보고)
> `CODEX_REVIEWER_START.md`의 보고 형식 준수

---

## 에스컬레이션 규칙

| 상황 | 처리 방법 |
|------|-----------|
| Gemini 리서치 결과가 상충될 때 | Claude가 트레이드오프 판단 후 결정, 결정 근거 기록 |
| Codex (코라) Critical이 설계 문제일 때 | Claude가 Gemini에 재조사 요청 후 설계 변경 |
| 에이전트 간 의견 충돌 | Claude가 최종 결정, `# 결정 근거:` 주석으로 코드에 기록 |
| 외부 API 스펙 변경 발견 시 | Gemini가 먼저 보고 → Claude가 영향 범위 분석 → Codex가 수정 코드 리뷰 |

---

## 스프린트 구조

```
{{SPRINT_PHASES}}
```

---

## 금지 사항

- Gemini·Codex가 `src/`, `tests/`, `config/`, `.env`, `data/`, `.claude/`, `memory/` 수정
- Gemini가 `docs/research/` 이외 경로에 파일 생성
- Codex가 `docs/reviews/` 이외 경로에 파일 생성
- Gemini·Codex가 `git add`, `git commit`, `git push` 실행
- Codex가 설계 결정 또는 기술 스택 변경 지시
- Claude가 Codex (코라) Critical 무시하고 다음 단계 진행
- 어떤 에이전트도 `credentials.json`, `token.json`, API Key 커밋 허용

---

## 커뮤니케이션 채널

모든 협업 내용은 이 저장소 내 기록:
- 설계 결정 → `docs/decisions/` (ADR 형식, Claude가 작성)
- 리서치 결과 → `docs/research/` (Gemini가 직접 저장)
- 리뷰 결과 → `docs/reviews/` (Codex가 직접 저장; Claude가 반영 여부 판단 후 코드 수정)
