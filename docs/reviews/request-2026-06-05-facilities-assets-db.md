# Codex 검수 요청 — 시험장·자산관리 DB 전환 및 시험 계획 고도화

**요청일**: 2026-06-05
**요청자**: Claude Code (클로이, PM)
**리뷰 유형**: Implementation Review
**선행 문서**: `docs/research/result-2026-06-05-facilities-asset-split.md` (앤 리서치 결과)

---

## 변경 개요

기존에 정적 JSON 파일(`facility.json`, `tests.json`)로만 관리되던 시험설비·시험계획 데이터를
Neon PostgreSQL DB (Prisma)로 전환하고, 등록·수정·삭제 CRUD UI 및 API를 새로 구현했다.
추가로 설비·시험계획의 관리팀·담당자 지정과 **변경 이력 추적** 기능, 설비 선택 시 **가용여부 충돌 감지** 기능을 구현했다.
변경된 커밋 범위: `9c8adbd` ~ `d359762` (7개 커밋, 47개 파일 변경).

---

## 변경된 파일 요약

### [신규] Prisma 스키마 — `prisma/schema/facilities.prisma`
- `Equipment` 모델: 설비 자산 (id는 기존 JSON ID 유지, spec/logs는 Json 컬럼)
- `TestPlan` 모델: 시험 계획 (equipmentId FK → Equipment)
- `EquipmentOwnerHistory` 모델: 설비 담당자 변경 이력 (append-only)
- `TestPlanOwnerHistory` 모델: 시험계획 담당자 변경 이력 (append-only)
- `common.prisma` User 모델에 역관계 4개 추가

### [신규] SQL 마이그레이션 3개 (직접 실행 방식)
- `manual_001_facilities.sql` — Equipment, TestPlan 테이블 생성
- `manual_002_equipment_owner.sql` — Equipment에 managingTeam·ownerId·ownerName 추가, EquipmentOwnerHistory 신규
- `manual_003_testplan_owner.sql` — TestPlan에 같은 필드 추가, TestPlanOwnerHistory 신규
- **`prisma db push` 대신 직접 SQL을 사용한 이유**: `knowledge_chunks` 테이블(PKM 19,520행)이 Prisma 스키마 외부에 존재하여 `db push` 실행 시 드롭 경고 발생 → 데이터 보호를 위해 직접 SQL 적용

### [신규] API 라우트 6개
- `app/api/assets/route.ts` — GET(목록) / POST(등록)
- `app/api/assets/[id]/route.ts` — GET / PATCH(담당자 변경 이력 자동 기록) / DELETE
- `app/api/assets/[id]/owner-history/route.ts` — GET(이력 조회)
- `app/api/test-plans/route.ts` — GET / POST
- `app/api/test-plans/[id]/route.ts` — GET / PATCH(담당자 이력) / DELETE
- 권한 체크: 쓰기는 `canWrite(role, "/facilities")` — TEAM_LEAD 이상

### [신규·수정] 컴포넌트
- `components/assets/assets-view.tsx` — KPI 4종 + 노후경보 + 사이트/카테고리 필터 + 설비 등록 모달
- `components/assets/equipment-form.tsx` — 설비 등록 폼 (시험장 선택, 규격 입력)
- `components/assets/test-plan-form.tsx` — 시험 계획 등록 폼 (설비 브라우저 연동, 관리팀·담당자)
- `components/assets/owner-modal.tsx` — 담당자 변경 탭 + 타임라인 이력 탭
- `components/facilities/equipment-browser-modal.tsx` — 설비 브라우저 (시험장·규격·가용여부 표시, 충돌 감지)
- `components/facilities/equipment-table.tsx` — 관리팀·담당자 컬럼 추가, `onOwnerClick` 콜백

### [수정] 페이지
- `app/(dashboard)/assets/page.tsx` — 서버 Prisma 쿼리로 교체
- `app/(dashboard)/facilities/page.tsx` — 서버 Prisma 쿼리로 교체, "시험장·시험 관리" 리네이밍

### [신규] 타입
- `types/asset.ts` — `Equipment`, `AssetData`, `AssetCategory`, `EquipmentOwnerHistory`
- `types/facility.ts` — `FacilitiesData`(Equipment 제거), `SiteId`에 "indon"·"external" 추가
- `types/test.ts` — `Test`에 `managingTeam`, `ownerId`, `ownerName` 추가

### [신규] 무결성 테스트 — `lib/facilities.test.ts`
- hallId/yardId 참조 무결성 (assets.json ↔ facilities.json)
- replacedBy/replaces 자기참조 무결성
- 총 9개 테스트

---

## 검수 요청 항목

### A. 권한 체크 일관성
**위치**: `app/api/assets/route.ts`, `app/api/test-plans/route.ts` 및 `[id]` 하위 라우트  
**내용**: 쓰기 API(POST/PATCH/DELETE)에 `canWrite(role, "/facilities")` 적용 여부 및 GET에는 인증(`requireActiveSession`)만 적용하는 것이 의도적인지 확인  
**리스크**: GET API에 role 기반 제한이 없으므로 PRACTITIONER도 전체 설비·시험계획 목록을 직접 API 호출로 조회 가능. 사이드바 readonlyFor 설정과의 일관성 확인 필요

