# Codex 검수 요청 — 검사 3종 AI 패널 + 지식 인제스트 훅 확장

**요청일**: 2026-06-10  
**요청자**: Claude Code (클로이, PM)  
**리뷰 유형**: Implementation Review  
**선행 문서**: `docs/reviews/result-2026-06-10_qms-ingest-ai-panel-v3.md` (v3 조건부 승인, C/H 0건)

---

## 변경 개요

v3 검수에서 승인된 NCR·클레임 AI 패널 + 자동 인제스트 패턴을 **수입검사·출장검사·협력업체 감사 3종**으로 확장했다.
기존 `AiSuggestionPanel` 컴포넌트와 `ingestChunks()` 공유 유틸을 그대로 재사용하고, 각 검사 유형에 맞는 SYSTEM_PROMPT·PROMPT_TEMPLATE·Markdown 빌더·인제스트 트리거 조건을 추가했다.
Neon DB `knowledge_chunks_source_type_check` 제약도 migration 007로 확장해 프로덕션에 적용 완료했다.

---

## 변경된 파일

### 1. `app/api/ai/suggest/route.ts` (수정)
- `VALID_TYPES`에 `incoming_inspection` / `source_inspection` / `supplier_audit` 추가 (총 5종)
- `TYPE_LABELS`, `SYSTEM_PROMPTS`, `PROMPT_TEMPLATES` 각 3개 항목 추가
  - 수입검사: `## 핵심 검사 포인트 / ## 유사 사례 참고 사항 / ## 판정 시 주의사항`
  - 출장검사: `## 현장 확인 체크포인트 / ## 유사 사례 참고 사항 / ## 판정 시 주의사항`
  - 협력업체 감사: `## 주요 확인 항목 / ## 유사 감사 사례 참고 / ## 개선 권고 방향`
- 입력 검증 로직(`VALID_TYPES.includes`) 기존 그대로 — 신규 타입도 자동 포함

### 2. `lib/ingest-qms.ts` (수정)
- `buildIncomingInspectionMarkdown()` 신규: `vendorName`, 검사일, 수량, 샘플, 불량, 판정, 검사원, 특이사항
- `buildSourceInspectionMarkdown()` 신규: 동일 + `location` 필드
- `buildSupplierAuditMarkdown()` 신규: `vendorName`, 감사일, auditType, auditor, 등급, 점수, 상태, 요약, 지적사항 루프
  - `AuditFinding.category` 사용 (v3 이전 `title` 필드를 잘못 참조하던 오류 수정)
- `ingestIncomingInspection(id)`: `item.result` 존재 시 인제스트, source_type `incoming_inspection`
- `ingestSourceInspection(id)`: 동일 패턴
- `ingestSupplierAudit(id)`: `audit.overallGrade` 또는 `audit.status === "COMPLETED"` 시 인제스트, `findings` include
- **수정**: 초기 구현에서 `vendor` relation(존재하지 않음)을 잘못 참조 → `vendorName` 직접 필드로 수정

### 3. `app/api/incoming-inspections/[id]/route.ts` (수정)
- `after` import 추가, PUT 핸들러에서 `body.result !== undefined` 조건부로 `after(() => ingestIncomingInspection(id))` 호출

### 4. `app/api/source-inspections/[id]/route.ts` (수정)
- 동일 패턴: `body.result !== undefined` 조건부 `after(() => ingestSourceInspection(id))`

### 5. `app/api/supplier-audits/[id]/route.ts` (수정)
- `body.overallGrade !== undefined || body.status === "COMPLETED"` 조건부 `after(() => ingestSupplierAudit(id))`

### 6. `components/ui/ai-suggestion-panel.tsx` (수정)
- `type` prop: `"claim" | "ncr"` → 5종 union으로 확장
- `typeLabel`: 기존 삼항 → `TYPE_LABELS` Record 맵으로 전환

### 7. `app/(dashboard)/vendors/incoming/[id]/IncomingDetailClient.tsx` (수정)
- 첨부파일 섹션 위에 `<AiSuggestionPanel type="incoming_inspection" title={insp.itemName} description={insp.notes ?? undefined} />` 추가

### 8. `app/(dashboard)/vendors/inspections/[id]/InspectionDetailClient.tsx` (수정)
- 동일: `type="source_inspection"`, `title={insp.itemName}`

### 9. `app/(dashboard)/vendors/audits/[id]/AuditDetailClient.tsx` (수정)
- `Audit` 타입에 `vendorName: string` 필드 추가
- `<AiSuggestionPanel type="supplier_audit" title={audit.vendorName} description={audit.summary ?? undefined} />`

