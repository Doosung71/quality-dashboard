# Antigravity Research Request — 시험장·시험 현황 / 자산관리 화면 분리 설계

**요청일**: 2026-06-05  
**요청자**: Claude Code (클로이, PM)  
**결과 저장 위치**: `docs/research/result-2026-06-05-facilities-asset-split.md`

---

## 프로젝트 배경

**프로젝트**: quality-dashboard — LS전선 품질부문장 통합 대시보드 PoC  
**기술 스택**: Next.js 15 (App Router) + TypeScript + Tailwind v4 + Prisma + Neon(PostgreSQL) + Vercel  
**배포 URL**: https://quality-dashboard-flax.vercel.app  
**D-day**: 2026년 9월 품질전략기능회의 (CEO + 임원진 시연)

현재 좌측 사이드바에 **"시험장·시험 현황"** 메뉴(`/facilities`) 하나에 아래 세 가지 정보가 혼합되어 있다.

| 섹션 | 내용 |
|------|------|
| 시험장 카드 (좌) | TestHall/TestYard별 상태, 설비 수량, 노후 설비 경보 |
| 설비 테이블 (우) | Equipment 전체 목록 — 형식·제조사·연도·상태·교체 이력 |
| 인증시험 간트 (하) | 2026년 시험 일정 — Test 제품명·진행률·설비 연계 |

Dennis(품질부문장)가 이 화면이 너무 복잡하다는 피드백을 주었다.  
**목표**: 사이드바를 2개 메뉴로 분리하여 각 화면의 목적을 명확하게 한다.

---

## 분리 방향 (Dennis 의도 요약)

| 메뉴 | 경로 (안) | 핵심 목적 |
|------|----------|----------|
| **자산관리** | `/assets` | 시험설비·계측설비 등 **장비 자산** 전체를 일괄 관리 (목록·상태·노후도·교체 이력) |
| **시험장·시험 현황** | `/facilities` | 시험장 **공간(TestHall/TestYard)** + 현재 시험 중인 **Test 제품** 연계 현황 |

---

## 현재 데이터 모델

```typescript
// types/facility.ts
interface Equipment {
  id, name, type, spec,
  hallId?, yardId?,   // 어느 시험장에 설치됐는지
  siteId, maker, makerCountry, yearIntroduced, quantity,
  status: "new" | "normal" | "aging" | "planned",
  replacedBy, replaces, notes
}
interface TestHall { id, siteId, name, type, purpose, status, dimensions }
interface TestYard  { id, siteId, name, type, purpose, status, dimensions }

// types/test.ts
interface Test {
  id, equipmentId,   // 어느 설비로 시험하는지
  testCategory: 'Type' | 'EQ' | 'PQ' | '양산' | '개발',
  projectName, sampleType, sampleDescription,
  plannedStart, plannedEnd, actualStart, actualEnd,
  status, progress, logs
}
```

데이터는 현재 **JSON mock 파일** 기반. Neon DB 전환 여부는 미결정.

---

## 조사 주제

현재의 단일 화면을 "자산관리"와 "시험장·시험 현황" 두 화면으로 분리할 때 최적의 UX 구조, 데이터 모델 확장 방향, 구현 전략을 조사한다.

---

## 확인할 질문

### Q1. 자산관리 화면 — 최적 UX/정보 구조
- 시험설비와 계측설비를 같은 화면에서 **탭** 또는 **필터**로 구분하는 것이 나은가, 아니면 **하위 카테고리 메뉴**로 분리하는 것이 나은가?
- 제조업 시험소에서 실제로 쓰이는 자산관리 화면 UX 벤치마크 사례(산업기기 포털, IEC 인증기관 대시보드 등) 있으면 참고 제시
- 노후도 경보(status: "aging")를 상단 KPI 카드로 강조할 때 권장 지표는 무엇인가? (노후 설비 수, 교체 예정 설비 수, 평균 사용 연수 등)
- 교체 이력(`replacedBy`, `replaces`) 시각화 — 트리·타임라인 중 어느 방식이 적합한가?

