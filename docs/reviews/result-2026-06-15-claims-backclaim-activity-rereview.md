**검수일**: 2026-06-15
**검수자**: Codex CLI (코라)
**요청서**: `C:\Dev\QMS 2.0 Integration\quality-dashboard\docs\reviews\request-2026-06-15-claims-backclaim-activity-rereview.md`

# Codex (코라) Review: claims-backclaim-activity-rereview

## 최종 판정

보류

BC-02, BC-03, AC-01은 재검수 기준 OK다. 다만 BC-01의 DELETE 권한 제한 부재는 현재 코드에 그대로 남아 있고, `CODEX_REVIEWER_START.md`의 완료 판정 기준상 High 이슈가 남아 있으면 승인하지 않는다. 또한 BC-05는 `claimedAmount` 검증은 반영됐지만 POST 생성 경로에서 `recoveredAmount` 음수 검증이 빠져 있어 부분 반영으로 본다.

## 발견 사항

### Critical

없음.

### High

1. `app/api/claims/[id]/backclaims/[bcId]/route.ts:59`
   - 항목: BC-01
   - 내용: DELETE는 활성 세션만 확인한 뒤 `deleteMany({ where: { id: bcId, claimId: id } })`를 실행한다. BC-02 소속 검증은 추가됐지만 역할 제한, 작성자 검증, 소유권 검증은 없다.
   - 리스크: E2E-1에서 모든 구성원에게 사용을 열어두는 제품 결정은 이해된다. 그러나 현재 스키마에는 `BackClaim.createdById`가 없어 “본인 OR TEAM_LEAD+” 정책을 적용할 수도 없고, 활성 사용자라면 같은 Claim에 속한 Back-claim을 삭제할 수 있다.
   - 판정: 이월 사유는 제품/운영 관점에서 수용 가능하지만, 품질 게이트 관점에서는 High 잔존이다. 조건부 승인보다는 보류가 맞다.
   - 권고: E2E-1에서 즉시 허용해야 한다면 최소한 삭제 버튼을 UI에서 숨기는 수준이 아니라 서버에 임시 완화책을 둔다. 예: DELETE만 `TEAM_LEAD`, `DIRECTOR`, `ADMIN`으로 제한하거나, E2E-1 동안 DELETE 자체를 비활성화하고 상태 변경으로 대체한다.

### Medium

1. `app/api/claims/[id]/backclaims/route.ts:56`
   - 항목: BC-05
   - 내용: POST 생성 경로는 `claimedAmount`를 `Number.isInteger`와 `> 0`으로 검증한다. 하지만 `recoveredAmount`는 `body.recoveredAmount ?? null`로 그대로 저장해 음수나 문자열 입력을 서버에서 막지 않는다.
   - 리스크: UI 정상 경로에서는 문제가 덜하지만 API 직접 호출 시 음수 회수금액 또는 DB 타입 오류가 발생할 수 있다. PUT 경로에는 `recoveredAmount >= 0` 검증이 있어 POST/PUT 검증 정책도 불일치한다.
   - 권고: POST에서도 PUT과 동일하게 `recoveredAmount !== undefined && recoveredAmount !== null`이면 `Number(...)`, `Number.isFinite`, `>= 0` 검증을 적용하고 저장값도 숫자로 정규화한다.

### Low

1. `app/api/claims/[id]/backclaims/[bcId]/route.ts:21`, `app/api/claims/[id]/backclaims/route.ts:37`
   - 내용: API 라우트에 `BC-03`, `BC-05` 같은 리뷰 항목 코드 주석이 남아 있다.
   - 리스크: 기능상 문제는 없지만 리뷰 이슈 번호가 제품 코드에 고정되어 장기 유지보수 시 맥락이 흐려질 수 있다.
   - 권고: 수정 안정화 후에는 “입력값을 DB enum/정수 범위로 정규화한다”처럼 도메인 이유 중심의 주석으로 바꾸거나 제거한다.

## 요청 항목별 재판정

| 코드 | 재판정 | 근거 |
|---|---|---|
| BC-02 | OK | PUT/DELETE 모두 `where: { id: bcId, claimId: id }` 기반 `updateMany/deleteMany`와 count 0 → 404 처리 확인 |
| BC-03 | OK | POST/PUT 모두 `BACK_CLAIM_STATUSES.includes()` 실패 시 400 반환 확인 |
| BC-05 | Medium / 부분 반영 | `claimedAmount` 검증은 OK, PUT `recoveredAmount` 음수 방어도 OK. POST `recoveredAmount` 검증 누락 |
| AC-01 | OK | `Number.parseInt(raw, 10)` + NaN fallback 100 + 1~500 clamp 확인 |
| BC-01 | High / 이월 | 이월 사유는 명확하나 현재 서버 DELETE 권한 리스크는 잔존 |

## 반드시 수정할 항목

1. BC-01: 현재 단계에서 조건부 승인을 원한다면 DELETE에 최소 서버 권한 제한을 추가한다. E2E-2의 `createdById` 정책까지 기다릴 경우, 현재 재검수 판정은 보류로 유지한다.
2. BC-05: POST 생성 경로에도 `recoveredAmount` 숫자/음수 검증을 추가한다.

## 테스트/검증 제안

- Back-claim API route 테스트 추가:
  - 다른 Claim의 `bcId`로 PUT/DELETE 시 404
  - 잘못된 `status`로 POST/PUT 시 400
  - POST/PUT의 음수 `claimedAmount`, 음수 `recoveredAmount` 시 400
  - 현재 정책을 유지한다면 DELETE 권한 정책은 명시적으로 테스트 또는 TODO 문서화
- activity detail API 테스트 추가:
  - `?limit=abc` → 기본 100
  - `?limit=9999` → 500
  - `?limit=0` → 1

## 검증 결과

- `npm run build`: 통과
  - Compiled successfully, 86 pages
  - 기존 ESLint warning 다수 존재. 이번 재검수 범위의 빌드 차단 이슈는 없음.
- `npm test`: 통과
  - 9 test files passed
  - 84 tests passed
- 코드 수정: 없음. 코라는 리뷰 결과서만 작성했다.

## 재리뷰 필요 여부

필요.

BC-01을 E2E-2로 이월한다는 제품 결정은 문서화되어 있으나, 현재 품질 게이트 기준에서는 High 잔존이다. BC-01에 임시 완화책을 넣거나 Dennis가 별도 위험수용 결정을 공식 산출물로 남긴 뒤 다시 판정하는 것을 권장한다. BC-05 POST `recoveredAmount` 검증도 함께 확인해야 한다.