### 10. `app/(dashboard)/vendors/audits/[id]/page.tsx` (수정)
- `AuditDetailClient`에 `vendorName: audit.vendorName` 전달

### 11. `lib/knowledge.ts` (수정)
- `DEFAULT_SOURCE_TYPES`에 `incoming_inspection` / `source_inspection` / `supplier_audit` 추가 (총 8종)

---

## 검수 요청 항목

### R1. 인제스트 트리거 조건의 과잉 호출 가능성
**위치**: `app/api/incoming-inspections/[id]/route.ts`, `app/api/source-inspections/[id]/route.ts`  
**내용**: `body.result !== undefined` 조건으로 인제스트를 트리거한다. 단순 첨부파일 PUT은 `result` 없이 전송되므로 트리거 안 됨. 그러나 판정 결과가 변경되지 않더라도(동일한 PASS 재저장) 트리거됨.  
**리스크**: 동일 source_prefix에 대해 DELETE+INSERT 반복 — 비용 낭비 가능성. 단, `ingestChunks()`가 `source_path LIKE 'incoming_inspection/{id}/%'` DELETE+INSERT 트랜잭션을 원자적으로 처리하므로 데이터 정합성 파괴는 없음. 중복 호출 방어가 필요한 수준인지 판단 요청.

### R2. SupplierAudit 인제스트 트리거 — status 문자열 대소문자
**위치**: `app/api/supplier-audits/[id]/route.ts` L43, `lib/ingest-qms.ts` L342  
**내용**: 라우트에서 `body.status === "COMPLETED"`, ingest 함수에서 `audit.status !== "COMPLETED"` 검사. Prisma enum `AuditStatus`는 `COMPLETED`(대문자). `AuditDetailClient`의 `<option value="COMPLETED">완료</option>`도 대문자.  
**리스크**: 현재 코드는 일관되게 대문자를 사용해 정합성이 있음. 그러나 API body 타입이 `Record<string, unknown>`이라 직접 enum 타입 검증이 없음 — 클라이언트가 소문자로 보내면 트리거 누락. 코라가 추가 방어 필요 여부 판단 요청.

### R3. AiSuggestionPanel 재사용 시 typeLabel 범위 누락 가능성
**위치**: `components/ui/ai-suggestion-panel.tsx` L66-72  
**내용**: `TYPE_LABELS` Record는 5개 타입을 모두 커버. TypeScript union으로 타입도 안전하게 정의됨.  
**리스크**: 향후 타입 추가 시 `PROMPT_TEMPLATES`(서버)와 `TYPE_LABELS`(클라이언트) 양쪽 동기화 필요. 현재는 정합성 일치.

### R4. `buildSupplierAuditMarkdown` — `findings.description` null 처리
**위치**: `lib/ingest-qms.ts` L281  
**내용**: `f.description ? `: ${f.description}` : ""`로 null guard 적용. Prisma 스키마에서 `AuditFinding.description`은 `String` (non-nullable)이나, `ingestSupplierAudit`의 select 타입은 `description: string | null`로 선언.  
**리스크**: 타입 선언과 실제 DB 스키마 사이의 불일치. null이 실제로 도달할 수 없어도 코드에서 nullable로 처리함. 타입 정합성 관점에서 확인 요청.

### R5. `after()` 훅 — Vercel Function timeout 경계
**위치**: `app/api/incoming-inspections/[id]/route.ts`, `app/api/source-inspections/[id]/route.ts`, `app/api/supplier-audits/[id]/route.ts`  
**내용**: `after()`는 응답 완료 후 백그라운드 실행. OpenAI embedding API 호출 + Neon DB 트랜잭션 포함. v3 검수에서 NCR/Claim 동일 패턴 OK 판정 받음.  
**리스크**: 검사 데이터가 길어도 `CHUNK_CHARS = 3000`으로 분할되어 단일 호출 크기 제한은 없음. v3에서 이미 승인된 패턴이지만, 3종 확장 후 동일 판단 재확인 요청.

---

## 빌드/테스트 상태

```
npm run build  →  ✅ 75/75 pages 성공 (타입 오류 0건)
npm test       →  ✅ 57/57 passed, 7 test files
                  (app/api/ai/suggest/route.test.ts 포함)
```

**참고**: `ai/suggest` 기존 테스트(57개)는 `"claim"` / `"ncr"` 타입 커버. 신규 3종에 대한 전용 테스트 케이스는 아직 없음. 코라가 신규 타입 테스트 추가 필요 여부 판단 요청.

---

## 원하는 판정

- R1~R5 각 항목: Critical / High / Medium / Low / OK  
- 전체: 승인 / 조건부 승인 / 보류  
- 신규 타입 테스트 케이스 추가 필요 여부 명시
