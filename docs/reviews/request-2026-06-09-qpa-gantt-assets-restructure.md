# Codex 검수 요청 — QPA 공정감사 + 간트 2중 바 + 시험설비 메뉴 재구조화

**요청일**: 2026-06-09  
**요청자**: Claude Code (클로이)  
**리뷰 유형**: Implementation Review  
**선행 문서**: `docs/reviews/result-2026-06-09-e2e1-feedback-corrections-rereview.md` (이전 최종 조건부 승인)

---

## 변경 개요

E2E-1 피드백 반영 및 품질 프로세스 고도화 작업의 일환으로 세 가지 독립적인 기능 블록이 추가되었다.

1. **QPA 공정감사 시스템**: LSC QPA 1.0 기준 47항목·5분류·138점 체크리스트 전체 구현. 레이더차트·등급·PASS/FAIL 자동 판정, 협력사 드로어 연동.
2. **간트 2중 바 + 이슈 중단·재개 날짜**: `TestLog`에 `issueDate/suspendedFrom/resumedFrom` 추가. 간트에 원래 계획(얇은 바) / 조정 타임라인(메인 바) / 중단 구간(주황 해칭) 이중 표현.
3. **시험설비/계측기 관리 재구조화**: 설비 관련 메뉴를 독립 최상위 섹션으로 분리하고, 설비 등록(`/assets/new`)·수선(`/assets/repairs`) 전용 페이지를 신설.

---

## 변경된 파일

### QPA 공정감사 시스템 (신규)

- `app/(dashboard)/vendors/qpa/page.tsx` (신규) — QPA 감사 목록
- `app/(dashboard)/vendors/qpa/new/page.tsx` + `QpaNewForm.tsx` (신규) — 신규 감사 등록 폼
- `app/(dashboard)/vendors/qpa/[id]/page.tsx` (신규) — 감사 상세 서버 컴포넌트
- `app/(dashboard)/vendors/qpa/[id]/QpaDetailClient.tsx` (신규) — 요약·체크리스트·개선대책 3탭 클라이언트
- `app/api/qpa-audits/route.ts` (신규) — 목록 GET + 신규 등록 POST
- `app/api/qpa-audits/[id]/route.ts` (신규) — 상세 GET + 수정 PATCH
- `app/api/qpa-audits/[id]/items/[itemNo]/route.ts` (신규) — 체크리스트 항목 PATCH
- `app/api/qpa-audits/[id]/findings/route.ts` + `[findingId]/route.ts` (신규) — 개선대책 CRUD
- `app/api/vendors/[vendorId]/qpa-summary/route.ts` (신규) — 협력사 드로어용 QPA 이력 요약
- `components/vendors/vendors-view.tsx` (수정) — 협력사 드로어 "공정 현황" 탭에 QPA 연동

### 간트 2중 바 + 이슈 중단·재개 (신규/수정)

- `components/facilities/facilities-gantt.tsx` (신규 547줄) — 간트 차트 컴포넌트 전체
- `components/facilities/facilities-view.tsx` (대폭 수정 587→증가) — 이슈 등록·조치 완료 UI, 중단일·재개일 입력 포함
- `app/api/test-plans/[id]/route.ts` (수정) — `addLog` 분기: suspendedFrom·resumedFrom 처리, 상태 자동 전환
- `types/test.ts` (수정) — `TestLog` 타입에 `issueId·suspendedFrom·resumedFrom·issueDate` 추가
- `components/facilities/facilities-overview.tsx` (신규) — 시험장 현황 오버뷰 카드

### 시험설비/계측기 관리 재구조화 (신규/수정)

- `components/layout/sidebar.tsx` (수정) — 시험설비 메뉴 독립 최상위 섹션으로 분리
- `app/(dashboard)/assets/page.tsx` (수정) — 목록 페이지 (컬럼 간소화)
- `app/(dashboard)/assets/new/page.tsx` (신규) — 설비 등록 전용 페이지
- `app/(dashboard)/assets/repairs/page.tsx` (신규) — 설비 수선 전용 페이지
- `components/assets/repair-register-page.tsx` (신규 255줄) — 수선 등록 페이지형 폼

---

## 검수 요청 항목

### P1. QPA 상세 페이지 인증 일관성

**위치**: `app/(dashboard)/vendors/qpa/[id]/page.tsx:9`  
**내용**: `auth()`를 직접 호출하고 있다. 다른 보호 페이지는 `requireActiveSession()` (session-guard)을 사용하여 RESTRICTED 계정 자동 차단·만료 처리를 포함한다. QPA 상세 페이지만 `auth()`로 처리하여 RESTRICTED 사용자가 접근 가능할 수 있다.  
**리스크**: 정지된 계정이 QPA 상세를 열람·수정할 수 있는 보안 허점. `requireActivePageSession()` 패턴과 불일치.

