# Codex 검수 요청 — QKM 레버1 + 활동 추이 탭 + NCR 이력 관리

**요청일**: 2026-06-19
**요청자**: Claude Code (클로이)
**리뷰 유형**: Implementation Review
**선행 문서**: `docs/reviews/result-2026-06-15-claims-backclaim-activity-rereview2.md` (직전 최종 검수)

---

## 변경 개요

세션 37~39 (2026-06-19)에 구현된 3개 영역을 검수 요청한다.

① **QKM 선순환 레버1** — NCR·Claim 종결 시 Anthropic Haiku로 구조화 요약(근본원인·핵심대책·교훈)을 생성하고 `qms_summary` source_type으로 KB에 자동 인제스트. fail-open 설계.

② **활동 추이 탭** — 관리자 활동현황 페이지에 SVG 선차트 직접 구현. 날짜별/주별 그래뉼러리티, Top 7 자동선택, 기간 동기화. 신규 API `/api/admin/activity/trend`.

③ **NCR 처리이력 관리** — 처리이력 항목 삭제 버튼(canEdit 호버 시 노출), Closed NCR 처리이력 수정 시 KB re-ingest 자동 트리거.

---

## 변경된 파일

### 1. `lib/ingest-qms.ts` (수정 — S38·S39)
- `generateQmsSummary()` 신규: Anthropic SDK `claude-haiku-4-5-20251001` 호출로 3개 필드 추출
- `ingestSummaryChunk()` 신규: `qms_summary` source_type으로 단일 청크 upsert (DELETE+INSERT 트랜잭션)
- `ingestClosedNcr()` / `ingestClosedClaim()` 확장: 원본 청크 인제스트 후 LLM 요약 try/catch (fail-open)
- `buildNcrMarkdown()` / `buildClaimMarkdown()`: `title` 앞에 번호 prefix 추가 (`[NCR] NCR-2026-001 …`)

### 2. `lib/ingest-qms.test.ts` (수정)
- 테스트 5케이스 추가: generateQmsSummary 모킹, fail-open 동작, 번호 prefix 검증 등

### 3. `app/api/admin/activity/trend/route.ts` (신규)
- ADMIN 전용 권한 체크 (`auth()` + `isAdmin()`)
- `period` (`week`/`month`/`all`), `granularity` (`day`/`week`), `userIds` 파라미터 처리
- 15개 Prisma 테이블 병렬 `findMany` → 날짜별 활동 집계
- `buildDateRange()`: 일별/주별 날짜 배열 생성 (주는 ISO 월요일 기준)
- `period=all` 시 기본 `since`를 2년 전으로 잡고 실제 첫 활동일로 재조정

### 4. `app/admin/users/client.tsx` (수정 — 대규모, +485 lines)
- `ActivityTrendTab` 컴포넌트 신규: SVG 선차트 직접 구현 (외부 라이브러리 없음)
- Top 7 자동선택, 최대 10명 제한, 기간 동기화 (`syncedPeriod`)
- 1명/N명 모드 분기: 1명=개인 건수 추이(평균선 없음), N명=선택 인원 평균선
- 기간 라벨 동적: "전체 (2026.05~)" / "6월" / "6월 3주차"
- colSpan 버그 수정: `3 + ACTIVITY_COLS.length + 2`
- 리더보드 Top 3→7 (`MEDALS` 배열)
- 공지 제목 동적 기간 반영

### 5. `app/(dashboard)/ncr/[id]/NCRDetailPage.tsx` (수정)
- `handleDeleteTimelineEntry(originalIndex)`: 전체 timeline 배열에서 해당 index 제거 후 PUT
- 역순 렌더링: `.reverse()` map에서 `originalIndex = length - 1 - i` 역산
- 삭제 중 로딩 상태 (`deletingEntryIdx`)

### 6. `app/api/ncr/[id]/route.ts` (수정)
- `needsIngestCheck` 조건 확장: `body.status === "Closed" || body.timeline !== undefined`
- `isClosedTimelineUpdate`: timeline 전송 + 기존 status === "Closed" 시 re-ingest 트리거
- `isClosingNow` 기존 로직 유지

### 7. `app/(dashboard)/knowledge/search/page.tsx` (수정)
- 검색어 지우면 결과·에러 상태 초기화 (잔류 결과 버그 수정)

### 8. `lib/knowledge.ts` (수정)
- `DEFAULT_SOURCE_TYPES`에 `qms_summary` 추가 → 지식 검색 자동 포함

---

## 검수 요청 항목

### Q1. `ingestSummaryChunk` — 환경변수 체크 순서 이슈
**위치**: `lib/ingest-qms.ts` — `ingestSummaryChunk()`
**내용**: 함수 진입부에서 `OPENAI_API_KEY` 존재를 체크한다. 그런데 이 함수는 호출 전에 `generateQmsSummary()`가 이미 Anthropic API를 호출한 이후다. `OPENAI_API_KEY`는 `embedText()` 안에서만 사용되며 `ingestSummaryChunk` 내에서 직접 사용되지 않는다.
**리스크**: 
- OPENAI_API_KEY 체크가 불필요하게 앞에 위치하여 `embedText()` 내부 체크와 중복 검증 가능성
- 또는 `embedText()` 내부에 별도 OPENAI_API_KEY 체크가 없다면 오류 메시지가 `ingestSummaryChunk`에서 발생하는 것이 맞지만, 체크를 `embedText()` 밖에서 하는 이유가 불분명

