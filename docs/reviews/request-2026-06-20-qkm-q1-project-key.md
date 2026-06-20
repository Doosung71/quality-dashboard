# Codex 검수 요청 — QKM Q1 project_key entity-linking

**요청일**: 2026-06-20
**요청자**: Claude Code (클로이, PM)
**리뷰 유형**: Implementation Review
**선행 문서**: `docs/research/result-2026-06-20-*tender-lifecycle*` (Tender 생애주기 선순환 설계), 메모리 `project-qkm-tender-lifecycle-loop`
**대상 커밋**: `4d66203`

---

## 변경 개요

QKM "Tender 생애주기 지식 선순환"의 **개체 연결(entity-linking) 척추**를 구현했다.
입찰·NCR·클레임·교훈을 공통 식별자 `project_key`(kebab-case)로 느슨하게 연결한다.
허브 테이블 없이 단일 키로 통일하는 PoC 경량 설계(본구현 시 FK 승격 디딤돌).

**확정 설계 판단(Dennis 합의)**:
- 부여 방식: **등록 시 수동 입력 + autocomplete** (LLM 미경유 → 외부 API 전송 0)
- 적용 범위: **신규부터만** (backfill 없음)
- 저장 위치: 기존 `metadata` JSONB (전용 컬럼 미신설)
- 검증: kebab-case 정규식, 클라+서버 2중
- 실패 동작: **fail-open** (project_key는 선택 필드)

---

## 변경된 파일 (자동생성 `lib/generated/prisma/*` 제외)

### 데이터 계층
- `prisma/schema/qcost.prisma` (수정) — `Ncr`·`Claim`에 `projectKey String?` 추가
- `prisma/migrations/add_project_key.sql` (신규) — `ADD COLUMN IF NOT EXISTS` + 부분 인덱스 2개. **운영 Neon DB 적용 완료**(Dennis 직접 실행, 4 queries OK)

### 공용 유틸·API
- `lib/project-key.ts` (신규) — `isValidProjectKey` / `normalizeProjectKey` / `parseProjectKeyInput`
- `app/api/project-keys/route.ts` (신규) — autocomplete GET (DISTINCT, fail-open)

### 인제스트 전파
- `lib/ingest-qms.ts` (수정) — 종결 NCR/Claim 원본 청크·`qms_summary` 요약·`verified_lesson` metadata에 `project_key` 전파. `ingestSummaryChunk`·`loadClosedReport` 시그니처 확장

### API 라우트 (projectKey 저장 + 서버 검증)
- `app/api/ncr/route.ts`, `app/api/ncr/[id]/route.ts`
- `app/api/claims/route.ts`, `app/api/claims/[id]/route.ts`

### UI
- `components/ui/project-key-input.tsx` (신규) — datalist autocomplete + onBlur kebab 정규화 + 실시간 형식 경고
- `components/claims/claims-view.tsx`, `components/ncr/ncr-view.tsx` (등록 폼)
- `app/(dashboard)/claims/[id]/ClaimDetailPage.tsx`, `app/(dashboard)/ncr/[id]/NCRDetailPage.tsx` (상세 편집)
- `app/(dashboard)/claims/[id]/page.tsx`, `app/(dashboard)/ncr/[id]/page.tsx` (서버 매핑에 projectKey 추가)
- `types/claim.ts`, `types/ncr.ts` (타입)

---

## 검수 요청 항목

### Q1-01. 서버측 kebab 검증의 우회 가능성
**위치**: `lib/project-key.ts` `parseProjectKeyInput`, 4개 라우트
**내용**: 클라이언트 우회(직접 API 호출) 시에도 잘못된 project_key가 저장되지 않는지. POST/PUT 양쪽에서 `invalid → 400`이 일관 적용됐는지.
**리스크**: 검증이 클라에만 있으면 표기 흔들림·비정상 키가 DB·metadata로 유입 → entity-linking 정확도 훼손.

### Q1-02. PUT의 project_key 부분 갱신 vs 명시적 클리어
**위치**: `app/api/ncr/[id]/route.ts`, `app/api/claims/[id]/route.ts`
**내용**: `body.projectKey === undefined`면 미변경, `null`/빈문자열이면 키 제거(null 저장)로 의도대로 분기되는지. 기존 필드 부분 업데이트 패턴(`...projectKeyUpdate`)이 다른 필드를 건드리지 않는지.
**리스크**: undefined와 null을 혼동하면 의도치 않게 기존 키가 지워지거나, 영영 못 지우게 됨.

### Q1-03. 인제스트 metadata 전파의 누락·오염
**위치**: `lib/ingest-qms.ts` (`ingestClosedNcr`/`ingestClosedClaim`/`ingestSummaryChunk`/`ingestVerifiedLesson`)
**내용**: project_key가 있을 때만 metadata에 키가 들어가고(`...(pk ? {project_key} : {})`), 원본·요약·verified_lesson 3경로 모두 일관 전파되는지. 종결 후 키를 나중에 부여→재인제스트 시 반영되는지.
**리스크**: 일부 경로 누락 시 같은 프로젝트인데 검색에서 안 엮임. 빈 키가 `""`로 들어가면 필터 체이닝 오염.

### Q1-04. autocomplete API 인증·fail-open·정보 노출
**위치**: `app/api/project-keys/route.ts`
**내용**: `requireActiveSession()` 적용됐는지, 조회 실패 시 빈 배열 반환(폼 입력 차단 안 함), `q` 필터·DISTINCT·50개 상한이 적절한지.
**리스크**: project_key는 프로젝트/고객 식별자 → 비인증 노출 시 민감. fail-closed면 DB 장애가 등록 자체를 막음.

### Q1-05. 마스킹 백로그와의 경계 (정보성)
**위치**: 전반
**내용**: 본 PR은 마스킹을 포함하지 않음. project_key 자체가 고객·프로젝트 식별자이며, 종결 보고서 전문은 기존 `qms_summary`/`verified_lesson` 경로에서 이미 외부 LLM에 전송됨(기존 동작, 본 PR이 악화시키지 않음). 마스킹은 cross-cutting 백로그로 분리됨 — 이 분리가 타당한지만 확인.
**리스크**: project_key 도입으로 식별성이 높아졌으므로 마스킹 우선순위 상향 필요 여부 의견.

---

## 빌드/테스트 상태

```
npx vitest run                → 11 files, 116 passed
  - lib/project-key.test.ts   → 12 passed (happy/validation/정규화/fail-open/타입방어)
  - lib/ingest-qms.test.ts    → +2 passed (project_key 전파 / null 시 키 부재)
npm run build                 → 통과 (에러 0)
운영 Neon DB migration         → 4 queries executed successfully (Dennis 직접)
브라우저 골든패스 5종           → 등록·kebab 정규화·autocomplete·빈입력 fail-open·상세편집 전부 통과
```

---

## 원하는 판정

- 각 항목(Q1-01 ~ Q1-05) Critical / High / Medium / Low / OK 판정
- 전체 승인 / 조건부 승인 / 보류 판정
- 특히 Q1-02(undefined/null 분기)와 Q1-03(전파 일관성)은 회귀 위험이 있어 집중 검토 요청
