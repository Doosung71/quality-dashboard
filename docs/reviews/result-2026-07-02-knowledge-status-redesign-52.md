# Codex (코라) Review: 지식/규격 현황 재설계 #52

**검수일**: 2026-07-02
**검수자**: Codex CLI (코라)
**요청서**: `C:\Dev\QMS 2.0 Integration\quality-dashboard\docs\reviews\request-2026-07-02-knowledge-status-redesign-52.md`

## 최종 판정

조건부 승인

제품 코드 기준 Critical/High 발견 사항은 없습니다. `KnowledgeRepository`의 읽기 전용 현황 화면 재설계는 요청 의도(좌측 트리 제거, 칩 필터 통일, 목록 내부 스크롤 제거, 상세 내용 박스 중첩 스크롤 제거)에 부합합니다.

조건은 `scripts/verify-knowledge-52.mjs`의 V6/V7 검증 스킵 결과를 별도 프로덕션 검증 증거로 보완하는 것입니다. 현재 스크립트는 스킵을 실패로 보지 않아 "전체 통과"처럼 해석될 수 있습니다.

## 발견 사항

### Critical

없음.

### High

없음.

### Medium

1. `scripts/verify-knowledge-52.mjs:95`
   - 이슈: V6/V7(상세 내용 확장 후 내부 스크롤 0, 크게 보기 모달) 검증이 `sourcePath` 문서 부재 또는 로컬 DB 제약으로 스킵되어도 실패로 집계되지 않습니다.
   - 리스크: #52의 핵심 중 하나인 상세 페이지 중첩 스크롤 제거가 실제 데이터 환경에서 검증되지 않았는데도 최종 출력이 통과처럼 보일 수 있습니다.
   - 권고: 배포 환경에서 V6/V7 실행 결과를 별도 증거로 남기거나, 필수 검증 모드에서는 스킵을 non-zero exit로 처리하는 옵션을 추가하십시오.

### Low

1. `app/(dashboard)/knowledge/status/[id]/page.tsx:227`
   - 이슈: 내용 박스의 `max-h` 제거로 장문 문서는 의도대로 페이지 스크롤에 흐르지만, 수백 KB 문서에서는 페이지 길이가 크게 늘어납니다.
   - 리스크: 런타임 오류는 아니지만, 긴 문서 정독 중 상단 액션 버튼으로 돌아가는 UX가 불편할 수 있습니다.
   - 권고: 이번 변경은 #52 요구에 맞으므로 승인 가능하되, 실제 장문 규격 문서에서 성능/스크롤 체감을 프로덕션에서 확인하십시오.

## OK 판정 항목

- KR-01 삭제된 편집 모드 기능 대체: OK
  - `KnowledgeRepository` 사용처는 `app/(dashboard)/knowledge/status/page.tsx` 한 곳으로 확인했습니다.
  - 등록/수정/삭제 기능은 `app/(dashboard)/knowledge/page.tsx`에 별도 구현되어 있고, `/api/internal-standards` POST/PATCH/DELETE 경로를 유지합니다.
  - 현황 상세/내용 보기 기능은 `app/(dashboard)/knowledge/status/[id]/page.tsx`에서 유지됩니다.

- KR-02 필터/정렬/검색 동작 보존: OK
  - `components/knowledge/knowledge-repository.tsx:61`의 필터 대상은 제목, 코드, 발행처, 키워드, 요약으로 기존과 동일합니다.
  - 검색어가 없을 때 연도 내림차순, 검색어가 있을 때 제목/코드 매칭 우선 정렬도 기존 로직과 동일합니다.

- KR-03 칩 레이아웃 반응형: OK
  - 대분류 칩은 모바일 `overflow-x-auto`, 데스크탑 `md:flex-wrap md:overflow-visible` 조합입니다.
  - 소분류 칩은 `selectedCategory !== "ALL"`일 때만 렌더링되어 대분류 미선택 시 숨김 동작이 명확합니다.

- KR-04 상세 페이지 max-h 제거: OK with watch
  - `max-h-[400px] overflow-y-auto` 제거는 요청한 중첩 스크롤 해소와 일치합니다.
  - 크게 보기 모달의 `overflow-y-auto`는 모달 내부 정독 용도로 유지되어 있습니다.

- KR-05 검증 스크립트 안전성: OK with condition
  - 스크립트 내 하드코딩된 자격증명은 없습니다. `WITNESS_VERIFY_EMAIL/PASSWORD` 환경변수를 사용합니다.
  - 검증 스크립트는 `/api/knowledge/assets` 조회와 화면 조작 중심이며 데이터 생성/수정 API 호출은 없습니다.
  - 단, V6/V7 스킵을 성공처럼 집계하는 검증 공백은 위 Medium 항목으로 남깁니다.

## 실행한 검증

```text
npx tsc --noEmit
→ 통과

npm test
→ 20 files, 191 passed

npm run build
→ 통과
→ 기존 lint warning 다수 출력. 이번 변경 파일에서 새 빌드 실패는 없음.
```

빌드 중 확인된 기존 lint warning 중 `app/(dashboard)/knowledge/page.tsx:6`의 미사용 `ChevronDown`은 이번 변경 범위 밖 기존 코드입니다.

## 반드시 수정할 항목

제품 코드 기준 필수 수정 항목은 없습니다.

릴리즈 전 조건:
- 배포 환경 또는 DB 연결이 가능한 환경에서 V6/V7(내용 보기 문서 상세, 크게 보기 모달)을 실제로 통과한 증거를 남기십시오.

## 테스트/검증 제안

- `scripts/verify-knowledge-52.mjs`에 `REQUIRE_CONTENT_CHECK=1` 같은 옵션을 두고, 해당 모드에서는 V6/V7 스킵을 실패로 처리하면 검증 결과 해석이 명확해집니다.
- 모바일 폭(예: 390px)과 데스크탑 폭(예: 1440px)에서 칩 줄바꿈/가로 스크롤이 겹치지 않는지 스크린샷 증거를 보강하면 KR-03 리스크를 더 줄일 수 있습니다.

## 재리뷰 필요 여부

조건부 재확인 권장.

코드 수정 재리뷰는 필수는 아니지만, V6/V7 프로덕션 검증 결과 또는 검증 스크립트 스킵 처리 개선 후 짧은 재확인을 권장합니다.
