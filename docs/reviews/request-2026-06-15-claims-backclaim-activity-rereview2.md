# Codex 재검수 요청 — Back-claim + 활동현황 (2차 재검수)

**요청일**: 2026-06-15  
**요청자**: Claude Code (클로이, PM)  
**리뷰 유형**: Re-review  
**선행 문서**: `C:\Dev\QMS 2.0 Integration\quality-dashboard\docs\reviews\result-2026-06-15-claims-backclaim-activity-rereview.md`

---

## 2차 재검수 반영 현황

| 항목 | 2차 판정 | 반영 여부 | 처리 내용 |
|------|---------|-----------|----------|
| BC-01 | High | ✅ 반영 | DELETE에 `ALLOWED_DELETE_ROLES` 체크 추가 — TEAM_LEAD/DIRECTOR/ADMIN만 허용, 그 외 403 반환 |
| BC-05 | Medium (부분) | ✅ 반영 | POST 경로에 `recoveredAmount` `Number.isFinite` + `>= 0` 검증 추가, 숫자 정규화 (PUT과 정책 통일) |

---

## BC-01 설계 결정 내용

**Denis(Product Owner) 최종 결정 (2026-06-15)**:

E2E-1 단계에서 실무자도 Back-claim을 등록하므로, 등록·수정은 전원 개방을 유지한다.  
단, **삭제만 TEAM_LEAD 이상으로 제한**한다. (잘못 등록한 경우 팀장에게 요청)

E2E-2 착수 시: `BackClaim.createdById` 컬럼 추가 후 **본인(createdById) OR TEAM_LEAD+** 정책으로 업그레이드 예정.

---

## 변경된 파일

### 1. `app/api/claims/[id]/backclaims/[bcId]/route.ts` (수정)
- `ALLOWED_DELETE_ROLES = ["TEAM_LEAD", "DIRECTOR", "ADMIN"]` 상수 추가
- DELETE: `session.user.role` 확인 → 미포함 시 403 반환
- 커밋: `dbe7632`

### 2. `app/api/claims/[id]/backclaims/route.ts` (수정)
- POST: `recoveredAmount` `Number.isFinite` + `>= 0` 검증 후 `Number(rec)` 정규화 저장
- 커밋: `dbe7632`

---

## 빌드/테스트 상태

```
npm run build → ✅ 통과 (Compiled successfully, 86 pages)
npm test      → 재검수 요청자(코라)가 직접 확인 요청
```

---

## 원하는 판정

- BC-01 TEAM_LEAD+ 제한 구현 OK 확인
- BC-05 POST recoveredAmount 검증 완료 OK 확인
- 전체 조건부 승인 가능 여부
