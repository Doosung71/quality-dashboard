# Codex 재검수 요청 — Back-claim + 활동현황 (1차 지적 반영)

**요청일**: 2026-06-15  
**요청자**: Claude Code (클로이, PM)  
**리뷰 유형**: Re-review  
**선행 문서**: `C:\Dev\QMS 2.0 Integration\quality-dashboard\docs\reviews\result-2026-06-15-claims-backclaim-activity.md`

---

## 1차 지적 반영 현황

| 항목 | 1차 판정 | 반영 여부 | 처리 내용 |
|------|---------|-----------|----------|
| BC-01 | High | ⏳ E2E-2 이월 | 아래 사유 참고 |
| BC-02 | High | ✅ 반영 | `updateMany/deleteMany({ where: { id: bcId, claimId: id } })` 교차 검증 추가 |
| BC-03 | Medium | ✅ 반영 | `BACK_CLAIM_STATUSES.includes()` 검증 → 실패 시 400 |
| BC-04 | Low | ⏳ 보류 수용 | 자유 텍스트 설계 유지 (E2E-2에서 확정) |
| BC-05 | Medium | ✅ 반영 | `Number(claimedAmount)`, `Number.isInteger`, `> 0` 검증; PUT 음수 방어 추가 |
| AC-01 | Medium | ✅ 반영 | `Number.parseInt(raw, 10)` + NaN fallback(100) + clamp(1~500) |
| AC-02 | Low | ⏳ 보류 수용 | "활동목록 ADMIN 포함·리더보드 클라이언트 제외" 현행 유지 (의도 확인됨) |

---

## BC-01 E2E-2 이월 사유

Dennis(Product Owner) 명시 결정:

> "E2E-1은 전 구성원(65명)이 자유롭게 사용해보고 피드백을 수집하는 단계다. Back-claim은 실무자도 등록한다. 권한 정책은 실제 사용 패턴을 확인한 뒤 E2E-2에서 설계해야 정확하다."

**E2E-2 착수 시 예정 작업**:
- `BackClaim` 테이블에 `createdById TEXT` 컬럼 추가 (Neon DB 마이그레이션)
- DELETE/PUT 정책: **작성자 본인(createdById) OR TEAM_LEAD 이상**으로 제한

---

## 변경된 파일

### 1. `app/api/claims/[id]/backclaims/[bcId]/route.ts` (수정)
- BC-02: `const { id, bcId } = await params` — claimId 함께 추출
- BC-02: PUT → `updateMany({ where: { id: bcId, claimId: id } })`, count === 0 시 404
- BC-02: DELETE → `deleteMany({ where: { id: bcId, claimId: id } })`, count === 0 시 404
- BC-03: status `BACK_CLAIM_STATUSES.includes()` 검증 → 400
- BC-05: claimedAmount `Number.isInteger` + `> 0`; recoveredAmount `>= 0` 검증

### 2. `app/api/claims/[id]/backclaims/route.ts` (수정)
- BC-03: status `BACK_CLAIM_STATUSES.includes()` 검증 → 400
- BC-05: `Number(claimedAmount)`, `Number.isInteger`, `> 0` 검증

### 3. `app/api/admin/activity/[userId]/route.ts` (수정)
- AC-01: `Number.parseInt(raw, 10)` + NaN fallback 100 + `Math.min(Math.max(parsed, 1), 500)`

---

## 빌드/테스트 상태

```
npm run build → ✅ 통과 (Compiled successfully, 86 pages)
npm test      → 재검수 요청자(코라)가 직접 확인 요청
```

---

## 원하는 판정

- BC-02, BC-03, BC-05, AC-01 각각 OK 판정 확인
- BC-01 이월 사유 수용 여부 의견
- 전체 조건부 승인 가능 여부