### B. Prisma $transaction 안전성
**위치**: `app/api/assets/[id]/route.ts` PATCH, `app/api/test-plans/[id]/route.ts` PATCH  
**내용**: `prisma.$transaction`으로 Equipment 업데이트 + OwnerHistory 생성을 원자적으로 처리  
**리스크**: Neon 서버리스 환경에서 트랜잭션 타임아웃 또는 연결 풀 고갈 가능성. PrismaNeon 어댑터와 트랜잭션 호환성 확인

### C. Json 컬럼 타입 캐스팅
**위치**: `app/(dashboard)/assets/page.tsx`, `app/(dashboard)/facilities/page.tsx`  
**내용**: Prisma Json 타입을 `as Record<string, string>` / `as { date, note, progress }[]`로 캐스팅  
**리스크**: DB에 예상과 다른 형태의 JSON이 저장된 경우 런타임 오류 미감지. 타입 가드 또는 런타임 파싱 없이 `as` 캐스팅만 사용 중

### D. 충돌 감지 날짜 로직
**위치**: `components/facilities/equipment-browser-modal.tsx` `checkConflict()`  
**내용**: `t.plannedEnd >= plannedStart && t.plannedStart <= plannedEnd` 로직으로 날짜 겹침 판정  
**리스크**: 날짜가 문자열 "YYYY-MM-DD" 비교 → 문자열 사전순 비교로 동작하며, 동일 날짜 경계(시작일=종료일) 케이스 처리 정확성 확인 필요. plannedStart/plannedEnd 미입력 시(`""`) `checkConflict`가 null 반환(skip) — 의도적이지만 이 경우 사용자 안내가 없음

### E. SiteId 타입 확장 영향 범위
**위치**: `types/facility.ts` `SiteId = "gumi" | "indon" | "donghae" | "external"`  
**내용**: "indon", "external" 추가 후 기존 코드에서 SiteId를 switch/if로 분기하는 부분 누락 여부  
**리스크**: `computeStatus`, `facilities-utils.ts`, `MainDashboard.tsx`, `FacilitiesView` 등에서 siteId를 조건으로 사용하는 코드가 새 값을 처리 못할 경우 silent failure 가능

### F. TEST_MODE 환경에서 담당자 이력 기록
**위치**: `app/api/assets/[id]/route.ts`, `app/api/test-plans/[id]/route.ts`  
**내용**: `EquipmentOwnerHistory.changedById = session.user.id`로 실제 User.id를 기록  
**리스크**: TEST_MODE에서 세션이 모의(mock) 계정으로 동작할 경우 changedById 참조 무결성 위반 가능성 (User FK NOT NULL)

### G. knowledge_chunks 테이블 보호 방식
**위치**: `prisma/migrations/manual_001~003.sql`  
**내용**: `prisma db push` 대신 직접 SQL 실행으로 knowledge_chunks 보호  
**리스크**: Prisma 스키마와 실제 DB 구조 불일치가 누적될 경우 향후 마이그레이션 복잡도 증가. 현재 Prisma 스키마가 실제 DB 테이블을 완전히 반영하지 못하는 상태 — 허용 가능한 기술 부채인지 판단 필요

### H. 설비 삭제 시 CASCADE 동작
**위치**: `app/api/assets/[id]/route.ts` DELETE, `prisma/schema/facilities.prisma`  
**내용**: Equipment 삭제 시 TestPlan이 CASCADE DELETE됨  
**리스크**: 진행 중인 시험(status: "시험중")이 있는 설비를 삭제하면 해당 시험 계획도 삭제됨. API에 진행 중 시험 존재 여부 사전 체크 없음

### I. 설비 브라우저 모달 — 가용 판정 기준
**위치**: `components/facilities/equipment-browser-modal.tsx` `checkConflict()`  
**내용**: 상태 "시험중" + "준비중"인 TestPlan이 날짜 겹치면 충돌로 판정  
**리스크**: "완료"/"지연" 상태인 시험도 실제로는 설비를 점유 중일 수 있음. 특히 "지연" 케이스 — "지연"은 설비 실사용 가능성이 있으므로 충돌 미감지 시 실제 충돌 발생 가능

---

## 빌드/테스트 상태

```
npm run build → ✓ (오류 없음, 경고 5개: 기존과 동일한 unused-vars 수준)
npx tsc --noEmit → 오류 0개
npx vitest run → Tests 33 passed (5 suites)
Vercel deploy --prod --force → READY (d359762)
```

---

## 원하는 판정

- 각 항목(A~I)에 대해 Critical / High / Medium / Low / OK 판정
- **전체 판정**: 승인 / 조건부 승인 / 보류
- 특히 **H (CASCADE 삭제 위험)**, **D (날짜 충돌 로직)**, **B (트랜잭션 안전성)**를 중점 검토 요청
