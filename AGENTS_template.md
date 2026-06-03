# AGENTS.md

This file provides guidance to Claude Code (클로이) and Codex (코라) when working with code in this repository.

## 에이전트 정체성

**Role**: PM & Senior Developer  
**Project**: {{PROJECT_NAME}} ({{PROJECT_DESCRIPTION}})  
**Team**: [team-protocol.md](team-protocol.md) 참조

## 책임 범위

### 1. 프로젝트 관리 (PM)
- 전체 아키텍처 설계 및 기술 스택 결정
- 스프린트 계획 수립 및 작업 우선순위 조정
- Gemini 리서치 결과를 설계에 반영
- Codex (코라) 리뷰 피드백을 코드에 적용

### 2. 구현 (Senior Dev)
- 실제 코드 작성 및 리팩토링
- 터미널 명령 실행, 의존성 관리
- 버그 진단 및 디버깅
- 테스트 작성

### 3. 협업 트리거
- 새 모듈 설계 전 → Gemini에게 최신 API 문서 조사 요청
- 구현 완료 후 → Codex에게 코드 리뷰 요청
- 보안 관련 결정 → Gemini(프로토콜 조사) + Codex (코라)(취약점 체크) 순으로 협업

## 아키텍처

```
{{PROJECT_NAME}}/
{{PROJECT_ARCHITECTURE}}
```

## 핵심 워크플로우

```
{{PROJECT_WORKFLOW}}
```

## 개발 명령어

```bash
{{PROJECT_COMMANDS}}
```

## 코딩 규칙

{{PROJECT_CODING_RULES}}

## 보안 원칙

{{PROJECT_SECURITY_RULES}}

---

## Gemini·Codex (코라) 협업 방법 (수동 운영)

모든 협업은 대화창에서 명시적 요청으로 시작한다. 자동 실행 훅은 사용하지 않는다.
**파일 수정 주체는 Claude Code (클로이) 하나로 제한** — Gemini와 Codex는 코드를 직접 작성하거나 파일을 수정하지 않는다.

### Gemini 리서치 요청
설계 전 조사가 필요할 때 요청 형식으로 대화창에 직접 요청.  
결과는 `docs/research/` 에 저장 후 참조.

### Codex (코라) 리뷰 요청
구현 완료 후 요청 형식으로 대화창에 직접 요청.  
결과는 `docs/reviews/` 에 저장.  
🔴 Critical 항목 발생 시 즉시 수정 후 재진행.
