# Codex (코라) Review: NCR 처리이력 자동 로그 오염 수정 (#63)

**검수일**: 2026-07-01
**검수자**: Codex CLI (코라)
**요청서**: `quality-dashboard/docs/reviews/request-2026-07-01-ncr-timeline-dedup-63.md`
**대상 영역**: `quality-dashboard` NCR 상세 타임라인 dedup / 시스템 로그 분리
**검수 방식**: 정적 코드 리뷰 + targeted unit test + TypeScript 검증

## 최종 판정

승인

Critical/High 발견 사항은 없습니다. #63의 핵심 목표인 "시스템 자동 단계 이동 로그와 사용자 수동 메모의 분리" 및 "직전 역방향 이동 net-zero dedup"은 구현과 테스트가 요청 의도에 맞게 정렬되어 있습니다.

브라우저 골든패스는 직접 실행하지 않았습니다. 다만 순수 함수 단위 테스트와 타입 검증은 독립 실행으로 통과했습니다.

## 검수 범위

- `lib/ncr-timeline.ts`
- `lib/ncr-timeline.test.ts`
- `types/ncr.ts`
- `app/(dashboard)/ncr/[id]/NCRDetailPage.tsx`
- `app/api/ncr/route.ts`
- `app/api/ncr/[id]/route.ts`
- `lib/ingest-qms.ts` 중 NCR closed ingest 경로

읽지 않은/누락된 지침:

- `MULTI_AGENT_KNOWLEDGE_OPS.md`: 루트에서 파일을 찾을 수 없어 검토하지 못했습니다.
- `.env`, `.env.local`, `.env.*`: 프로젝트 보안 지침에 따라 읽지 않았습니다.

## 검증 증거

- `git status --short --untracked-files=all`: 출력 없음
- `npx vitest run lib/ncr-timeline.test.ts`: 1 file / 11 tests passed
- `npx tsc --noEmit`: exit code 0
- `npm run build`: 직접 실행하지 않음. 요청서에는 성공 증거가 기재되어 있으나, 리뷰 중에는 산출물 갱신을 피하기 위해 재실행하지 않았습니다.

## 항목별 판정

### T-01. dedup 규칙의 정확성

판정: OK

`buildStageMoveTimeline()`은 직전 항목만 검사하고, 그 항목이 시스템 항목이며 action이 현재 이동의 정확한 역방향 문자열일 때만 제거합니다. 정상 전진/비역방향 이동은 추가되고, 다단계 왕복도 stack처럼 마지막 이동부터 순차 정리됩니다.

테스트도 happy path, 정확한 역방향 제거, 비역방향 추가, 순차 왕복, 불변성을 커버합니다.

### T-02. `kind` 판별 우선순위

판정: OK

`isSystemTimelineEntry()`는 `kind: "system"` / `kind: "user"`를 action 접두사보다 먼저 판단합니다. 따라서 사용자가 직접 `단계 이동:`으로 시작하는 메모를 남겨도 `kind: "user"`이면 dedup 대상에서 제외됩니다.

레거시 데이터는 `kind`가 없을 때만 `단계 이동:` 접두사 폴백을 사용하므로 기존 데이터 호환성과 사용자 메모 보호가 모두 충족됩니다.

### T-03. 라벨 문자열 기반 비교의 견고성

판정: Low

현재 방식은 `STATUS_LABELS`에서 생성한 `단계 이동: {from} → {to}` 문자열끼리 비교하므로 현재 라벨 세트에서는 정확히 동작합니다. 라벨이 변경되면 과거 로그와의 dedup이 실패할 수 있지만, 이 경우는 로그를 잘못 삭제하지 않고 새 로그를 추가하는 fail-safe 방향입니다.

개선 권고: 후속 정리 시 timeline 항목에 `fromStatus`, `toStatus` 같은 상태 코드 메타데이터를 선택 필드로 추가하면 라벨 변경/중복 라벨에도 dedup이 견고해집니다. 이번 #63 승인 조건은 아닙니다.

