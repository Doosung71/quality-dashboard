# Antigravity Research Request — PKM 활용성 극대화 방향 조사

**요청일**: 2026-06-04  
**요청자**: Claude Code (클로이 / PM)  
**결과 저장 위치**: `docs/research/result-2026-06-04-pkm-enhancement.md`

---

## 프로젝트 배경

QMS 2.0 Integration — LS전선 품질부문 지식관리 시스템 (PoC 단계).

**PKM 현재 스택:**
- 인제스트: Python (FastAPI) + OpenAI text-embedding-3-small (1536차원)
- 저장: Neon PostgreSQL + pgvector (hnsw 인덱스)
- 청킹: 헤딩 기반 + 토큰 슬라이딩 윈도우 (800/100 overlap)
- 검색: 순수 벡터 코사인 유사도 (`search_knowledge()` SQL RPC)
- 소스: Obsidian vault (183문서 / 1,534청크) + TRA standards (127문서 / 1,020청크) = **총 2,554청크**
- 활용 접점 ①: QD `/knowledge` 탭 — 실무자가 직접 질문 → RAG 결과 + AI 답변
- 활용 접점 ②: TRA 입찰 분석 — 분석 API 호출 시 관련 지식 자동 컨텍스트 주입

**현재 한계:**
- 검색이 의미 유사도만 보므로 정확한 키워드(규격번호, 사번 등) 검색에 약함
- Obsidian 노트가 변경돼도 수동으로 재인제스트해야 반영됨
- PKM을 "검색 탭"과 "TRA 분석"에서만 쓰고, 다른 QD 화면에서는 활용 안 됨
- QMS 작업 결과(클레임 처리, NCR 조치 등)가 지식으로 환류되지 않음

---

## 조사 주제

> **"현재 PKM 파이프라인의 활용성을 극대화하기 위해 어떤 방향이 가장 효과적인가?"**

4개 후보 방향을 비교하고, 이 프로젝트에 가장 임팩트 있는 순서로 우선순위를 제시해줘.

---

## 확인할 질문

### Q1. 하이브리드 검색 (키워드 + 벡터 RRF)
- pgvector에서 **키워드(BM25/tsvector) + 벡터 코사인 유사도를 RRF(Reciprocal Rank Fusion)로 결합**하는 방식이 실제로 얼마나 정확도를 개선하는가?
- PostgreSQL 기반 BM25 대안(pg_search, ParadeDB 등)의 현재 성숙도와 Neon 호환성은?
- 현재 `search_knowledge()` SQL RPC 함수를 최소 침습적으로 확장하는 방법은?
- 구현 난이도 대비 검색 품질 향상 효과가 명확한가? 실증 벤치마크가 있다면 포함해줘.

### Q2. 자동 동기화 (Obsidian 변경 감지 → 자동 재인제스트)
- Obsidian vault 파일 변경을 감지해 **변경된 파일만 자동으로 재인제스트**하는 방법 중 가장 단순한 방법은? (file watcher vs. git hook vs. 주기 스케줄 비교)
- Vercel (서버리스) 환경에서 PKM FastAPI 서버를 호출하는 구조에서 자동화 트리거를 어디에 두는 게 현실적인가? (로컬 cron, GitHub Actions, Vercel Cron 등)
- 현재 `ingest_obsidian.py`의 `source_path` 기반 upsert(delete+insert)를 활용한 증분 인제스트는 충분히 안전한가?

### Q3. 능동적 지식 추천 (QD 화면 내 컨텍스트 서제스트)
- 클레임 상세, NCR 상세, 협력업체 상세 등 **QD 업무 화면에서 현재 보고 있는 데이터를 자동으로 PKM에 검색해 관련 지식을 사이드패널로 노출**하는 패턴 — 실제 사례(Notion AI, Obsidian Smart Connections 등)에서 UX/성능 관점 인사이트는?
- 매 페이지 전환마다 RAG 검색 API를 호출하면 Neon cold-start 문제가 생길 수 있는가? 캐싱 전략(Redis, SWR stale-while-revalidate)과 비교해줘.
- 사용자가 "추천 결과가 왜 나왔는지" 이해할 수 있도록 **설명 가능성(explainability)**을 높이는 방법은?

### Q4. 역방향 환류 (QMS 업무 결과 → Obsidian 자동 노트 생성)
- 클레임 처리 완료, NCR 종결 등 QMS 이벤트 발생 시 **Obsidian vault에 자동으로 마크다운 노트를 생성/추가**하는 방식의 실현 가능성과 아키텍처는?
- Obsidian은 로컬 파일 기반인데, 서버(Vercel/Neon)에서 로컬 vault에 파일을 쓰는 방법은? (Obsidian Sync API, Git 기반 vault, webhook 등)
- 자동 생성된 노트가 기존 vault 구조(링크, 태그, 폴더)와 통합되려면 어떤 컨벤션이 필요한가?

---

## 제약

- **DB**: Neon PostgreSQL (서버리스) — 전용 인스턴스 교체 불가
- **임베딩**: OpenAI text-embedding-3-small — 모델 교체는 전체 재인제스트 필요 (피하고 싶음)
- **PKM API**: Python FastAPI, 로컬에서 실행 (Vercel 미배포)
- **QD 프론트**: Next.js 15 App Router + Tailwind v4
- **예산**: 개인 PoC 수준, 추가 유료 서비스 도입은 가성비가 명확해야 채택
- **Obsidian**: `C:\Obsidian\Dennis-Knowledge-Vault\` 로컬 vault, 현재 git으로 관리 안 됨
- **팀 규모**: Dennis 1인 + AI 에이전트 — 운영 부담이 낮아야 함

---

## 원하는 출력

```markdown
# Research Result: PKM 활용성 극대화 방향

## 결론
<4개 방향 중 이 프로젝트에 가장 임팩트 있는 우선순위 제시 — 이유 포함>

## 추천안
<1순위 방향에 대한 구체적 구현 접근법>

## 비교표

| 방향 | 임팩트 | 구현 난이도 | 운영 부담 | 이 프로젝트 적합성 |
|------|--------|------------|---------|-----------------|
| Q1. 하이브리드 검색 | | | | |
| Q2. 자동 동기화 | | | | |
| Q3. 능동적 지식 추천 | | | | |
| Q4. 역방향 환류 | | | | |

## 근거
<각 Q별로 출처 URL + 확인 날짜 + 핵심 내용>

## 리스크
<채택 시 주의해야 할 기술·운영 리스크>

## Claude(클로이)에게 권장하는 다음 행동
<우선순위 1번부터 착수 가능한 구체적 첫 단계>
```

---

## 출처 요구

- 공식 문서 우선 (pgvector GitHub, PostgreSQL 공식, OpenAI Docs, Obsidian Docs)
- 각 항목마다 출처 URL + 확인 날짜
- 블로그 단독 인용 시 별도 표시 `[블로그]`
- 확인되지 않은 최신 버전 단정 금지
