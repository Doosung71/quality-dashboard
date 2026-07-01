# Codex 검수 요청 — NCR 처리이력 자동 로그 오염 수정 (#63)

**요청일**: 2026-07-01
**요청자**: Claude Code (PM)
**리뷰 유형**: Implementation Review
**선행 문서**: E2E-1 피드백 triage #63 (안진철 부장 — NCR 조치이력)

---

## 변경 개요

E2E-1 실사용 피드백 #63: NCR 상세의 "처리 이력(타임라인)"에서 단계 이동 버튼을
누를 때마다 `단계 이동: X → Y` 감사 로그가 사용자 수동 메모와 **같은 목록에 뒤섞여**
쌓이고, 특히 다음→이전→다음 왕복 시 쓰레기 로그가 무한정 누적된다는 신고.

단계 이동 감사 로그는 QMS 규제 대응상 가치가 있어 **완전 제거하지 않고**, 두 가지로 해결:
1. **시각적 분리** — 시스템 자동 기록과 사용자 수동 메모를 판별자(`kind`)로 구분해 표시
2. **되돌리기 dedup** — 직전 이동의 정확한 역방향 이동이면 왕복 로그를 정리(net-zero)

핵심 dedup·분류 로직은 순수 함수(`lib/ncr-timeline.ts`)로 추출해 단위 테스트로 커버.

---

## 변경된 파일

### 1. `lib/ncr-timeline.ts` (신규)
- `isSystemTimelineEntry()` — 시스템 자동 기록 여부 판별. 명시적 `kind` 우선, 없으면(레거시) action 접두사(`단계 이동:`)로 폴백
- `stageMoveAction()` — `단계 이동: {from} → {to}` 문자열 생성
- `buildStageMoveTimeline()` — 단계 이동 시 새 타임라인 생성. 직전 항목이 정확한 역방향 시스템 로그면 그 항목 제거, 아니면 시스템 로그 1건 추가. 순수 함수

### 2. `lib/ncr-timeline.test.ts` (신규)
- 11개 케이스: 분류(kind 우선순위·레거시 폴백), dedup(happy·역방향 제거·비역방향 추가·사용자 메모 가드·레거시 dedup·순차 왕복·불변성)

### 3. `types/ncr.ts` (수정)
- `NCRTimelineItem`에 `kind?: "system" | "user"` 추가 (JSONB 저장 — 마이그레이션 불필요)

### 4. `app/(dashboard)/ncr/[id]/NCRDetailPage.tsx` (수정)
- `handleMoveStatus`: 인라인 append → `buildStageMoveTimeline()` 호출로 교체 (dedup 적용)
- `handleAddTimelineEntry`: 수동 메모에 `kind: "user"` 태그
- 타임라인 렌더: `isSystemTimelineEntry(item)`으로 시스템 항목을 회색 배지("시스템")·이탤릭·연한 점으로 시각 분리

### 5. `app/api/ncr/route.ts` (수정)
- POST 생성 시 시드 항목("부적합 발행 (Issued)")에 `kind: "system"` 태그

---

## 검수 요청 항목

### T-01. dedup 규칙의 정확성 (되돌리기 net-zero)
**위치**: `lib/ncr-timeline.ts` `buildStageMoveTimeline`
**내용**: 직전 항목이 지금 이동의 정확한 역방향(`toLabel → fromLabel`)일 때만 제거하고,
그 외에는 추가하는지. 다단계 왕복을 역순으로 되짚으면 순차 정리되는지.
**리스크**: 오판 시 (a) 정상 전진 로그를 삭제하거나 (b) 왕복 쓰레기가 남음. 데이터 무결성 직결.

### T-02. `kind` 판별 우선순위 (사용자 메모 보호)
**위치**: `lib/ncr-timeline.ts` `isSystemTimelineEntry`
**내용**: 사용자가 직접 `단계 이동:`으로 시작하는 텍스트를 입력해도(`kind: "user"`)
시스템으로 오분류되지 않는지. 레거시(kind 없음)만 접두사 폴백을 타는지.
**리스크**: 오분류 시 사용자 메모가 dedup 대상이 되어 삭제되거나 시각적으로 왜곡됨.

### T-03. 라벨 문자열 기반 비교의 견고성
**위치**: `buildStageMoveTimeline` (action 문자열 == 역방향 문자열 비교)
**내용**: `STATUS_LABELS`(한글 라벨) 기반으로 action 문자열을 생성·비교하는 방식이
라벨 변경·중복 라벨에 취약하지 않은지. 상태 코드(enum) 기반 비교가 더 안전한지 의견.
**리스크**: 라벨이 바뀌면 과거 로그와 비교 실패로 dedup 미작동(단, 데이터 손상은 아님 — fail-safe).

### T-04. 클라이언트 dedup의 적정성 / 동시성
**위치**: `NCRDetailPage.handleMoveStatus` → 서버 PUT `app/api/ncr/[id]/route.ts`
**내용**: 타임라인 전체 배열을 클라이언트가 구성해 PUT하는 기존 아키텍처를 유지했음.
빠른 연속 클릭(직전 PUT 미완 상태)에서 stale `ncr.timeline`로 마지막-쓰기-승리 가능성.
**리스크**: 동시성 하에서 로그 유실 가능(중복 아님). 기존 패턴 그대로이며 회귀는 아님 — 수용 가능 여부 판단 요청.

### T-05. 회귀 — 기존 타임라인 CRUD·종결 재인제스트
**위치**: `handleAddTimelineEntry`, `handleDeleteTimelineEntry`, 종결 시 `ingestClosedNcr`
**내용**: 수동 추가/삭제(originalIndex 기반)와 Closed 전환 시 knowledge_chunks 재인제스트
훅이 이번 변경으로 깨지지 않았는지.
**리스크**: 인덱스 계산·재인제스트 조건 회귀 시 지식 선순환 루프 손상.

---

## 빌드/테스트 상태

```
npx vitest run           → 181 passed (19 files) — 신규 lib/ncr-timeline.test.ts 11건 포함
npx tsc --noEmit         → 에러 0 (클린)
npm run build            → 성공 (모든 라우트 컴파일 완료)
```

브라우저 골든패스 검증은 코라 검수 승인 후 진행 예정 (라이브 DB 오염 방지 — 임시 NCR 생성·삭제 방식 검토 중).

---

## 참고 — Claims 동일 패턴 (이번 검수 범위 아님)

`app/(dashboard)/claims/[id]/ClaimDetailPage.tsx`도 동일하게 `단계 이동: X → Y`를
같은 타임라인에 자동 기록함. 통일성 원칙상 후속으로 동일 수정 예정이나,
#63은 NCR 건이므로 이번 검수는 **NCR만** 대상.

---

## 원하는 판정

- 각 항목(T-01~T-05)에 대해 Critical / High / Medium / Low / OK 판정
- 전체에 대해 승인 / 조건부 승인 / 보류 판정
- 특히 T-03(라벨 vs enum 비교)에 대한 개선 권고 여부
