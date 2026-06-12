# Codex 검수 결과 — 세션15·16 통합 (회의록·접속현황·Vendor·ITP·NoticeModal 외)

**검수일**: 2026-06-12
**판정**: QD 조건부 승인 / TRA 보류
**요청서**: `docs/reviews/request-2026-06-12-session15-16-combined.md`

---

## 항목별 판정

| 코드 | 항목 | 판정 | 비고 |
|------|------|------|------|
| R1 | meetings POST — MeetingType enum 검증 누락 | Medium | Prisma 500 방어 위해 수정 필요 |
| R2 | my-job 전체 공개 임시 조치 | Low | E2E-1 의도적 결정, TODO 명시됨 |
| R3 | presence heartbeat — RESTRICTED 계정 허용 | Medium | requireActiveSession() 으로 교체 필요 |
| R4 | Vendor 중복 등록 방지 없음 | Medium | 동명 체크 후 409 반환 필요 |
| R5 | meetings issueLinks JSONB 검증 없음 | Low | 구조 검증 추가 권장 |
| R6 | Redis keys() O(N) 명령 | Low | PoC 규모 수용 범위 |
| R7 | TRA ITP E2E-1 권한 완화 | Low | TODO 명시, E2E-2 착수 시 복원 |
| R8 | NoticeModal 복수 핀 공지 처리 | Low | 핀 1개 정책 유지 시 실위험 없음 |
| **R9** | **TRA ITP API — tender 소유권 검증 누락** | **High** | **코라 추가 발견. 아래 상세 참조** |

---

## R9 상세 — TRA ITP tender 소유권 검증 누락 (High)

**영향 파일**:
- `app/api/tenders/[id]/itp/generate/route.ts`
- `app/api/tenders/[id]/itp/route.ts` (GET)
- `app/api/tenders/[id]/itp/export/route.ts` (GET)

**문제**: 세 라우트 모두 `prisma.itp.findUnique({ where: { tenderId } })` 또는
`prisma.tender.findFirst({ where: { id: tenderId } })`만 수행하며 로그인 사용자의
소유권을 검증하지 않음.

**위험**: 임의의 인증된 사용자가 타인의 tenderId만 알면
- 타인의 ITP를 조회·내보내기 가능
- **타인의 ITP를 덮어쓰기(generate) 가능** ← 가장 심각

**수정 방향**: `tender.createdById === session.user.id` 또는 TEAM_LEAD/DIRECTOR 역할 허용 조건 추가.
generate는 덮어쓰기이므로 특히 강하게 막아야 함.

---

## 전체 판정 요약

| 레포 | 판정 | E2E-1 계속 가능 여부 |
|------|------|---------------------|
| quality-dashboard | **조건부 승인** | 가능 (Medium 3건 수정 후) |
| tender-review-assistant | **보류** | High(R9) 수정 전까지 ITP 기능 사용 주의 |

---

## 클로이 PM 수용/보류 분류 (2026-06-12)

### 수용 → 즉시 구현

| 항목 | 파일 | 작업 |
|------|------|------|
| R1 | `app/api/meetings/route.ts` | MeetingType 유효 enum 값 검증 후 400 반환 |
| R3 | `app/api/presence/heartbeat/route.ts` | `auth()` → `requireActiveSession()` 교체 |
| R4 | `app/api/vendors/route.ts` | 동일 이름 DB 중복 체크 후 409 반환 |
| R5 | `app/api/meetings/route.ts` | issueLinks 배열 내 객체 구조(issueType/issueId/issueLabel) 검증 |
| R9(High) | TRA 3개 라우트 | tender 소유권 검증 추가 |

### 보류 → 현 상태 유지

| 항목 | 사유 |
|------|------|
| R2 | E2E-1 의도적 전체 공개. E2E-2 착수 시 복원 (TODO 명시됨) |
| R6 | PoC 65명 규모, Redis KEYS 실질 부하 없음 |
| R7 | E2E-1 한시적 완화. E2E-2 착수 시 복원 (TODO 명시됨) |
| R8 | 핀 공지 1개 정책 유지 한 상태에서 실위험 없음 |
