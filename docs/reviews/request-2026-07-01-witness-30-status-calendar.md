# Codex 검수 요청 — 입회검사 상태변경 권한·null검증·다일 캘린더 (E2E-1 #30)

**요청일**: 2026-07-01
**요청자**: Claude Code (클로이, PM)
**리뷰 유형**: Implementation Review
**선행 문서**: 없음 (E2E-1 피드백 #30 대응)

---

## 변경 개요

E2E-1 실사용 피드백 #30(김창석)의 입회검사 3개 증상을 수정했다. ①상태 변경 불가(실무자가 본인 등록 검사도 상태 변경 못 함), ②과거 일정이 예정(파랑)으로 보임(①의 부작용), ③2일 이상 일정이 캘린더 첫날에만 표시. 브라우저 골든패스에서 **권한만 고쳤을 때도 저장이 계속 실패**하는 추가 잠복 버그(PATCH가 `result=null`을 400으로 반려)를 발견해 함께 수정했다.

핵심 설계 판단(Dennis 승인): 상태 변경 권한은 **"본인이 등록한 검사 OR 팀장+"** (DELETE의 기존 소유권 패턴과 통일). 전면 개방(모든 활성 사용자) 대신 소유권 제한 채택.

---

## 변경된 파일

### 1. `app/api/witness/[id]/route.ts` (수정)
- PATCH: 기존 `WRITER_ROLES`(팀장+)만 허용 → **`findUnique`로 소유권 조회 후 `isOwner || isWriter` 허용**. 대상 없으면 404.
- PATCH 검증 완화: `result`·`region`은 nullable 필드이므로 `null`/`""`(비움)을 허용하고, **값이 있을 때만** 화이트리스트 검증. (기존엔 `null !== ""` 통과 → `includes(null)=false` → 400으로 오반려)

### 2. `app/api/witness/route.ts` (수정)
- GET 목록: 기존 `inspectionDate`가 해당 월에 속한 건만 조회 → **"해당 월과 기간이 겹치는" 모든 검사**로 확장. 겹침 조건 = `시작일 < 다음 달 AND (종료일 ?? 시작일) >= 이 달 시작`. 월 경계를 넘는 다일 일정 포함 목적.

### 3. `components/witness/witness-calendar.tsx` (수정)
- `getDayItems()`: 기존 `inspectionDate` 하루만 매칭 → **`시작일~종료일` 구간 전체**에 매칭. `endDate` 없으면 시작일만. `endDate < 시작일`(비정상 데이터) 방어 포함.

### 4. `app/api/witness/route.test.ts` (수정)
- PATCH 소유권 케이스 재구성(실무자 본인 200 / 타인 403 / 404), null result·region 200, 팀장 전권 200, GET 월경계 겹침 쿼리 형태 검증. (총 witness 18케이스)

### 5. `scripts/verify-witness-30.mjs` (신규)
- Playwright 검증 스크립트. 로그인 → 2일 테스트검사 생성(API) → 캘린더 2셀 표시 확인(③) → 상태 COMPLETED 저장·DB 반영 확인(①) → 테스트검사 삭제(라이브 DB 오염 방지). *운영 코드 아님, 참고용.*

---

## 검수 요청 항목

### WI30-01. PATCH 소유권 권한 모델 (High)
**위치**: `app/api/witness/[id]/route.ts` PATCH
**내용**: `const isOwner = existing.createdById === session.user.id; const isWriter = WRITER_ROLES.includes(role); if (!isOwner && !isWriter) 403`. 대상 없으면 404 선반환. 실무자가 **타인** 등록 검사를 수정 못 하는지(fail-closed), 소유권 조회 누락 경로가 없는지 확인.
**리스크**: 권한 완화 방향 변경이므로, 의도치 않게 타 사용자 검사 수정이 열리면 데이터 무결성 훼손.

### WI30-02. result·region null 검증 완화 (Medium)
**위치**: `app/api/witness/[id]/route.ts` (`body.result != null && body.result !== "" && !VALID_RESULT.includes(...)`)
**내용**: 느슨한 `!= null`로 null·undefined를 건너뛰고, 빈 문자열도 허용. 값이 있을 때만 화이트리스트 검증. 할당부는 `body.result || null`. 잘못된 문자열(예: `"WRONG"`)은 여전히 400인지, null 우회로 비유효값이 저장될 여지가 없는지 확인.
**리스크**: 검증 완화가 과도하면 비유효 enum이 DB에 저장될 수 있음. status는 완화하지 않았는데(여전히 엄격) 일관성 판단도 부탁.

### WI30-03. GET 월경계 겹침 쿼리 정확성 (Medium)
**위치**: `app/api/witness/route.ts` GET where절
**내용**: `AND[{ inspectionDate: { lt: nextMonth } }, { OR: [{ endDate: { gte: monthStart } }, { endDate: null, inspectionDate: { gte: monthStart } }] }]`. 경계값(월 1일 00:00, 다음 달 1일 00:00)·타임존(서버 UTC vs 저장값)·endDate null 처리가 정확한지, 누락/중복 반환 케이스가 없는지 확인.
**리스크**: 경계 계산 오류 시 특정 검사가 목록에서 누락되거나 인접 월에 중복 노출.

### WI30-04. 캘린더 다일 렌더링 (Low)
**위치**: `components/witness/witness-calendar.tsx` `getDayItems()`
**내용**: `setHours(0,0,0,0)` 로컬 자정 정규화 후 `cellT >= startT && cellT <= endT`, `endT = Math.max(end, start)`. 기존 `getDate()` 방식과 타임존 일관성이 유지되는지, 월 경계에서 시작/종료 셀 표시가 맞는지 확인.
**리스크**: 타임존 불일치 시 하루 어긋난 셀에 표시.

---

## 빌드/테스트 상태

```
npx vitest run                 → 152 passed (17 files) — witness 18케이스 포함
npm run build                  → Compiled successfully, 91/91 pages, 에러 0
node scripts/verify-witness-30.mjs (localhost:3001, 실 Neon DB)
                               → 🟢 전체 통과 (①상태 DB반영 COMPLETED, ③캘린더 2셀, 테스트데이터 삭제)
```

DB migration·신규 env 없음 (권한 로직 + 렌더링 변경만).

---

## 원하는 판정

- 각 항목(WI30-01~04)에 대해 Critical / High / Medium / Low / OK 판정
- 전체에 대해 승인 / 조건부 승인 / 보류 판정
- 특히 **WI30-01(권한 완화)**·**WI30-02(검증 완화)**는 방어적 설계 관점에서 fail-closed 여부를 중점 확인 요청