---

### P2. QPA API GET — 역할 제한 부재

**위치**: `app/api/qpa-audits/route.ts:17-28`  
**내용**: `GET /api/qpa-audits`는 `requireActiveSession()`만 통과하면 PRACTITIONER 포함 전 역할이 QPA 감사 전체 목록을 조회할 수 있다. POST는 TEAM_LEAD 이상 체크가 있지만 GET에는 없다.  
**리스크**: 설계 의도(쓰기: TEAM_LEAD 이상, 조회: 전 역할)가 의도적이라면 OK. 하지만 협력사 감사 데이터가 PRACTITIONER에게 완전히 노출되는 것이 적절한지 확인 필요.

---

### P3. QPA 자동 채번 — 순서 정렬 방식

**위치**: `app/api/qpa-audits/route.ts:9-14`  
**내용**: `findFirst({ orderBy: { qpaNo: "desc" } })`로 마지막 번호를 추출한다. 현재 3자리 패딩(`padStart(3, "0")`)이므로 999개까지는 안전하지만, 연도 경계(12월 → 1월)에서 이전 연도의 QPA-2025-999가 QPA-2026-001보다 사전순 뒤에 위치할 수 있다.  
**리스크**: 연도 경계 채번 충돌 가능성. `where: { qpaNo: { startsWith: prefix } }` 조건이 있어 연도별 분리는 되나 확인 필요.

---

### P4. 간트 `parseDate()` 타임존 처리

**위치**: `components/facilities/facilities-gantt.tsx:38-41`  
**내용**: `parseDate("2026-06-09")`는 `new Date(y, m-1, d)` 로컬 시간 기준으로 생성한다. 서버에서 ISO 8601 문자열(`2026-06-09T00:00:00.000Z`)이 오는 경우 `.toISOString().slice(0,10)`이나 `.split("T")[0]` 전처리 없이 그대로 전달하면 UTC+9(KST) 환경에서 하루 어긋날 수 있다.  
**리스크**: 간트 바 위치가 실제 시험 일정과 하루 밀릴 수 있음. `facilities-view.tsx`에서 TestPlan을 API로 받아 `startDate`/`endDate` 문자열을 어떻게 전달하는지 확인 필요.

---

### P5. 이슈·조치 로그 쌍 매칭 로직

**위치**: `components/facilities/facilities-gantt.tsx:64-76`  
**내용**: `resumeMap`은 `logType === "action" && issueId && resumedFrom`인 로그에서 `issueId → resumedFrom` 맵을 만든다. 하나의 이슈에 여러 조치 로그가 있을 경우 `Map`에는 마지막 것만 남는다.  
**리스크**: 동일 `issueId`로 조치 로그가 2개 이상 존재하면 첫 번째 재개일이 유실됨. 현재 UI 흐름에서 중복 발생 가능성이 낮더라도 경계 조건 확인 필요.

---

### P6. `/assets/repairs` 서버 사이드 세션 체크 방식

**위치**: `app/(dashboard)/assets/repairs/page.tsx:11`  
**내용**: `auth()`를 직접 사용하고 있다. `/hr` 페이지가 이전 코라 검수에서 `requireActivePageSession()` 미사용으로 Critical 지적을 받아 수정된 패턴과 불일치.  
**리스크**: RESTRICTED 계정이 수선 등록 페이지에 접근 가능. 패턴 통일 필요 여부 판단 요청.

---

### P7. `facilities-gantt.tsx` 컴포넌트 크기 및 분리

**위치**: `components/facilities/facilities-gantt.tsx` (547줄)  
**내용**: 날짜 유틸, 서스펜션 계산, 렌더링이 단일 파일에 집중. 직접 버그나 결함은 아니나 유지보수성 관점에서 확인 요청.  
**리스크**: Medium. 현재 코라 검수 기준(`취향보다 결함 우선`)으로 심각도 판단 위임.

---

## 빌드/테스트 상태

빌드 미실행. 이유: 프로덕션 Vercel 배포(`fe7dbdf`)가 성공적으로 완료된 상태이며 `npm run build`는 Vercel CI에서 통과되었음. 로컬 빌드 환경(Node.js v25.6.0 + sharp 비호환)에서 경고가 발생하는 기존 이슈가 있어 별도 실행하지 않았음.

테스트: vitest 유닛 테스트는 이 변경에서 추가되지 않았음. QPA·간트는 시각적 기능으로 자동 테스트 범위 외.

---

## 원하는 판정

- 각 항목(P1~P7)에 대해 Critical / High / Medium / Low / OK 판정
- QPA API 권한 정책(P2)은 의도적 설계 결정 포함 여부 코멘트 요청
- 전체에 대해 승인 / 조건부 승인 / 보류 판정