### T-04. 클라이언트 dedup / 동시성

판정: Medium

`NCRDetailPage.handleMoveStatus()`가 현재 클라이언트 상태의 `ncr.timeline`으로 전체 timeline 배열을 구성해 PUT하고, `app/api/ncr/[id]/route.ts`도 timeline 전체 교체를 수행합니다. 빠른 연속 클릭이나 서로 다른 브라우저 탭에서 상태/타임라인을 동시에 갱신하면 마지막 쓰기 승리로 일부 로그가 유실될 수 있습니다.

다만 이는 이번 변경으로 새로 생긴 중복 생성 회귀라기보다 기존 "클라이언트가 전체 배열을 구성해 PUT"하는 구조의 한계입니다. #63의 dedup 로직 자체는 이 구조 안에서 더 나쁜 중복을 만들지 않습니다.

개선 권고: 후속 과제로 서버 측 append/dedup endpoint 또는 optimistic lock(`updatedAt`/version 조건)을 검토하십시오. 이번 #63 완료를 막는 High 이슈로 보지는 않습니다.

### T-05. 기존 타임라인 CRUD / 종결 재인제스트

판정: OK

수동 메모 추가는 `kind: "user"`를 붙여 기존 흐름을 유지하고, reverse 렌더링에서 계산한 `originalIndex`로 삭제하는 방식도 기존 인덱스 의미를 보존합니다.

종결 전환 시 `handleMoveStatus()`가 `status`, `closedDate`, `timeline`을 함께 보내고, 서버는 `isClosingNow` 또는 Closed 상태의 timeline/projectKey 변경 시 `ingestClosedNcr(id)`를 `after()`로 호출합니다. `buildNcrMarkdown()`은 timeline의 추가 `kind` 필드를 무시하고 기존 `date/user/action`만 사용하므로 재인제스트 포맷 회귀도 발견되지 않았습니다.

## 발견 사항

### Critical

없음.

### High

없음.

### Medium

1. `NCRDetailPage.handleMoveStatus()` / `app/api/ncr/[id]/route.ts`: timeline 전체 배열 PUT 구조는 빠른 연속 클릭 또는 다중 탭 편집 시 마지막 쓰기 승리로 로그 유실이 가능합니다. 기존 구조의 한계이며 #63 범위에서는 수용 가능하지만, 규제 대응 감사 로그의 장기 신뢰성을 위해 서버 측 append/dedup 또는 optimistic lock을 후속 검토하는 것이 좋습니다.

### Low

1. `lib/ncr-timeline.ts`: dedup 비교가 라벨 문자열 기반입니다. 현재는 fail-safe로 동작하지만, 라벨 변경/중복 라벨에 더 견고하게 만들려면 상태 코드 메타데이터(`fromStatus`, `toStatus`)를 선택 필드로 보강하는 것이 좋습니다.

## 반드시 수정할 항목

없음.

## 테스트/검증 제안

- 배포 전 브라우저 골든패스에서 NCR 상세 화면의 실제 표시를 확인하십시오: 단계 이동 → 시스템 배지 표시, 수동 메모 추가 → 배지 없음, 다음→이전 왕복 → 직전 시스템 로그 정리.
- 후속 동시성 개선 시에는 두 탭에서 timeline 수정이 교차될 때 로그 유실을 감지하는 API 또는 E2E 테스트를 추가하십시오.
- 라벨 변경 가능성이 커지면 `kind` 외에 상태 코드 메타데이터를 추가하고, 레거시 문자열 dedup은 fallback으로 남기는 마이그레이션 없는 전환이 적합합니다.

## 재리뷰 필요 여부

필수 재리뷰는 필요하지 않습니다.

다만 T-04 동시성 구조를 서버 측 append/dedup 또는 optimistic lock으로 바꾸는 후속 작업을 진행하면 별도 재리뷰를 권장합니다.
