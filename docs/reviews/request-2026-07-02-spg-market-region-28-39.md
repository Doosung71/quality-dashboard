# Codex 검수 요청 — SPG(제품군)·시장 권역 필드 (입찰 #28 + 클레임 #39)

**요청일**: 2026-07-02
**요청자**: Claude Code (PM)
**리뷰 유형**: Implementation Review
**선행 문서**: 없음 (E2E-1 피드백 #28 id `cmqehc1up000004lb4n66qfml`, #39 id `cmqit5d77000104lbyig964w8`)

---

## 변경 개요

두 건의 독립 피드백을 같은 마이그레이션으로 묶어 처리했다.

- **#28** (김정문): 입찰 프로젝트 탭에 SPG(지중·해저 등 제품군)별·시장 권역별·작성자 기준 필터 요청.
- **#39** (이동수): 고객클레임 등록에 SPG 입력란이 없고, 대시보드에서도 SPG별/사업부·본부별 구분이 안 됨.

LS전선 내부 SPG 분류 기준(지중케이블·접속재·가공선·광통신 등)과 시장 권역 기준은 아직 고정되어 있지 않다는 것을 Dennis에게 직접 확인했다. 두 필드 모두 **자유입력으로 시작 → 데이터가 쌓이면 고정 목록으로 전환**하는 방식으로 Dennis가 결정했다 (섣불리 고정 enum을 만들지 않기로 함). `Tender.spg`/`Tender.marketRegion`, `Claim.spg` 3개 컬럼 모두 nullable TEXT, 기존 데이터 영향 없음.

이미 프로덕션 Neon DB에 마이그레이션을 적용한 상태다(Dennis 승인 후 실행, `prisma/migrations/add_spg_market_region.sql`). 앱 코드는 아직 배포하지 않았다 — 이번 검수 후 배포 예정.

---

## 변경된 파일

### 1. `prisma/schema/tra.prisma`, `prisma/schema/qcost.prisma` (수정)
- `Tender.spg String?`, `Tender.marketRegion String?`, `Claim.spg String?` 추가

### 2. `prisma/migrations/add_spg_market_region.sql` (신규)
- `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` — 3개 컬럼, 이미 프로덕션 DB에 적용 완료

### 3. 입찰(#28) — `app/api/tenders/route.ts`, `app/api/tenders/[id]/route.ts` (수정)
- POST: `spg`·`marketRegion` optional 문자열 저장(빈 문자열은 null로 정규화)
- PATCH: 기존 `projectKey` 부분수정 패턴과 동일하게 `spg`·`marketRegion` 개별 수정 지원

### 4. 입찰(#28) — `app/(dashboard)/dashboard/UploadForm.tsx`, `page.tsx`, `TenderList.tsx`, `TenderCard.tsx` (수정)
- 등록 폼에 SPG·시장 권역 입력(기존 등록값 `<datalist>` 추천, 강제 아님)
- 목록 필터 3종(SPG·권역·작성자) — 옵션은 **실제 등록된 값에서만 자동 구성**(하드코딩 목록 없음), 값이 하나도 없으면 필터 UI 자체를 숨김
- 카드에 SPG(인디고)·권역(스카이) 뱃지 표시

### 5. 입찰(#28) — `app/tender/[id]/SpgMarketEdit.tsx` (신규), `app/tender/[id]/page.tsx` (수정)
- 상세 페이지 인라인 편집 — 기존 `ProjectKeyEdit.tsx` 패턴 그대로 재사용(소유자만 편집, 그 외 읽기 전용 칩)

### 6. 클레임(#39) — `app/api/claims/route.ts`, `app/api/claims/[id]/route.ts` (수정)
- POST/PUT에 `spg` optional 필드 추가
- `responsibleParty`와 동일하게 취급 — knowledge 인제스트 마크다운(`lib/ingest-qms.ts`)이나 종결 클레임 재동기화 트리거(`needsIngestCheck`)에는 **포함하지 않음** (기존 `responsibleParty`도 미포함이라 동일 선례를 따름)

### 7. 클레임(#39) — `components/claims/claims-view.tsx`, `app/(dashboard)/claims/page.tsx`, `types/claim.ts` (수정)
- 등록 모달에 SPG 입력(datalist 추천)
- 칸반 목록에 SPG 필터 — 기존 `priority` 필터와 동일한 URL 쿼리 파라미터 패턴(`?spg=...`), 값이 없으면 필터 미노출

### 8. 클레임(#39) — `app/(dashboard)/claims/[id]/ClaimDetailPage.tsx`, `page.tsx` (수정)
- 상세 페이지에 SPG 표시/편집 블록 — 기존 `responsibleParty` 블록과 동일한 레이아웃·저장 흐름(단, SPG는 고정 드롭다운이 아닌 자유입력)

### 9. 검증 스크립트 (신규, 배포 대상 아님)
- `scripts/verify-tender-spg-region-28.mjs`, `scripts/verify-claim-spg-39.mjs`

---

## 검수 요청 항목

### A. 자유입력 필드의 필터 신뢰성
**위치**: `TenderList.tsx`, `claims-view.tsx`의 필터 로직 (`t.spg === spgFilter` 문자열 완전일치)
**내용**: SPG·권역이 고정 enum이 아닌 자유입력이라, 같은 의미라도 오타·띄어쓰기가 다르면 필터가 놓칠 수 있다(예: "지중케이블" vs "지중 케이블"). 의도적으로 감수한 한계인지, 그래도 최소한의 정규화(trim 외 추가 처리)가 필요한 수준인지 판단 요청.
**리스크**: 데이터 축적 단계에서는 Low로 보이나, 필터가 "일부만 걸러진다"는 인상을 줄 수 있어 UX 관점에서 재확인 필요.

### B. Claim.spg가 knowledge 인제스트·재동기화 트리거에서 제외된 설계
**위치**: `app/api/claims/[id]/route.ts`의 `needsIngestCheck` (spg는 조건에 없음)
**내용**: `responsibleParty` 선례를 따라 SPG 변경은 종결 클레임의 RAG 재인제스트를 트리거하지 않도록 했다. 이 판단이 맞는지, 아니면 SPG처럼 검색/필터에 쓰이는 필드는 인제스트 마크다운에도 반영되어야 하는지 확인 요청.
**리스크**: 현재는 knowledge_chunks에 SPG 정보가 전혀 반영되지 않아 RAG 검색으로는 SPG별 조회가 안 됨(UI 필터로만 가능) — 의도된 스코프 제한인지 재검토 필요.

### C. Tender PATCH 소유권 검증 재사용
**위치**: `app/api/tenders/[id]/route.ts` PATCH (`findFirst({ where: { id, createdById: session.user.id } })`)
**내용**: 기존 `projectKey`/`title` 수정과 동일한 소유권 검증 로직에 `spg`/`marketRegion`을 얹었다. 이 필드들은 다른 필드보다 민감도가 낮아 팀장 이상도 수정 가능해야 하는지, 아니면 소유자 전용이 맞는지(기존 정책 그대로 따름) 확인 요청.
**리스크**: 정책 자체를 바꾸지 않았으므로 회귀 리스크는 낮으나, #28 요청 취지(다른 사람이 등록한 입찰도 SPG로 분류하고 싶을 수 있음)와 충돌 여지가 있어 재검토 항목으로 표시.

---

## 빌드/테스트 상태

```
npx tsc --noEmit → 0 에러 (입찰·클레임 각 커밋 시점 모두 확인)
npx vitest run → 21 files / 194 tests passed (두 커밋 모두)
npm run build → 성공 (타입 오류 없음, 두 커밋 모두)
```

**브라우저 골든패스 검증** (로컬 dev, 같은 Neon DB 사용, 테스트 데이터는 스크립트 종료 시 자동 삭제):

```
scripts/verify-tender-spg-region-28.mjs → 9/9 통과
  (생성 시 SPG·권역 저장, 목록 뱃지 노출, 필터 선택 시 유지, 상세 표시, 인라인 편집 후 새로고침 반영, 정리)
scripts/verify-claim-spg-39.mjs → 7/7 통과
  (생성 시 SPG 저장, 상세 표시, 목록 필터 노출·동작, 인라인 편집 후 새로고침 반영, 정리)
클레임 등록 모달(폼)의 SPG 입력 → DB 직접조회로 별도 확인 완료
```

---

## 원하는 판정

- A/B/C 각 항목에 대해 Critical / High / Medium / Low / OK 판정
- 전체에 대해 승인 / 조건부 승인 / 보류 판정
