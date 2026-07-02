# Codex 검수 요청 — Claims 처리이력 시스템/사용자 분리 + dedup (#63 이식)

**요청일**: 2026-07-02
**요청자**: Claude Code (PM)
**리뷰 유형**: Implementation Review
**선행 문서**: `docs/reviews/result-2026-07-01-ncr-timeline-dedup-63.md` (NCR 원본 #63, 승인 완료)

---

## 변경 개요

E2E-1 피드백 #63(안진철)으로 NCR 처리이력의 자동 로그 오염을 고칠 때 만든 로직
(`kind` 판별자로 시스템/사용자 시각 분리 + 되돌리기 net-zero dedup)을 **통일성 원칙에 따라
Claims 상세에도 이식**했다. Claims도 `단계 이동: X→Y`를 사용자 수동 메모와 같은 타임라인에
무조건 append하고 있어 동일한 오염이 존재했다.

NCR은 담당자 필드가 `user`, Claim은 `handler`로 이름이 달라, 로직 중복을 피하려고
기존 `lib/ncr-timeline.ts`를 필드명 무관 제네릭 `lib/stage-timeline.ts`로 일반화하고
새 시스템 로그 생성 부분만 호출부가 팩토리(`makeSystemEntry`)로 주입하도록 바꿨다.
이 과정에서 이미 승인·배포된 NCR 호출부도 신 헬퍼로 교체됐으므로 **NCR 회귀 여부**가
핵심 검수 포인트다.

---

## 변경된 파일

### 1. `lib/stage-timeline.ts` (신규)
- `ncr-timeline.ts`를 대체하는 공용 헬퍼. `StageTimelineItem`(`date`/`action`/`kind?`)만 정의 — 담당자 필드는 제외.
- `isSystemTimelineEntry`, `stageMoveAction`: 로직 동일(kind/action만 참조).
- `buildStageMoveTimeline<T>(prev, fromLabel, toLabel, makeSystemEntry)`: 시그니처 변경. 기존 `(prev, from, to, user, date)` → 마지막 두 인자를 팩토리 `(action) => T`로 대체. dedup 로직(직전 항목이 정확한 역방향 시스템 로그면 slice 제거) 동일.

### 2. `lib/stage-timeline.test.ts` (신규)
- 기존 NCR 11케이스 유지(팩토리 인자로 이관) + Claim(handler) 3케이스 추가 = 14 passed.

### 3. `lib/ncr-timeline.ts` / `lib/ncr-timeline.test.ts` (삭제)
- 위 신규 파일로 완전 대체.

### 4. `types/claim.ts` (수정)
- `ClaimTimelineItem`에 `kind?: "system" | "user"` 추가.

### 5. `app/(dashboard)/ncr/[id]/NCRDetailPage.tsx` (수정)
- import 경로만 `@/lib/stage-timeline`으로 교체.
- `handleMoveStatus`의 `buildStageMoveTimeline` 호출을 팩토리 형태로 변경(동작 동일, `user`/`kind:"system"` 그대로).

### 6. `app/(dashboard)/claims/[id]/ClaimDetailPage.tsx` (수정)
- `handleMoveStatus`: 단순 append → `buildStageMoveTimeline`(dedup + `kind:"system"` 시스템 로그).
- `handleAddTimelineEntry`: 수동 메모에 `kind:"user"` 부여.
- `handleDeleteTimelineEntry` 신규 + `deletingEntryIdx` state — 개별 이력 삭제(NCR과 동일).
- 타임라인 렌더: `isSystemTimelineEntry`로 회색 "시스템" 배지·italic 처리 + hover 삭제 버튼.

### 7. `scripts/verify-claim-63.mjs` (신규)
- 로컬 브라우저 골든패스 검증 스크립트. 자격증명은 gitignore된 `.env.local`(`WITNESS_VERIFY_*`) env로만 주입, 하드코딩 없음. 테스트 클레임 자동 삭제.

---

## 검수 요청 항목

### C-01. NCR 회귀 여부 (최우선)
**위치**: `app/(dashboard)/ncr/[id]/NCRDetailPage.tsx`, `lib/stage-timeline.ts`
**내용**: `buildStageMoveTimeline` 시그니처 변경 후에도 NCR 단계이동/dedup 동작이 #63 승인 시점과 동일한지. 팩토리로 넘기는 엔트리(`date`/`action`/`user`/`kind`)가 기존과 완전히 같은 형태인지.
**리스크**: 이미 배포·검증된 기능의 회귀. 단위테스트 11건 + 빌드로 방어했으나 시그니처 변경 자체가 위험원.

### C-02. dedup 판별 정확성 (Claim 라벨 기준)
**위치**: `lib/stage-timeline.ts` `buildStageMoveTimeline`
**내용**: Claim 상태 라벨(접수/조사 중/대책 수립/효과검증/종결)로 역방향 dedup이 정확히 1건만 정리하는지. 사용자가 우연히 같은 문자열을 `kind:"user"`로 메모한 경우 보존되는지.
**리스크**: 오삭제 시 감사로그 유실. (T-03 후속: 한글 라벨 문자열 비교라 라벨 변경 시 dedup 미작동 — 단 fail-safe는 오삭제가 아닌 미작동 방향. 원본 #63에서 수용된 한계.)

### C-03. 상태 전환 원자성 / timeline PUT 구조
**위치**: `ClaimDetailPage.tsx` `handleMoveStatus`, `app/api/claims/[id]/route.ts`
**내용**: timeline 전체 배열을 PUT으로 덮어쓰는 구조에서 빠른 연속 클릭·다중 탭 시 마지막 쓰기 승리로 로그 유실 가능성. (원본 #63의 T-04와 동일한 기존 아키텍처 한계 — 이번 변경이 새로 만든 회귀가 아님을 확인 요청.)
**리스크**: 동시성 하 로그 유실. 서버 append/optimistic-lock은 후속 과제.

### C-04. 삭제 인덱스 정확성
**위치**: `ClaimDetailPage.tsx` `handleDeleteTimelineEntry`, 타임라인 렌더 `originalIndex`
**내용**: `reverse()`된 렌더 순서에서 `originalIndex = length - 1 - i` 계산이 실제 삭제 대상과 일치하는지(NCR과 동일 패턴).
**리스크**: 인덱스 오계산 시 엉뚱한 이력 삭제.

### C-05. 방어적 설계 4항목
**내용**: 권한 스코프(`canEdit` 게이팅) / 서버 검증(timeline JSONB 그대로 저장 — 서버 kind 검증 없음, fail-open 허용 여부) / 삭제 가드 / DB 파싱 관점에서 문제 없는지.

---

## 빌드/테스트 상태

```
npx vitest run                → 184 passed (19 files). stage-timeline 14 포함.
npm run build                 → 통과 (에러 0).
node scripts/verify-claim-63.mjs (로컬 http://localhost:3001)
  → 🟢 전체 통과
     V1 생성 직후: 시스템 배지 0·항목 1 (초기 "클레임 접수"는 kind/접두사 없는 사용자 항목)
     V2 다음 단계: 시스템 배지 1·항목 2
     V3 되돌리기 : dedup 작동 → 배지 0·항목 1
     V4 수동 메모: 배지 그대로 0·항목 2
     (테스트 클레임 DELETE 200 정리)
```

---

## 원하는 판정

- C-01 ~ C-05 각 항목 Critical / High / Medium / Low / OK 판정
- 전체 승인 / 조건부 승인 / 보류 판정
- 특히 **C-01(NCR 회귀)**에 대해 명확한 안전 확인
