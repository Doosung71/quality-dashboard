# 코라 검수 결과서 — P2+P3+P4 재검수 (2026-06-06)

**검수일**: 2026-06-06
**검수자**: Codex CLI (코라)
**요청서**: `docs/reviews/request-2026-06-06-p2-p3-p4-rereview.md`

---

## 항목별 판정

| 항목 | 판정 | 근거 요약 |
|------|------|----------|
| RA-1 | OK | 런북에서 실 이메일·실명·실 Vercel URL 잔존 없음. `<QD_URL>`, `<TRA_URL>`, `<ADMIN_EMAIL>`, `DIRECTOR_NAME` 플레이스홀더 정상 확인. |
| RA-2 | OK | 두 인제스트 함수 모두 `findUnique` → `pending` 체크 → early return 패턴 적용 확인. TOCTOU는 PoC 수준 수용 가능. |
| RA-3 | OK | `sql.transaction([sql\`...\`, ...chunkRows.map(...)])` 배열 형식이 @neondatabase/serverless 0.10.4 API(index.d.ts 확인) 와 일치. |
| RA-4 | Medium | NCR `isOverdue()`만 문자열 직접 비교, `getDDay()`는 KST 재파싱 — 동일 날짜에 대해 비교 경로 불일치. |
| RA-5 | OK | Prisma `DateTime?` → page ISO slice(0,10) → TS `string?` → Kanban KST 재파싱 흐름 일관됨. |

---

## 상세 소견

### RA-1 — OK

런북 전체에서 관찰된 값:
- `DIRECTOR_NAME`, `<QD_URL>`, `<TRA_URL>`, `<ADMIN_EMAIL>` 플레이스홀더 정상 확인
- `director@example.com`, `staff1@example.com` 등은 시드용 더미 계정 — 민감 정보 아님
- 실제 `*.vercel.app` URL, `doosung71@gmail.com` 잔존 없음

### RA-2 — OK

`ingestApprovedAnalysis` 시작부:
```ts
const current = await prisma.analysis.findUnique({ ... select: { ingestStatus: true } })
if (current?.ingestStatus === "pending") { return }
```

`ingestFinalApprovedResult` 시작부: 동일 패턴 적용 확인. TOCTOU 창은 남지만 PoC 맥락에서 수용 가능.

### RA-3 — OK

`ingest-approved.ts` 호출부:
```ts
await sql.transaction([
  sql`DELETE FROM knowledge_chunks WHERE source_path LIKE ${likePattern}`,
  ...chunkRows.map((row) => sql`INSERT INTO knowledge_chunks ...`)
])
```

로컬 `@neondatabase/serverless` 0.10.4 `index.d.ts` line 348-349 확인 — 첫 인자는 `NeonQueryPromise[]` 또는 non-async 함수. 관찰된 호출은 awaited 없는 tagged template 결과 배열 → 0.10.4 API 일치.

### RA-4 — Medium

**문제**: NCR `isOverdue()` 함수와 `getDDay()` 함수가 서로 다른 비교 경로를 사용.

```ts
// isOverdue — 문자열 직접 비교 (KST 재파싱 없음)
function isOverdue(ncr: NCR): boolean {
  return ncr.status !== "Closed" && ncr.targetDate < getToday();
}

// getDDay — KST 재파싱 후 비교
const target = new Date(ncr.targetDate)
  .toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
const days = Math.round(
  (new Date(target).getTime() - new Date(today).getTime()) / 86_400_000
);
```

`targetDate`가 ISO 타임스탬프(`YYYY-MM-DDTHH:mm:ssZ`)인 경우 `isOverdue()`는 UTC 날짜 문자열 그대로 비교하지만, `getDDay()`는 KST 날짜로 정규화 후 비교 — KST 자정 경계에서 두 함수의 판단이 1일 어긋날 수 있음.

**권고**: `isOverdue()`를 `getDDay()` 결과 기반으로 통일하거나, KST 재파싱 패턴 동일 적용.

### RA-5 — OK

Prisma `DateTime?` → page에서 `c.targetDate?.toISOString().slice(0, 10)` → TS `targetDate?: string` → Kanban `new Date(claim.targetDate).toLocaleDateString(...)` 흐름 일관됨.

---

## 범위별 최종 판정

| 범위 | 판정 | 조건 |
|------|------|------|
| P2 (런북 보안) | **승인** | 조건 없음. 1차 지적 반영 완전. |
| P3 (인제스트 안정성) | **승인** | 조건 없음. pending guard + Neon transaction 배열 API 확인. |
| P4 (D-Day 뱃지) | **조건부 승인** | NCR `isOverdue()`를 `getDDay()` 기반 또는 KST 재파싱으로 통일 후 최종 승인. |

---

## 코라 한마디

P2와 P3는 1차 지적이 완전히 반영됐습니다. P4는 Claim 쪽은 깔끔하지만 NCR `isOverdue()`가 `getDDay()`와 비교 경로가 달라 엣지 케이스에서 KPI 수치(Overdue 건수)와 카드 뱃지 색상이 하루 불일치할 수 있습니다. 수정이 단순하니 바로 처리하는 것을 권장합니다.