### Q2. 자산관리 — 데이터 모델 확장 필요 여부
- 현재 Equipment에 **자산 카테고리 필드** (예: `category: "시험설비" | "계측설비" | "보조설비"`)가 없다. 이 필드를 추가해야 하는가, 아니면 기존 `type` 문자열 기반으로 파생 분류가 가능한가?
- 자산 고유번호, 취득일, 감가상각/잔존가치, 점검 주기 같은 필드가 CEO 시연 수준에서 필요한가? (과도한 확장 vs 필요 최소한 기준으로 판단)
- JSON mock → Neon DB 전환을 자산관리 구현 시 같이 하는 것이 바람직한가, 아니면 분리해서 나중에 하는 것이 낫는가?

### Q3. 시험장·시험 현황 화면 — Test 제품 연계 UX
- 시험장 카드에서 **현재 시험 중인 제품**을 어떻게 표시하는 것이 가장 직관적인가?  
  (예: 시험장 카드 내 인라인 리스트, 드로어(슬라이드 패널), 별도 섹션)
- 시험 일정 간트 차트를 그대로 유지하되 **제품 중심(Test 행) vs 설비 중심(Equipment 행)** 중 어느 기준으로 재구성하는 것이 부문장/팀장에게 더 유용한가?
- Test의 `projectName` + `sampleDescription` 조합 외에, 시험장 화면에서 추가로 보여줘야 할 정보는 무엇인가? (담당자 배정, 고객사 등 — 현재 타입에 없는 필드 제안 포함)

### Q4. 사이드바 메뉴 구조 변경 방안
- 현재 사이드바에서 "시험장·시험 현황" 위치를 유지하면서 **"자산관리"를 어느 위치에 추가**하는 것이 자연스러운가?
  - 현재 순서: 대시보드 → 품질비용(Q-Cost) → 공급망관리 → 지식저장소(QKM) → **시험장·시험 현황** → 입찰검토시스템 → 외부 정보 → 인사·면담 → 게시판 → 피드백
- 자산관리에 어울리는 Lucide 아이콘 추천 (현재 시험장은 `FlaskConical` 사용)

### Q5. 기존 화면 데이터 분리 전략
- 현재 단일 `FacilityData`(sites/testHalls/testYards/equipment)와 `TestsData`(tests)를 두 화면으로 분리할 때:
  - 각 화면이 독립적으로 데이터를 fetch 해야 하는가, 아니면 공통 store/context로 공유하는가?
  - JSON mock을 그대로 쓸 경우 파일을 분리(`assets-data.json` / `facilities-data.json`)하는 것이 나은가, 아니면 하나의 파일에서 각 화면이 필요한 slice만 import 하는가?

---

## 제약

- **기술 스택 고정**: Next.js 15 App Router + Tailwind v4. 새 UI 라이브러리 설치는 최소화.
- **기존 컴포넌트 재사용 우선**: `EquipmentTable`, `HallStatusBadge`, `TypeChip` 등 기존 컴포넌트를 최대한 활용.
- **JSON mock 유지 가능**: DB 전환은 이 작업과 분리 가능. Claude(클로이)가 결정.
- **모바일 대응 필요**: 이미 모바일 카드 뷰가 `EquipmentTable`에 구현되어 있음 (`block md:hidden`).
- **권한 체계 유지**: PRACTITIONER(실무자) / TEAM_LEAD(팀장) / DIRECTOR(임원). 자산관리는 쓰기 권한을 팀장 이상으로 설정 예정.
- **CEO 시연 수준**: 데이터가 mock이라도 UI는 프로덕션 수준으로 완성도 있게.

---

## 원하는 출력

```markdown
# Research Result: 시험장·시험 현황 / 자산관리 화면 분리 설계

## 결론
(한 단락 요약)

## 추천안
### 자산관리 화면 구조
### 시험장·시험 현황 화면 구조
### 사이드바 메뉴 구조

## 비교표
(UX 구조 옵션별 장단점)

## 데이터 모델 변경 권고
(추가·수정 필드 목록 및 우선순위)

## 근거
(출처 URL + 확인 날짜)

## 리스크
(구현 시 주의사항)

## Claude(클로이)에게 권장하는 다음 행동
(우선 구현 순서, 컴포넌트 분리 전략 포함)
```

---

## 출처 요구

- 공식 문서 우선 (Next.js, Tailwind, Lucide 등)
- UX 벤치마크는 실제 산업용 자산관리/CMMS 제품 사례 우선 (IBM Maximo, Fiix, UpKeep 등)
- 블로그 단독 인용 시 별도 표시
- 각 항목마다 출처 URL + 확인 날짜 명시
