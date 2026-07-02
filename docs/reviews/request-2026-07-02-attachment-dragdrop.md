# Codex 검수 요청 — 첨부파일 드래그 앤 드랍

**요청일**: 2026-07-02
**요청자**: Claude Code (PM)
**리뷰 유형**: Implementation Review
**선행 문서**: 없음 (E2E-1 피드백 #37, id `cmqehcqpa000104lb5tt4lfag`)

---

## 변경 개요

E2E-1 피드백 #37 "파일 업로드 시 드래그 앤 드랍 기능 및 여러 파일을 동시에 선택하여 업로드할 수 있으면 좋겠습니다"에 대한 대응이다. 이 피드백에는 이미 관리자 답글("Blob 용량 제한 해결 후 구현하겠다", 2026-06-15)이 달려 있었고, Blob 용량 제한은 2026-06-18 Vercel Pro 업그레이드로 이미 해소되어 있었다. 코드 확인 결과 다중 파일 선택(`<input multiple>`)은 이미 구현되어 있었고, 드래그 앤 드랍만 누락되어 있어 이번 변경 범위로 한정했다.

`components/ui/attachment-uploader.tsx`는 18개 화면(NCR·클레임·입회검사·자산·수선·출장검사·수입검사·협력업체감사 등)이 공용으로 재사용하는 컴포넌트라, 이 파일 하나의 변경이 전체 첨부파일 UX에 영향을 준다.

---

## 변경된 파일

### 1. `components/ui/attachment-uploader.tsx` (수정)
- `dragActive` state 추가
- `handleDragOver` / `handleDragLeave` / `handleDrop` 핸들러 추가 — 기존 `handleFiles(files: FileList | null)` 함수를 그대로 재사용(새 검증 로직 없음)
- 최상위 wrapper `<div>`에 드래그 이벤트 바인딩 + 드래그 중 teal 링 하이라이트(`ring-2 ring-teal-400 ring-offset-1 bg-teal-50/50`)
- 안내 텍스트에 "드래그 앤 드랍 가능" 문구 추가
- 서버 측 확장자/타입 검증(`app/api/attachments/upload/route.ts`의 `ALLOWED_TYPES`/`ALLOWED_EXTENSIONS`, fail-closed)은 변경하지 않음 — 클라이언트 `accept` 속성은 드래그 앤 드랍에서 우회되지만, 서버가 이미 동일하게 검증하므로 추가 클라이언트 검증은 넣지 않았다.

---

## 검수 요청 항목

### A. 이벤트 핸들러 누락 케이스
**위치**: `attachment-uploader.tsx` `handleDragOver`/`handleDragLeave`
**내용**: 자식 요소(버튼·목록 항목) 위로 드래그가 지나갈 때 `dragenter`/`dragleave`가 반복 발생해 하이라이트가 깜빡이지 않는지, 또는 disabled/uploading 상태에서 하이라이트가 걸렸다가 안 풀리는 경로가 없는지 확인 필요.
**리스크**: 시각적 결함(기능 자체는 영향 없음)이라 Low~Medium 수준으로 예상.

### B. 18개 재사용처 회귀 여부
**위치**: `attachment-uploader.tsx`를 import하는 18개 파일 (NCR·클레임·입회검사·자산·수선·검사 3종·협력업체감사 등)
**내용**: 공용 컴포넌트 변경이 각 화면의 레이아웃(margin/padding 등 wrapper div 스타일 변경으로 인한 시각적 어긋남)에 영향을 주는지.
**리스크**: `space-y-2` → `space-y-2 rounded-lg transition-colors`로 클래스만 추가되어 레이아웃 영향은 낮다고 판단하나, 넓은 재사용 범위라 재확인 요청.

### C. 서버 검증 우회 가능성 재확인
**위치**: `app/api/attachments/upload/route.ts`
**내용**: 드래그 앤 드랍 경로가 클라이언트 `accept` 속성(확장자 필터)을 우회하는 것이 맞는지, 서버 `ALLOWED_TYPES`/`ALLOWED_EXTENSIONS` 검증이 정말 모든 경로(클릭 업로드·드래그 업로드)에 동일하게 적용되는지 재확인.
**리스크**: 이 부분이 fail-open이면 보안 이슈. 로컬 브라우저 테스트로 `.exe` 드롭 시 거부됨을 확인했으나 코드 레벨 재확인 요청.

---

## 빌드/테스트 상태

```
npx tsc --noEmit → 0 에러
npx vitest run → 20 test files / 191 tests passed
npm run build → 성공 (타입 오류 없음)
```

**브라우저 골든패스 검증** (로컬 dev, 같은 Neon DB, `/assets/new` 화면):
```
정상 파일(.txt) 드래그 드롭 → 업로드 성공, 목록에 표시           ✅
드래그 중 하이라이트 표시 → 드롭 후 해제                          ✅
비허용 확장자(.exe) 드래그 드롭 → 서버 400 거부, 목록에 미추가     ✅ (fail-closed 유지)
기존 클릭 기반 다중 선택(`multiple` 속성) 회귀 없음                ✅
```

---

## 원하는 판정

- A/B/C 각 항목에 대해 Critical / High / Medium / Low / OK 판정
- 전체에 대해 승인 / 조건부 승인 / 보류 판정
