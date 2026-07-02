# Codex 검수 요청 — 지식/규격 현황 재설계: 칩 필터 통일 + 데드코드 제거 (E2E-1 #52 후속)

**요청일**: 2026-07-02
**요청자**: Claude Code (PM)
**리뷰 유형**: Implementation Review
**선행 문서**: 커밋 `5369a2e` (세션53 #52 1차 수정)

---

## 변경 개요

E2E-1 #52(임일혁 부장: "상하 스크롤 4개") 후속 재설계다. 조사 중 **세션53의 1차 수정(`5369a2e`)이 실제로는 프로덕션에서 렌더되지 않는 편집 모드(!readOnly) 분기만 고쳤음**을 발견했다 — `KnowledgeRepository`의 유일한 사용처(지식/규격 현황)가 `readOnly` 고정이었고, 등록 기능은 `/knowledge` 페이지가 자체 구현으로 따로 가진다. 이번 변경은 실제 화면을 고친다.

**설계 판단 (Dennis 승인 완료)**:
- 목록 레이아웃: **A안 — 칩 필터 통일.** 좌측 트리 패널 제거, 기존 모바일 칩 패턴(대분류+소분류, 건수 표시)을 전 뷰포트 공통화. 목록은 페이지 스크롤에 흐름 → 목록 화면 내부 스크롤 3→0(페이지 스크롤만)
- 데드코드: **A안 — 삭제.** !readOnly 분기(등록·수정·삭제 폼, 상세 패널 등 ~890줄) 제거. git 히스토리로 복원 가능
- 상세 페이지: 내용 보기 박스의 `max-h-[400px] overflow-y-auto` 제거(중첩 스크롤 해소), ⤢ 크게보기 모달 유지
- 실패 시 동작: 변경 없음 (현황 페이지의 정적 JSON 폴백 유지)
- 외부 API 전송 데이터 범위: 변경 없음. API·DB 무변경, UI 전용
- 상태 전환 원자성: 해당 없음 (읽기 전용 화면)

임일혁 부장 후속 의견("검색 결과는 별도 화면으로")은 현행 상세 페이지 이동 방식 유지로 반영. #52 답글로 재설계 진행 중임을 안내 완료(replyId `cmr2vw7hz…`).

---

## 변경된 파일

### 1. `components/knowledge/knowledge-repository.tsx` (수정 — 977줄 → 265줄)
- !readOnly 분기 전체 삭제: 신규 등록 폼, 인라인 수정 폼, 삭제, 상세 패널, 내용 보기/모달, FORM_CONFIG, uploadFile, mobileView 상태 등
- 좌측 트리 패널 삭제 → 대분류/소분류 칩 필터(건수 포함)로 통일 (모바일 `overflow-x-auto` 스크롤, md+ `flex-wrap`)
- 목록: 고정 높이 그리드(`lg:h-[calc(100vh-300px)]`) 제거 → 카드 그리드(1/2/3열)가 페이지 스크롤에 흐름
- 검색 Enter → 첫 결과 `onCardClick`(상세 페이지 이동)으로 동작 유지
- props: `readOnly` 제거 → `{ data, repoLoading, onCardClick }`
- KPI 4카드·필터/정렬 로직(연도 내림차순, 검색 시 제목·코드 우선)은 무변경 유지

### 2. `app/(dashboard)/knowledge/status/page.tsx` (수정 — 1줄)
- `readOnly` prop 제거 (인터페이스 변경 동기화)

### 3. `app/(dashboard)/knowledge/status/[id]/page.tsx` (수정 — 1줄)
- 내용 보기 박스 `max-h-[400px] overflow-y-auto` 제거 — 상세 페이지 중첩 스크롤 해소 (#52 본질)

### 4. `scripts/verify-knowledge-52.mjs` (신규)
- Playwright 검증 7항목: 트리 부재·칩 필터·목록 내부 스크롤 0·검색 무결과·Enter 이동·(프로덕션에서) 내용 확장 후 내부 스크롤 0·크게보기 모달
- 읽기 전용(데이터 생성 없음), 자격증명 env 주입만

---

## 검수 요청 항목

### KR-01. 삭제된 편집 모드 기능의 대체 존재 확인
**위치**: `components/knowledge/knowledge-repository.tsx` diff, `app/(dashboard)/knowledge/page.tsx`
**내용**: 삭제한 등록·수정·삭제·내용보기 기능이 다른 경로(`/knowledge` 등록 페이지, `/knowledge/status/[id]` 상세)에서 전부 제공되는지, 이 컴포넌트를 참조하는 다른 사용처가 정말 없는지
**리스크**: 실사용 기능이 함께 삭제되면 E2E-1 사용자 기능 회귀

### KR-02. 필터·정렬·검색 동작 보존
**위치**: `knowledge-repository.tsx` `filteredAssets`
**내용**: 재작성 과정에서 필터(대/소분류)·정렬(연도 내림차순, 검색 시 정확 매칭 우선)·검색 대상 필드(제목·코드·발행처·키워드·요약)가 기존과 동일한지
**리스크**: 1,082건 실데이터에서 검색 결과가 달라지면 사용자 혼란

### KR-03. 칩 레이아웃 반응형 회귀
**위치**: `knowledge-repository.tsx` 칩 필터 영역
**내용**: 모바일(overflow-x-auto)·데스크탑(flex-wrap) 겸용 클래스 조합이 두 뷰포트 모두에서 깨지지 않는지, 소분류 칩이 대분류 미선택 시 숨겨지는 동작
**리스크**: 특정 뷰포트에서 칩이 잘리거나 겹침

### KR-04. 상세 페이지 max-h 제거의 부작용
**위치**: `app/(dashboard)/knowledge/status/[id]/page.tsx`
**내용**: 장문 문서(수백 KB 마크다운)에서 내용 박스가 페이지 스크롤로 흐를 때 성능·레이아웃 문제 여부, ⤢ 모달 동작 유지
**리스크**: 대용량 규격 문서에서 렌더 지연 또는 액션 버튼 접근성 저하

### KR-05. 검증 스크립트 안전성
**위치**: `scripts/verify-knowledge-52.mjs`
**내용**: 자격증명 하드코딩 없음, 쓰기 작업 없음(읽기 전용), 로컬에서 V6/V7이 스킵되는 사유(`DATABASE_URL_UNPOOLED` 로컬 미설정)가 프로덕션 검증으로 보완되는 계획의 타당성
**리스크**: 검증 공백

---

## 빌드/테스트 상태

```
npx tsc --noEmit → 0 에러
npm test → 20 files, 191 passed
npm run build → 통과
node scripts/verify-knowledge-52.mjs (localhost:3001) → 7/7 통과
  V1 트리 제거 ✅ / V2 칩 필터 ✅ / V3 목록 내부 스크롤 0 ✅ / V4 무결과 빈상태 ✅ / V5 Enter→상세 ✅
  V6/V7(내용 보기)은 로컬 DB env 제약으로 스킵 → 배포 후 프로덕션에서 읽기 전용 검증 예정
```

---

## 원하는 판정

- 각 항목에 대해 Critical / High / Medium / Low / OK 판정
- 전체에 대해 승인 / 조건부 승인 / 보류 판정