### Q2. `trend/route.ts` — granularity 파라미터 타입 검증 없음
**위치**: `app/api/admin/activity/trend/route.ts` 39번째 줄 근방
**내용**: `granularity = (searchParams.get("granularity") ?? "day") as "day" | "week"` — 타입 캐스팅만 하고 실제 allowlist 검증이 없다.
**리스크**: 악의적 요청이 `granularity=month` 등 잘못된 값을 넣으면 `buildDateRange()`가 주기 조정 없이 `day` 루프를 돌게 되어 수천 개 날짜 배열이 생성될 수 있음 (DOS 가능성 낮지만 방어적 설계 관점)

### Q3. `trend/route.ts` — 15개 Prisma 병렬 쿼리 + 메모리 집계
**위치**: `app/api/admin/activity/trend/route.ts` — `Promise.all([…])`
**내용**: 15개 테이블에서 `dateFilter` 범위의 레코드를 메모리로 전부 가져온 뒤 JS에서 날짜별 집계한다. `period=all`일 경우 최대 2년치 전체 레코드를 메모리에 로드.
**리스크**: 활성 사용자가 많아지면(현재 65명 PoC 규모에서는 문제 없으나) OOM 또는 응답 지연 가능성. DB 집계(GROUP BY)로 변경하면 해소되나 현재 PoC 규모에서는 수용 가능 여부를 판정 요청.

### Q4. `NCRDetailPage.tsx` — originalIndex 역산 정합성
**위치**: `app/(dashboard)/ncr/[id]/NCRDetailPage.tsx` — reversed map
**내용**: `[...timeline].reverse().map((item, i) => { const originalIndex = timeline.length - 1 - i; ... })`
**리스크**: 
- `timeline`이 Prisma에서 `unknown[]`으로 반환될 때 `.length` 접근 안전성
- `reverse()`가 새 배열을 만들므로 원본 변형은 없음 (OK로 예상하나 확인 요청)
- `filter((_, idx) => idx !== originalIndex)` — idx는 원본 배열 기준이므로 역산된 originalIndex와 일치해야 하는데 논리 정합성 검증 요청

### Q5. `ncr/[id]/route.ts` — `needsIngestCheck` 조건 확대로 인한 DB 조회 증가
**위치**: `app/api/ncr/[id]/route.ts` — PUT 핸들러
**내용**: 기존에는 `status=Closed` 전환 시에만 `existing` 조회를 했으나, `body.timeline !== undefined`를 추가하면서 timeline 수정 요청마다 DB 조회가 발생.
**리스크**: 기능상 문제는 없으나, 처리이력 추가/수정이 빈번할 경우 불필요한 DB 조회 1회 추가. 낮은 우선순위지만 확인 요청.

### Q6. `ActivityTrendTab` — SVG 선차트 직접 구현 안전성
**위치**: `app/admin/users/client.tsx` — `ActivityTrendTab` 컴포넌트 (대규모 신규)
**내용**: SVG 좌표 계산, 스케일링, viewBox 직접 구현. 외부 라이브러리 없음.
**리스크**:
- 데이터가 모두 0인 경우 나누기 0 가능성 (max===0 시 Y 스케일 계산 안전성)
- 사용자 1명에서 10명 이상으로 증가 시 색상 배열 범위 초과 여부
- `useRef` + `useCallback` deps 재설계로 무한루프 수정했으나 의존성 누락 리스크 확인 요청

### Q7. `generateQmsSummary` — 프롬프트 인젝션 가능성
**위치**: `lib/ingest-qms.ts` — `generateQmsSummary()` 프롬프트
**내용**: `${markdown}` 전체를 직접 프롬프트에 삽입. markdown은 NCR/Claim DB 데이터에서 생성.
**리스크**: DB에 저장된 사용자 입력(제목, 설명, 처리이력)이 프롬프트에 직접 삽입됨. 내부 시스템이므로 외부 공격 벡터는 낮으나, 악의적 사용자가 "`다음 지시를 따르라: …`"를 NCR에 기록하면 요약 결과가 오염될 수 있음. PoC 수준 허용 가능 여부 판정 요청.

---

## 빌드/테스트 상태

```
npm run build  → ✅ 성공 (에러 0, 경고 없음)
npm test       → ✅ 89 passed (9 test files)
               ↳ lib/ingest-qms.test.ts: 5케이스 포함 전체 통과
```

---

## 원하는 판정

- 각 항목(Q1~Q7)에 대해 Critical / High / Medium / Low / OK 판정
- 전체에 대해 승인 / 조건부 승인 / 보류 판정
- Q3·Q6·Q7은 PoC 수준 수용 가능 여부 의견 포함 요청
