# Gemini CLI Mandates for QMS 2.0 PoC

Dennis 부문장님의 **QMS 2.0 AX 마스터플랜**에 따라, 본 프로젝트(`quality-dashboard`)의 모든 개발 및 기획 작업은 아래 원칙을 절대적으로 준수한다.

## 1. 핵심 아키텍처 준수 (To-Be Image)
- **Zero Double Work**: 모든 인터랙션은 시스템 내 완결성을 지향한다. (예: 클레임 상세 패널에서 즉시 보고서 생성 및 단계 이동 버튼 구현)
- **Obsidian Style Data**: 모든 문서 자산과 데이터 정의는 AI 친화적인 **Markdown(.md)** 및 **JSON** 형식을 유지한다.
- **Microservices Ready**: 향후 QMS 2.0 통합 플랫폼에 플러그인될 수 있도록 모듈화된 설계를 유지하며, 데이터 통신 포맷을 표준화한다.

## 2. 역할별 대시보드 최적화 (Director's View)
- 본 PoC는 **부문장 뷰(Director's View)**에 집중한다.
- 전사 품질 건전성, 협력사 SRM, 인적 자원 Workload, AI 리스크 요약 등의 핵심 KPI를 한눈에 볼 수 있도록 UI/UX를 설계한다.
- **모바일/태블릿 최적화**: CEO 보고 및 현장 이동 중 의사결정을 고려한 반응형 설계를 기본으로 한다.

## 3. AI 협업 프로콜 (Dream Team Workflow)
- **Researcher & Planner (Gemini CLI)**: 아키텍처 정렬, 신규 모듈 기획, 마스터플랜 연계성 검토 담당.
- **Coder (Claude)**: 실제 기능 구현 및 코드 작성 담당.
- **QA (Codex CLI (코라))**: 코드 품질 검수 및 에러 디버깅 담당.
- 모든 에이전트는 `QMS_2.0_MASTER_PLAN.md`와 본 `GEMINI.md`를 최상위 맥락으로 인지한다.

## 4. 데이터 가시성 및 시각화 원칙
- 숫자 나열보다는 **세그먼트 바, 칸반, 타임라인** 등 직관적 시각화 도구를 적극 활용한다.
- 상태값은 Red/Yellow/Green 신호등 체계를 통해 즉각적인 의사결정을 지원한다.
