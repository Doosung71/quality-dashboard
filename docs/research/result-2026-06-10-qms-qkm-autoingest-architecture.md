# QMS→QKM 자동 인제스트 아키텍처 설계

**조사일**: 2026-06-10  
**조사자**: 앤 (Antigravity CLI)  
**요청자**: Dennis / 클로이

---

## PM 검토 결과 (클로이, 2026-06-10)

### 수용
| 항목 | 근거 |
|------|------|
| NCR + 클레임 Quick Win 우선 | Low Effort + High Value, 텍스트 위주라 변환 단순 |
| Markdown 변환 전략 (Frontmatter + 헤딩 청킹) | 기존 TRA 패턴과 일관됨 |
| `after()` 훅 트리거 | TRA에서 검증된 패턴 |
| `source_path` 기반 원자적 DELETE→INSERT | 경쟁 조건 없음, 기존 코드와 동일 |
| source_type 네이밍 (`claim_closed`, `ncr_closed`) | 일관적이고 직관적 |
| 수입/출장 검사 보류 | 합불 수치는 통계 집계가 맞음 |

### 수용하지 않음
| 항목 | 이유 |
|------|------|
| `ingestStatus` DB 컬럼 추가 | Phase 1 Quick Win에 과설계. 스키마 변경 비용 대비 효익 낮음 |
| 수주 프로젝트 2단계 편입 | 현재 AwardedProject는 기본 CRUD뿐, 인제스트할 콘텐츠 빈약 |

### 보류
| 항목 | 조건 |
|------|------|
| QPA 공정감사 | Phase 2 — NCR/Claim 안정화 후 |
| 협력업체 감사 | Phase 3 |

### 구현 완료 (2026-06-10)
- `lib/ingest-qms.ts` 신규 생성 — `ingestClosedNcr()`, `ingestClosedClaim()`
- `app/api/ncr/[id]/route.ts` — status=Closed 전환 시 `after()` 훅 연결
- `app/api/claims/[id]/route.ts` — status=Closed 전환 시 `after()` 훅 연결
- `lib/knowledge.ts` — DEFAULT_SOURCE_TYPES에 `ncr_closed`, `claim_closed` 추가

---

## 1. 지식 인제스트 우선순위

품질관리 맥락에서 RAG 가치가 높은 순:

1. **NCR (부적합품)** — Root Cause + 시정조치 포함, 재발 방지에 직접 활용
2. **클레임 (Claim)** — 고객 피드백 + 해결 타임라인, 고객 대응 전략 수립
3. **QPA 공정감사** — 협력업체 세부 공정 능력 + 지적사항(Findings)
4. **수주 프로젝트** — 입찰 대비 계약 조건(ContractGap), 유사 프로젝트 레퍼런스
5. **협력업체 감사** — 업체 전반 품질 수준 평가, 정기 평가 레퍼런스
6. **입찰검토 결과서** — (기존 구현됨) 요구사항 및 Deviation 내역
7. **수입/출장 검사** — 수치 위주 합불 결과, RAG보다 통계 집계에 적합 → **보류**

---

## 2. Markdown 변환 전략

### 공통 원칙
- Frontmatter에 핵심 메타데이터 (source_type, id, status, dates)
- Enum 자연어화: `Critical` → `치명결함 (Critical)`
- JSON Array 평탄화: Timeline → 시간순 불릿 리스트
- Heading 기준 의미적 청킹 (~500토큰)

### NCR 변환 예시 템플릿

```markdown
---
source_type: ncr_closed
id: NCR-2026-001
severity: Critical
status: Closed
disposition: Rework
assignee: 홍길동
issued_date: 2026-05-10
closed_date: 2026-05-20
---

# [NCR-2026-001] 모터 베어링 소음 과다 발생 건

## 1. 개요 및 발생 상황
- **발생처**: Production Line A
- **내용**: 5월 10일 조립 라인 테스트 중 모터 베어링에서 허용치를 초과하는 소음(고주파) 발견.

## 2. 원인 분석 및 진행 이력 (Timeline)
- **2026-05-12**: (원인분석) 베어링 하우징 가공 공차 불량으로 인한 마찰음 발생 확인.
- **2026-05-15**: (시정조치) 가공 지그 재조정 및 불량 로트 전량 재작업 지시.

## 3. 처분 결과
- **최종 처분**: 재작업 (Rework)
- **결과**: 재작업 후 소음 테스트 정상 범위(40dB 이하) 합격. 종결 처리.
```

---

## 3. 트리거 시점 설계

**권장: Next.js `after()` 훅 기반 Event-driven 인제스트**

```
API Route에서 상태 전환 트랜잭션 성공
  └─ after() 백그라운드 실행 (클라이언트에 즉시 Success 응답)
       └─ ingestQmsArtifact() — Markdown 변환 → Chunking → pgvector Insert
```

**보완책**: `ingestStatus` 필드 (Pending/Success/Failed) + 야간 Cron 재시도

---

## 4. Source Type 네이밍 체계

| 산출물 | source_type |
|--------|-------------|
| 클레임 | `claim_closed` |
| NCR | `ncr_closed` |
| 입찰검토 (기존) | `tra_approved` |
| 수주 프로젝트 | `awarded_project_completed` |
| 협력업체 감사 | `supplier_audit_completed` |
| QPA 공정감사 | `qpa_audit_completed` |
| 수입/출장검사 (보류) | `inspection_completed` |

---

## 5. 중복·갱신 처리 (Upsert Strategy)

`source_path` 기준 원자적 교체:

1. 동일 `source_path` 가진 기존 청크 일괄 `DELETE`
2. 새 청크들 `INSERT`
3. 두 단계를 **단일 DB Transaction**으로 묶기

source_path 예: `ncr/NCR-2026-001`, `claim/CLM-2026-055`

---

## 6. 구현 난이도 vs 가치 매트릭스

| 산출물 | 난이도 | 가치 | 전략 |
|--------|--------|------|------|
| NCR | Low | High | **Quick Win — 즉시 구현** |
| 클레임 | Low | High | **Quick Win — 즉시 구현** |
| QPA 공정감사 | High | High | Strategic — 2단계 |
| 수주 프로젝트 | Mid-High | High | Strategic — 2단계 |
| 협력업체 감사 | Low | Mid | 여유 시 추진 |
| 수입/출장 검사 | Low | Low | **보류** |

---

## 구현 순서 권장

1. **Phase 1 (Quick Win)**: NCR + 클레임 — `after()` 훅 + Markdown 변환 + upsert
2. **Phase 2 (Strategic)**: QPA 감사 — 47항목 Findings 변환 템플릿 개발
3. **Phase 3**: 수주 프로젝트 — 하위 모델 조인 종합 리포트
4. **Phase 4**: 협력업체 감사 — 기본 텍스트 위주 변환
