**검수일**: 2026-06-15
**검수자**: Codex CLI (코라)
**요청서**: `C:\Dev\QMS 2.0 Integration\quality-dashboard\docs\reviews\request-2026-06-15-claims-backclaim-activity-rereview2.md`

# Codex (코라) Review: claims-backclaim-activity-rereview2

## 최종 판정

조건부 승인

BC-01의 DELETE 권한 제한과 BC-05의 POST `recoveredAmount` 음수 검증은 요청대로 반영됐다. Critical/High 발견 사항은 없다. 빌드와 기존 테스트도 통과했다.

조건은 PUT 경로의 `recoveredAmount` 저장 정규화 보강이다. 현재 검증은 숫자 변환값으로 수행하지만 저장은 원본 값을 사용하므로, API 직접 호출에서 문자열 숫자가 들어오면 검증은 통과하고 Prisma 저장 단계에서 타입 오류가 날 수 있다. 운영 차단 수준은 아니므로 Medium으로 분류한다.

## 발견 사항

### Critical

없음.

### High

없음.

### Medium

1. `app/api/claims/[id]/backclaims/[bcId]/route.ts:33`
   - 내용: PUT 경로에서 `recoveredAmount`는 `const rec = Number(body.recoveredAmount)`로 검증하지만, 실제 update data에는 `body.recoveredAmount` 원본을 저장한다.
   - 근거: `app/api/claims/[id]/backclaims/[bcId]/route.ts:48`
   - 리스크: JSON 직접 호출로 `"100"` 같은 문자열 숫자가 들어오면 `Number.isFinite(rec)` 검증은 통과하지만 Prisma에는 문자열 원본이 전달될 수 있다.
   - 권고: `claimedAmount`처럼 저장 시에도 `Number(body.recoveredAmount)` 또는 사전에 정규화한 값을 사용한다.

### Low

1. `app/api/claims/[id]/backclaims/[bcId]/route.ts:21`, `app/api/claims/[id]/backclaims/route.ts:37`
   - 내용: `BC-xx` 리뷰 번호 주석이 제품 코드에 남아 있다.
   - 리스크: 기능 문제는 아니지만 시간이 지나면 리뷰 문맥이 사라져 코드 주석 품질이 낮아질 수 있다.
   - 권고: 안정화 후 도메인 이유 중심 주석으로 바꾸거나 제거한다.

## 요청 항목별 재판정

| 코드 | 재판정 | 근거 |
|---|---|---|
| BC-01 | OK | DELETE에서 `ALLOWED_DELETE_ROLES = ["TEAM_LEAD", "DIRECTOR", "ADMIN"]` 체크 후 미포함 역할은 403 반환 |
| BC-05 | OK / 단, PUT 정규화 보강 권고 | POST는 `recoveredAmount`를 `Number.isFinite` + `>= 0` 검증 후 숫자로 저장. PUT은 기존 음수 방어는 있으나 저장 정규화 보강 필요 |
| BC-02 | OK 유지 | PUT/DELETE 모두 `where: { id: bcId, claimId: id }`로 소속 검증 |
| BC-03 | OK 유지 | POST/PUT 모두 `BACK_CLAIM_STATUSES.includes()` 검증 |
| AC-01 | OK 유지 | `Number.parseInt(raw, 10)` + NaN fallback 100 + 1~500 clamp |

## 반드시 수정할 항목

없음.

조건부 승인 후 후속 보강 권고:

1. PUT `recoveredAmount` 저장 시 원본 대신 숫자 정규화 값을 사용한다.
2. 가능하면 Back-claim route 테스트를 추가해 DELETE 403, 다른 Claim의 `bcId` 404, invalid status 400, 음수 금액 400을 고정한다.

## 테스트/검증 제안

- Back-claim API 테스트:
  - PRACTITIONER DELETE → 403
  - TEAM_LEAD/DIRECTOR/ADMIN DELETE → 권한 통과 후 claimId 소속 검증
  - 다른 Claim의 `bcId` PUT/DELETE → 404
  - POST/PUT invalid status → 400
  - POST/PUT 음수 `claimedAmount` 또는 `recoveredAmount` → 400
- Activity API 테스트:
  - `?limit=abc` → 기본 100
  - `?limit=9999` → 500
  - `?limit=0` → 1

## 검증 결과

- `npm run build`: 통과
  - Compiled successfully, 86 pages
  - 기존 ESLint warning 다수 존재. 이번 검수 범위의 빌드 차단 이슈는 없음.
- `npm test`: 통과
  - 9 test files passed
  - 84 tests passed
- 코드 수정: 없음. 코라는 리뷰 결과서만 작성했다.

## 재리뷰 필요 여부

선택.

Critical/High가 없으므로 현재 범위는 조건부 승인 가능하다. PUT `recoveredAmount` 정규화와 테스트 추가까지 반영하면 짧은 확인 재리뷰로 승인 전환 가능하다.
