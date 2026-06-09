**검수일**: 2026-06-09  
**검수자**: Codex CLI (코라)  
**요청서**: `docs/reviews/request-2026-06-09-qpa-gantt-assets-restructure.md`

# Codex (코라) Review: QPA 공정감사 + 간트 2중 바 + 시험설비 메뉴 재구조화

## 최종 판정

보류 → **조건부 승인** (클로이 시정 완료 후)

---

## 발견 사항

### Critical

**P1. QPA 상세/목록/신규 페이지 — `auth()` 직접 호출**  
- 위치: `app/(dashboard)/vendors/qpa/[id]/page.tsx`, `page.tsx`, `new/page.tsx`  
- `auth()`는 JWT 캐시 기반으로 DB 최신 상태를 재확인하지 않음. RESTRICTED 계정이 기존 세션으로 QPA 데이터 열람·수정 가능.  
- **시정 완료**: `requireActivePageSession()` 으로 전체 교체 (2026-06-09)

**P6. `/assets/repairs` 서버 사이드 세션 체크**  
- 위치: `app/(dashboard)/assets/repairs/page.tsx`  
- `/hr` 페이지 패턴과 불일치. RESTRICTED 계정이 수선 등록 페이지 접근 가능.  
- **시정 완료**: `requireActivePageSession()` 으로 교체 (2026-06-09)

### High

없음.

### Medium

**P5. 간트 `resumeMap` — 동일 `issueId` 중복 action 로그**  
- 위치: `components/facilities/facilities-gantt.tsx:getSuspensions()`  
- `Map` 생성자에 중복 키 전달 시 마지막 값만 남아 첫 번째 재개일 유실 가능.  
- **시정 완료**: `for` 루프 + `!resumeMap.has(l.issueId)` 조건으로 첫 번째 재개일 보장 (2026-06-09)

### Low

**P7. `facilities-gantt.tsx` 547줄 단일 파일**  
- Medium 이하. 현재 구조에서 직접 결함 없음. 향후 기능 확장 시 분리 권장.  
- 이번 차수 시정 불필요.

---

## OK 항목

| 항목 | 판정 | 근거 |
|------|------|------|
| P2. QPA GET 역할 제한 | OK | PRACTITIONER 조회 허용은 협력사 담당 실무자 업무 흐름상 의도적 설계. 보안 우려 없음. |
| P3. QPA 자동 채번 연도 경계 | OK | `where: { qpaNo: { startsWith: prefix } }` 조건으로 연도별 격리. 3자리 패딩으로 999건 내 안전. |
| P4. `parseDate()` 타임존 | OK | `facilities-view.tsx`에서 `startDate`/`endDate`를 `YYYY-MM-DD` 문자열로 저장·전달 확인. 로컬 `new Date(y,m-1,d)` 방식과 일치. |

---

## 반드시 수정할 항목

1. ~~QPA 페이지 전체 `auth()` → `requireActivePageSession()` 통일~~ ✅ 완료
2. ~~`/assets/repairs` → `requireActivePageSession()` 교체~~ ✅ 완료  
3. ~~동일 `issueId` action 로그 중복 시 첫 번째 재개일 보장~~ ✅ 완료

---

## 테스트/검증 제안

- RESTRICTED 계정으로 `/vendors/qpa`, `/vendors/qpa/new`, `/vendors/qpa/[id]`, `/assets/repairs` 직접 접근 시 `/banned` 또는 `/pending`으로 리다이렉트되는지 확인
- 동일 이슈에 조치 로그 2개 이상 추가 후 간트 중단 구간 표시 정상 여부 확인

---

## 재리뷰 필요 여부

불필요. Critical 3건 모두 시정 완료. P7(Low)은 다음 스프린트 기술부채로 관리.
