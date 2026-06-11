# Antigravity Research Request — ITP 자동 생성 AI 기능

**요청일**: 2026-06-11
**요청자**: Claude Code (클로이, PM)
**결과 저장 위치**: `docs/research/result-2026-06-11-itp-auto-generation.md`

---

## 프로젝트 배경

- **프로젝트**: quality-dashboard (LS전선 QMS 2.0 PoC)
- **기술 스택**: Next.js 15 App Router, TypeScript, Prisma + Neon Postgres, Vercel Blob, Claude API (Anthropic SDK), pgvector RAG
- **목적**: 입찰 프로젝트(TRA) 시스템에서 고객 요구사항 PDF를 업로드하면 AI가 분석 결과를 생성하는 파이프라인이 이미 구현되어 있다. 여기에 추가로 "ITP(Inspection and Test Plan / 검사시험계획서)"를 자동 생성하는 기능을 추가하려 한다.

---

## 조사 주제

케이블 제조 산업(LS전선) 환경에서, 고객 요구사항(사양서 PDF 또는 텍스트)을 입력받아 **ITP(검사시험계획서)를 자동 생성**하는 AI 기능의 설계 및 구현 방안.

---

## 확인할 질문

### Q1. ITP 표준 구조 및 케이블 산업 특화 항목

케이블 제조업(IEC 60228, IEC 60332, KS C 계열 등 적용) 환경에서 ITP의 표준 구조와 주요 항목은 무엇인가?
- 일반적인 ITP 테이블의 컬럼 구조 (시험 항목 / 규격 / 시험 방법 / 합부 기준 / 담당 / 빈도 등)
- LS전선이 납품하는 고압케이블·통신케이블·특수케이블 분야별 핵심 시험 항목 예시
- 고객사(한전, 삼성, 현대 등)별로 요구하는 ITP 항목 차이가 있는지

### Q2. 고객 요구사항 → ITP 항목 자동 매핑 전략

고객 사양서(PDF/Word, 한국어 + 영어 혼재) 텍스트에서 시험 요건을 자동 추출하여 ITP 항목으로 변환하는 AI 전략은?
- Structured Output (JSON Schema) vs 단순 텍스트 파싱 중 어떤 접근이 적합한가?
- 기존 RAG 파이프라인(pgvector + obsidian 노트 + PDF 규격 청크)을 활용한 "규격 참조" 보강 방법
- 추출 정확도를 높이기 위한 few-shot 예시 전략
- 한국어/영어 혼재 문서에서의 시험 항목 인식 방법

### Q3. ITP 출력 포맷 및 저장 방식

생성된 ITP를 어떤 포맷으로 제공해야 사용성이 가장 높은가?
- **옵션 A**: Excel(.xlsx) 파일 생성 후 Vercel Blob 저장 → 다운로드 링크 제공
- **옵션 B**: JSON 구조로 DB 저장 → UI 테이블 렌더링 + "Excel 내보내기" 버튼
- **옵션 C**: Markdown/HTML 렌더링 (기존 AI 응답 패턴과 동일)
- LS전선 실무자가 이후 수동 수정해야 한다는 점을 고려할 때 어떤 포맷이 최적인가?

### Q4. 기존 TRA 파이프라인과의 통합 설계

현재 TRA 파이프라인 구조:
- `/api/tenders/[id]/analyze` — 최초 분석 (요건 추출 + 규격 매핑 + RAG)
- `/api/tenders/[id]/reanalyze` — 추가 파일 기반 재분석
- `Analysis` 모델 (DRAFT→APPROVED 워크플로우, 부문장 최종 승인 시 RAG 인제스트)

ITP 생성 기능을 이 파이프라인에 어떻게 연결해야 하는가?
- 기존 분석 결과(`Analysis.requirements`)를 ITP 생성 입력으로 재활용 가능한가?
- 별도 ITP 생성 엔드포인트 vs 기존 analyze 흐름 확장 중 어느 것이 더 적합한가?
- ITP를 언제 생성해야 하는가: (a) 분석 직후 자동, (b) 팀장 검토 후 수동 트리거, (c) 부문장 승인 후

---

## 제약

- **기술 스택 고정**: Next.js 15, Claude API (claude-sonnet-4-6 기본), Neon Postgres, Vercel Blob — 추가 서비스/패키지 최소화
- **파일 크기 제한**: Vercel Blob presigned 500MB, 일반 첨부파일 20MB
- **Excel 생성 라이브러리**: 현재 미설치. 설치가 필요하다면 `exceljs` 또는 `xlsx` 중 추천과 이유 포함
- **기존 워크플로우 비파괴**: 현재 TRA의 DRAFT→검토요청→승인 흐름을 건드리지 않는 것이 원칙
- **한국어 출력 필수**: ITP 항목 명칭 및 설명은 한국어로 생성 (규격명은 영문 유지 허용)
- **E2E-1 실사용 중**: 현재 65명 실사용 중이므로 기존 페이지 UX 변경 최소화

---

## 원하는 출력

```markdown
# Research Result: ITP 자동 생성 AI 기능

## 결론
## 추천안 (Q1~Q4 각각)
## ITP 표준 컬럼 예시 테이블
## 기술 옵션 비교표
## 구현 단계 제안 (Phase 분리)
## 근거 (출처 + 확인 날짜)
## 리스크
## 클로이에게 권장하는 다음 행동
```

---

## 출처 요구

- IEC 표준 문서 / KS 표준 우선
- 케이블 제조업 ITP 사례 있으면 포함
- Claude API Structured Output 공식 문서 (docs.anthropic.com)
- `exceljs` / `xlsx` npm 패키지 최신 문서
- 각 항목마다 출처 URL + 확인 날짜
- 블로그 단독 인용 시 별도 표시 `[블로그]`
