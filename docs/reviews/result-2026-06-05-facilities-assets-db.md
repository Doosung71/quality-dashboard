**검수일**: 2026-06-05
**검수자**: Codex CLI (코라)
**요청서**: `docs/reviews/request-2026-06-05-facilities-assets-db.md`

---

# Codex 검수 결과 — 시험장·자산관리 DB 전환 및 시험계획 고도화

## 최종 판정: 보류

필수 수정 항목 5개가 해소될 때까지 프로덕션 승인 불가.

---

## 항목별 판정

| 코드 | 항목 | 판정 |
|------|------|------|
| H | 설비 삭제 → 진행 중 TestPlan CASCADE 삭제 | **Critical** |
| D/서버 | 시험 계획 등록 API 서버 측 일정 충돌 검사 없음 | **High** |
| C | Json 컬럼 `as` 캐스팅 — 런타임 파싱 없음 | Medium |
| F | TEST_MODE에서 changedById FK 위반 가능성 | Medium |
| B | Prisma $transaction + PrismaNeon 어댑터 타임아웃 | Medium |
| A | GET API role 기반 접근 제한 없음 | Low |
| E | SiteId 신규 값 switch 분기 누락 | Low |
| G | prisma db push 미사용 스키마·DB 불일치 | Low |
| I | "지연" 상태 설비 충돌 미감지 | Low |

---

## Critical — H: 설비 삭제 시 진행 중 TestPlan CASCADE 삭제

**위치**: `app/api/assets/[id]/route.ts` DELETE, `prisma/schema/facilities.prisma`  
**내용**: Equipment 삭제 시 TestPlan이 `onDelete: Cascade`로 함께 삭제됨. 진행 중(시험중/준비중) 시험 계획도 경고 없이 삭제될 수 있음.  
**수정 권고**: DELETE 전 활성 TestPlan 존재 여부를 확인하고, 존재 시 409 Conflict 반환.

## High — 서버 측 일정 충돌 검사 없음

**위치**: `app/api/test-plans/route.ts` POST  
**내용**: 클라이언트(`EquipmentBrowserModal`)에서만 충돌을 안내하고, 서버 API에는 중복 일정 검사가 없음. API를 직접 호출하면 충돌 상태에서도 등록 가능.  
**수정 권고**: POST 시 서버에서 동일 equipmentId + 날짜 겹침 + 활성 상태(준비중/시험중) 검사 후 충돌 시 409 반환.

## Medium — C: Json 컬럼 as 캐스팅

**위치**: `app/(dashboard)/assets/page.tsx`, `app/(dashboard)/facilities/page.tsx`  
**내용**: `eq.spec as Record<string, string>`, `t.logs as { ... }[]` — 런타임 유효성 검증 없음.  
**수정 권고**: zod 또는 간단한 타입 가드로 파싱 후 사용. 최소한 null/empty check 추가.

## Medium — F: TEST_MODE changedById FK

**위치**: `app/api/assets/[id]/route.ts`, `app/api/test-plans/[id]/route.ts`  
**내용**: TEST_MODE에서 session.user.id가 실제 User 테이블에 없는 계정일 경우 changedById FK 위반 발생 가능.  
**수정 권고**: TEST_MODE 환경에서 changedById를 실제 admin 계정 ID로 fallback 처리하거나 이력 기록 skip.

## Medium — B: PrismaNeon 트랜잭션

**위치**: `app/api/assets/[id]/route.ts` PATCH  
**내용**: `prisma.$transaction`과 PrismaNeon 어댑터 조합 — Neon 서버리스 연결 특성상 트랜잭션 중 타임아웃 또는 연결 끊김 가능성.  
**수정 권고**: 트랜잭션 타임아웃 옵션(`maxWait`, `timeout`) 명시 또는 Neon 공식 트랜잭션 패턴 적용 확인.

---

## 검증 기반

- `npm test`: 5 files / 33 tests — 통과
- `npm run build`: 통과
- 참고: Prisma Client API / driver adapter 및 transaction options (https://docs.prisma.io/docs/orm/reference/prisma-client-reference)
- 요청서 원본 파일은 워크스페이스에서 직접 확인되지 않아 Dennis 전달 9개 항목 요약 기준으로 검수.
