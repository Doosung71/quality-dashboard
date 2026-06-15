**검수일**: 2026-06-15
**검수자**: Codex CLI (코라)
**요청서**: `C:\Dev\QMS 2.0 Integration\quality-dashboard\docs\reviews\request-2026-06-15-claims-backclaim-activity.md`

# Codex (코라) Review: claims-backclaim-activity

## 최종 판정

보류

Back-claim 삭제 권한 체크와 `bcId`/`claimId` 교차 검증 누락은 로그인 사용자 간 데이터 무단 조작으로 이어질 수 있어 High로 판정한다. Critical은 없고 빌드와 기존 테스트는 통과했지만, High 2건이 남아 완료 승인할 수 없다.

## 발견 사항

### Critical

없음.

### High

1. `app/api/claims/[id]/backclaims/[bcId]/route.ts:35`
   - 항목: BC-01
   - 내용: DELETE가 `requireActiveSession()`만 통과하면 `prisma.backClaim.delete({ where: { id: bcId } })`를 실행한다. 역할 제한 또는 작성자/소유권 검증이 없어 PRACTITIONER를 포함한 모든 활성 사용자가 ID를 아는 Back-claim을 삭제할 수 있다.
   - 리스크: 타 사용자가 등록한 회수 청구 진행 이력이 무단 삭제될 수 있다.
   - 권고: 삭제는 최소 `TEAM_LEAD`, `DIRECTOR`, `ADMIN`으로 제한하거나, 작성자 필드가 생긴다면 작성자 또는 상위 역할만 허용한다.

2. `app/api/claims/[id]/backclaims/[bcId]/route.ts:5`
   - 항목: BC-02
   - 내용: PUT 핸들러는 route param에서 `id`를 받도록 선언했지만 실제로는 `bcId`만 사용하고, `where: { id: bcId }`로 업데이트한다. 해당 Back-claim이 URL의 Claim에 속하는지 확인하지 않는다.
   - 리스크: 다른 Claim의 Back-claim ID를 알면 `/api/claims/{임의 claimId}/backclaims/{bcId}` 경로로 수정 가능하다.
   - 권고: `const { id, bcId } = await params` 후 `updateMany({ where: { id: bcId, claimId: id }, data })` 또는 선행 `findFirst({ where: { id: bcId, claimId: id } })` 검증을 사용한다. DELETE도 동일하게 claim 소속 검증을 적용한다.

### Medium

1. `app/api/claims/[id]/backclaims/route.ts:47`, `app/api/claims/[id]/backclaims/[bcId]/route.ts:28`
   - 항목: BC-03
   - 내용: 서버가 `status`를 허용 enum과 대조하지 않고 `as never`로 Prisma에 전달한다.
   - 리스크: 잘못된 문자열 입력 시 DB enum 오류가 500으로 노출되거나, API 계약이 불명확해진다.
   - 권고: `BACK_CLAIM_STATUSES.includes(status as BackClaimStatus)` 형태의 서버 검증을 추가하고 실패 시 400을 반환한다.

2. `app/api/claims/[id]/backclaims/route.ts:35`, `app/api/claims/[id]/backclaims/[bcId]/route.ts:26`
   - 항목: BC-05
   - 내용: `claimedAmount`를 JSON number로 가정한다. 문자열 `"100"`은 JS 비교에서 통과할 수 있고, 정수성/상한/유한값 검증 없이 Prisma에 전달된다. PUT은 `claimedAmount`가 0 또는 음수여도 막지 않는다.
   - 리스크: API 클라이언트가 UI를 우회하면 DB 오류 또는 비정상 금액 저장이 가능하다.
   - 권고: `Number(...)`, `Number.isInteger`, `> 0`, 필요 시 안전 상한을 적용한다. `recoveredAmount`도 `>= 0` 및 `claimedAmount` 이하 여부를 검토한다.

3. `app/api/admin/activity/[userId]/route.ts:22`
   - 항목: AC-01
   - 내용: 현재 코드는 `Math.min(parseInt(searchParams.get("limit") ?? "100"), 500)`으로 radix 500 오류는 없지만, `?limit=abc`는 `NaN`이 되어 `items.slice(0, NaN)` 결과가 빈 배열이다.
   - 리스크: 잘못된 쿼리 하나로 활동 타임라인이 빈 값처럼 보인다.
   - 권고: `const parsed = Number.parseInt(raw, 10); const limit = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 500) : 100`처럼 fallback과 하한을 둔다.

