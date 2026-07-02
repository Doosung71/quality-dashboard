# Codex (코라) Review: 첨부파일 드래그 앤 드랍

**검수일**: 2026-07-02
**검수자**: Codex CLI (코라)
**요청서**: `quality-dashboard/docs/reviews/request-2026-07-02-attachment-dragdrop.md`

## 최종 판정

조건부 승인

Critical/High 발견 사항은 없습니다. 서버 업로드 검증은 클릭 업로드와 드래그 드롭 모두 동일한 `/api/attachments/upload` 경로를 통과하며, MIME 타입과 확장자를 모두 검사해 fail-closed 구조를 유지합니다.

남은 리스크는 드래그 하이라이트 상태의 시각적 깜빡임 가능성과 드래그 이벤트 자동화 테스트 부재입니다. 기능 차단 또는 보안 차단은 아니므로 보류가 아니라 조건부 승인으로 판정합니다.

## 발견 사항

### Critical

없음.

### High

없음.

### Medium

1. `components/ui/attachment-uploader.tsx:86`
   - 항목: A. 이벤트 핸들러 누락 케이스
   - 판정: Medium
   - 이슈: `handleDragLeave`가 `e.currentTarget.contains(e.relatedTarget as Node)` 또는 drag depth 카운터 없이 모든 `dragleave`에서 곧바로 `setDragActive(false)`를 실행합니다.
   - 리스크: 파일을 드래그한 채 버튼, 안내 텍스트, 첨부 목록 항목 등 자식 요소 경계를 지날 때 부모 래퍼의 하이라이트가 꺼졌다 켜지는 깜빡임이 발생할 수 있습니다. 업로드 성공/실패 경로에는 영향이 없지만, 공용 컴포넌트라 16개 사용처에서 동일 UX 결함이 반복됩니다.
   - 권고: `relatedTarget`이 현재 래퍼 내부이면 무시하거나 `dragenter`/`dragleave` depth 카운터로 최외곽 이탈 때만 `dragActive`를 해제하십시오.

2. `components/ui/attachment-uploader.tsx:80`
   - 항목: A. disabled/uploading 상태
   - 판정: Medium
   - 이슈: `disabled || uploading`일 때 새로 하이라이트를 켜지는 않지만, 이미 `dragActive`가 켜진 뒤 props/state가 disabled/uploading으로 바뀌는 경로를 정리하는 효과는 없습니다.
   - 리스크: 외부 저장 동작 등으로 `disabled`가 드래그 중 전환되면 하이라이트가 다음 leave/drop 이벤트까지 남을 수 있습니다. 일반 사용 흐름에서는 낮은 확률의 시각적 결함입니다.
   - 권고: `disabled` 또는 `uploading`이 true가 될 때 `dragActive`를 false로 내리는 `useEffect`를 추가하거나, 드래그 상태 전환을 하나의 guard 함수로 정리하십시오.

3. `components/ui/attachment-uploader.tsx:80`
   - 항목: 테스트 누락
   - 판정: Medium
   - 이슈: 현재 테스트 세트에는 `AttachmentUploader`의 드래그 드롭, 비허용 파일 드롭, maxFiles 초과 드롭, disabled/uploading 드롭 방지 자동화 테스트가 없습니다.
   - 리스크: 이번 변경의 핵심 이벤트 경로가 추후 리팩토링에서 깨져도 `vitest` 191개 테스트가 잡지 못합니다.
   - 권고: React Testing Library 또는 현 프로젝트 테스트 패턴에 맞춰 `dragOver`, `dragLeave`, `drop` 이벤트가 `handleFiles`/fetch 호출과 상태 해제를 올바르게 수행하는지 최소 케이스를 추가하십시오.

### Low

1. `components/ui/attachment-uploader.tsx:118`
   - 항목: B. 18개 재사용처 회귀 여부
   - 판정: Low
   - 이슈: 안내 문구가 길어졌습니다. 현재 래퍼 클래스 추가(`rounded-lg transition-colors`, 조건부 ring/bg)는 문서 흐름을 바꾸지 않아 레이아웃 회귀 위험은 낮지만, 좁은 패널에서는 한 줄 영역이 늘어날 수 있습니다.
   - 근거: 현재 저장소에서 `<AttachmentUploader` 사용처는 16곳으로 확인했습니다. 요청서의 18개 화면 표현과 숫자는 다르지만, NCR/클레임/입회검사/수입검사/협력업체감사/자산/수선 등 주요 공용 사용처는 포함됩니다.
   - 권고: 기능 반영 후 대표 좁은 화면 2곳(예: Drawer, 모바일 폭 폼)에서 안내 텍스트 줄바꿈만 육안 확인하면 충분합니다.

## 요청 항목별 판정

- A. 이벤트 핸들러 누락 케이스: Medium
- B. 18개 재사용처 회귀 여부: Low
- C. 서버 검증 우회 가능성 재확인: OK

## 반드시 수정할 항목

없음. Critical/High가 없으므로 완료 보류 대상은 아닙니다.

다만 운영 반영 전 품질을 더 단단히 하려면 `handleDragLeave`의 내부 자식 이동 필터링과 드래그 이벤트 테스트 1개 이상은 권고합니다.

## 테스트/검증 제안

- `AttachmentUploader` 단위 테스트: 허용 파일 drop 시 `fetch("/api/attachments/upload")` 호출 및 `onChange` 반영.
- `AttachmentUploader` 단위 테스트: disabled/uploading 상태 drop 시 fetch 미호출.
- `AttachmentUploader` 단위 테스트: maxFiles 초과 drop 시 에러 표시 및 fetch 미호출.
- 브라우저 확인: 첨부 목록이 있는 상태에서 파일을 드래그해 목록 항목 위를 지나갈 때 ring 하이라이트가 깜빡이지 않는지 확인.

## 검증 결과

- `npx tsc --noEmit`: 통과
- `npm test`: 통과, 20 test files / 191 tests passed
- `npm run build`: 성공. 기존 ESLint warning 다수는 출력되었고, 이번 변경 파일에도 기존 `jsx-a11y/alt-text` warning이 표시되었으나 빌드는 성공했습니다.
- 참고: `npm test -- --runInBand`는 Vitest 4에서 지원하지 않는 옵션이라 실패했으며, 프로젝트 스크립트 그대로 `npm test`를 재실행해 통과를 확인했습니다.

## 재리뷰 필요 여부

필수 재리뷰는 필요 없습니다. `handleDragLeave` 보강 또는 드래그 이벤트 테스트 추가 후에는 간단 재리뷰만 권장합니다.
