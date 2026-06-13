# Codex 검수 결과 — 입회검사 모듈 재검수

**검수일**: 2026-06-13  
**검수자**: Codex CLI (코라)  
**대상 커밋**: `974f795` (1차 시정) → `4959287` (재검수 반영)  
**최종 판정**: ~~보류~~ → **조건부 승인** (RE-02·RE-03·빌드 시정 완료)

---

## 항목별 판정

| 항목 | 판정 | 내용 |
|------|------|------|
| RE-01 | ✅ OK | POST 역할 정책 — PRACTITIONER 등록 허용, 설계 의도 명확 |
| RE-02 | ~~High~~ → ✅ 시정 | VoC PATCH/DELETE inspectionId 대조 추가, 불일치 시 404 반환 |
| RE-03 | ~~Low~~ → ✅ 시정 | alert() → state 기반 에러 UI (vocResponseError·vocDeleteError) |
| W-03 | ✅ Low (보류 수용) | 채번 레이스 — UNIQUE 제약으로 데이터 손상 없음, PoC 조건 허용 |
| W-08 | ✅ Low (보류 수용) | 무제한 조회 — 초기 수십 건, PoC 조건 허용 |
| 빌드 | ~~Medium~~ → ✅ 통과 | npm run build 통과 확인 |

---

## 시정 내용 (4959287)

### RE-02 — VoC inspectionId 대조
`app/api/witness/[id]/voc/[vocId]/route.ts`

PATCH·DELETE 양쪽에 소속 검사 검증 추가:
```
findUnique({ where: { id: vocId }, select: { inspectionId } })
→ !existing || existing.inspectionId !== id → 404
```

### RE-03 — 에러 UI
`app/(dashboard)/witness/[id]/WitnessDetailClient.tsx`

- `vocResponseError` state: 인라인 편집 패널 내 빨간 텍스트, 취소 시 초기화
- `vocDeleteError` state: VoC 탭 목록 상단 배너 (rose-50 배경)

---

## 최종 테스트 현황

```
npx vitest run → 84 passed (9 files) ✅
npm run build  → 성공 ✅
```