### Low

1. `app/api/claims/[id]/route.ts:47`, `app/api/claims/route.ts:43`
   - 항목: BC-04
   - 내용: `responsibleParty`가 자유 문자열로 저장되고 길이 상한, trim, null 정규화가 없다.
   - 리스크: DB TEXT라 즉시 스키마 오류는 없고 React 텍스트 렌더링은 기본 escape되지만, 과도하게 긴 값이나 공백 값이 품질 데이터를 오염시킬 수 있다.
   - 권고: 서버에서 trim 후 빈 문자열은 null, 길이는 예: 100자 이내로 제한한다. 지정 옵션 외 커스텀 값을 허용할지는 명시적으로 결정한다.

2. `app/api/admin/activity/route.ts:111`
   - 항목: AC-02
   - 내용: API result에는 ADMIN 사용자가 포함된다. 다만 `app/admin/users/client.tsx:312`, `app/admin/users/client.tsx:375`에서 Top3 계산 시 `role !== "ADMIN"` 필터가 적용되어 리더보드 상위 노출은 클라이언트에서 제외된다.
   - 리스크: 현재 UI 리더보드에는 Low. 단, API 소비자가 바뀌면 ADMIN 제외 계약이 서버에 고정되어 있지 않다.
   - 권고: “활동현황 전체 목록에는 ADMIN 포함, 리더보드만 제외”가 의도인지 문서화하거나, API에 `excludeAdminForLeaderboard` 같은 명시적 분리를 둔다.

## 요청 항목별 판정

| 코드 | 판정 | 근거 |
|---|---|---|
| BC-01 | High | DELETE 역할/소유권 검증 없음 |
| BC-02 | High | PUT/DELETE 모두 `claimId` 소속 검증 없음 |
| BC-03 | Medium | 서버 enum 검증 없이 `as never` 캐스팅 |
| BC-04 | Low | 자유 텍스트 허용, 길이/trim 제한 없음 |
| BC-05 | Medium | 금액 타입/정수/범위 검증 부족, PUT 음수 가능 |
| AC-01 | Medium | radix 500은 현재 코드에 없지만 NaN fallback 없음 |
| AC-02 | Low | UI Top3는 ADMIN 제외, API result는 ADMIN 포함 |

## 반드시 수정할 항목

1. Back-claim DELETE에 역할 제한 또는 소유권 검증을 추가한다.
2. Back-claim PUT과 DELETE에서 `bcId`가 path의 `claimId`에 속하는지 검증한다.
3. BackClaimStatus 서버 enum 검증과 금액 number/range 검증을 추가한다.
4. activity detail API의 `limit` NaN fallback을 추가한다.

## 테스트/검증 제안

- Back-claim API 단위 테스트 또는 route-level 테스트를 추가한다.
  - PRACTITIONER가 DELETE 호출 시 403 또는 소유권 정책에 맞는 결과
  - 다른 Claim의 `bcId`로 PUT/DELETE 시 404 또는 403
  - 잘못된 `status`, 문자열/NaN/음수 `claimedAmount` 요청 시 400
- 활동현황 detail API 테스트를 추가한다.
  - `?limit=abc`는 기본 100으로 fallback
  - `?limit=9999`는 500으로 clamp
  - `?limit=0` 또는 음수는 1 이상으로 clamp

## 검증 결과

- `npm run build`: 통과
  - 타입/빌드 실패 없음
  - 기존 ESLint warning 다수 존재하나 이번 요청 범위의 신규 차단 이슈로 보지는 않음
- `npm test`: 통과
  - 9 test files, 84 tests passed
- 변경 상태 확인: 리뷰 중 코드 파일 수정 없음. 요청서와 본 결과서만 `docs/reviews/`에 미추적 파일로 존재.

## 재리뷰 필요 여부

필요.

High 2건(BC-01, BC-02) 수정 후 재리뷰를 권장한다. 이 두 항목이 해결되기 전에는 완료 승인하지 않는다.
