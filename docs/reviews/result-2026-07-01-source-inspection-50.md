# Codex Review Result — Source Inspection #50 서버 수량 검증

**검수일**: 2026-07-01  
**검수자**: Codex CLI (코라)  
**요청서**: `C:\Dev\QMS 2.0 Integration\quality-dashboard\docs\reviews\request-2026-07-01-source-inspection-50.md`  
**판정**: 승인

## Critical

없음.

## High

없음.

## Medium

### M-01. `defectRate`는 여전히 클라이언트 입력값을 신뢰해 저장됨

- 위치: `app/api/source-inspections/route.ts:48`, `app/api/source-inspections/[id]/route.ts:52`
- 근거: `quantity`, `sampleSize`, `defectCount`의 범위 검증은 서버에 추가되었지만, 파생값인 `defectRate`는 요청 body 값을 그대로 Prisma에 전달한다. 이 값은 `app/(dashboard)/vendors/inspections/page.tsx`의 평균 불량률 KPI, 상세 화면 표시, `lib/ingest-qms.ts`의 QMS 마크다운에 그대로 사용된다.
- 영향: API 직접 호출자가 `defectCount=1`, `sampleSize=10`, `defectRate=999`처럼 수량은 정상이나 불량률만 비정상인 데이터를 저장할 수 있다. 이번 요청의 핵심인 "납품/샘플/불량 수량 정합성"은 막혔으나, 불량률 KPI의 신뢰성은 아직 클라이언트 계산에 의존한다.
- 권고: 다음 후속 작업에서 서버가 `defectRate`를 `(defectCount / sampleSize) * 100`으로 재계산해 저장하거나, 최소한 입력된 `defectRate`가 계산값과 허용 오차 내인지 검증한다. 샘플 수량이 없는 경우의 기준은 별도 정책으로 명시한다.

## Low

없음.

## 검토 결과

- SI50-01 서버 수량 검증: 통과. `validateInspectionQuantities()`가 납품 수량의 양의 정수 조건, 샘플 수량의 양의 정수 및 납품 수량 이하 조건, 불량 수량의 0 이상 정수 및 샘플/납품 상한 조건을 fail-closed로 검증한다.
- SI50-02 PUT 부분 수정 병합 검증: 통과. `quantity`, `sampleSize`, `defectCount` 중 하나라도 들어오면 기존 값을 조회해 effective 값을 만든 뒤 검증하고, 대상이 없으면 404를 반환한다.
- SI50-03 기존 데이터/회귀 리스크: 수용 가능. 수량 필드가 없는 첨부 등 부분 수정은 기존처럼 통과하고, 수량 필드가 포함된 수정만 정합성 검증을 적용한다. `defectRate`는 위 Medium 후속 개선으로 남긴다.
- 검증 스크립트: `scripts/verify-si-50.mjs`는 `.env.local`의 `WITNESS_VERIFY_*` 환경변수명만 참조하며 하드코딩된 자격증명은 확인되지 않았다. `.env.local` 실제 내용은 읽지 않았다.

## 검증 명령

```powershell
npx vitest run app/api/source-inspections/route.test.ts
```

결과: 1개 파일, 16개 테스트 통과.

```powershell
npx tsc --noEmit
```

결과: 통과.

```powershell
npx vitest run
```

결과: 18개 파일, 168개 테스트 통과.

```powershell
npm run build
```

결과: 성공. 기존 ESLint warning은 남아 있으나 빌드를 실패시키지 않았고, 이번 변경의 차단 이슈로 보이지 않는다.

## 완료 판정

승인한다. 이번 요청의 핵심 목표인 Source Inspection POST/PUT 서버 수량 검증은 충족되었고, Critical/High 차단 이슈는 없다. `defectRate` 서버 재계산/검증은 KPI 신뢰성 강화를 위한 Medium 후속 작업으로 처리하면 된다.
