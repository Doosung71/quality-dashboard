# Research Result: 시험장(Facilities)과 설비 자산(Assets)의 아키텍처 분리 방안

**작성일**: 2026-06-05  
**작성자**: Antigravity CLI (앤)  
**요청서**: `docs/research/request-2026-06-05-facilities-asset-split.md`

---

## 결론

QMS 2.0의 최종 마일스톤인 **Phase INT (Supabase 공통 DB 통합)**를 위해, "시험소 장소(Location)"와 "설비 자산(Asset)" 테이블을 관계형 구조로 미리 정규화해 둘 필요가 있다. 현재 단일 JSON 파일(`facility.json`) 내부에 장소와 설비 데이터가 강하게 결합되어 있어, 설비의 독립적인 교정 주기 및 노후도 관리 등의 유지보수 확장에 걸림돌이 된다. JSON 파일 및 TypeScript 타입 수준에서 분리하고 런타임에 JOIN하는 리팩토링을 1단계로 진행하고, 이후 DB 마이그레이션을 2단계로 진행한다.

---

## 추천안

### 자산관리 화면 구조 (`/assets`)

- **상단 KPI 카드**: 전체 설비 수 / 노후 설비 수(aging) / 교체 예정 수(planned) / 평균 사용 연수
- **필터 바**: 사이트(구미/동해) + 설비 카테고리 탭 (시험설비 / 계측설비 / 보조설비)
- **설비 목록 테이블**: 기존 `EquipmentTable` 컴포넌트 재사용, 카테고리 컬럼 추가
- **교체 이력**: `replacedBy` / `replaces` 필드를 타임라인 형식으로 인라인 표시
- **모바일**: 기존 카드 뷰(`block md:hidden`) 그대로 재사용

### 시험장·시험 현황 화면 구조 (`/facilities`)

- **시험장 카드**: TestHall/TestYard 공간 정보 중심 — 상태, 시험 형식, 면적
- **현재 시험 중인 제품**: 각 시험장 카드 하단에 해당 설비에 배정된 Test 인라인 표시 (projectName + progress + status badge)
- **인증시험 간트 차트**: 제품(Test) 행 기준으로 재구성 — 기존 설비 행 기준에서 변경
- **설비 테이블 제거**: 설비 목록은 `/assets`로 이전

### 사이드바 메뉴 구조

현재 순서에서 시험장·시험 현황 바로 아래 자산관리 추가:

```
시험장·시험 현황   (FlaskConical)   /facilities
자산관리          (Wrench)         /assets
```

권장 Lucide 아이콘: `Wrench` (설비 유지보수 의미) 또는 `Package` (자산 재고 의미)

---

## 비교표

| 옵션 | 구조 | 장점 | 단점 |
|------|------|------|------|
| A. 탭 방식 (단일 페이지 내) | `/facilities` 내 탭으로 시험장/자산 전환 | 구현 간단 | 목적 혼재, URL 공유 불가 |
| B. 독립 페이지 분리 (추천) | `/facilities` + `/assets` 별도 라우트 | 목적 명확, URL 공유 가능, DB 전환 용이 | 초기 구현량 더 많음 |
| C. 하위 메뉴 | `/facilities/halls` + `/facilities/assets` | 계층 표현 | 사이드바 복잡도 증가 |

→ **방식 B 채택**: 독립 페이지 분리

---

## 데이터 모델 변경 권고

### 즉시 추가 (1단계)
| 필드 | 위치 | 내용 |
|------|------|------|
| `category` | `Equipment` | `"시험설비" \| "계측설비" \| "보조설비"` — 자산 분류용 |

### 나중에 추가 (DB 전환 시, 2단계)
- `assetNumber` (자산 고유번호)
- `acquisitionDate` (취득일)
- `calibrationIntervalMonths` (교정 주기)
- 감가상각/잔존가치는 PoC 범위 초과 — 생략 권고

---

## 근거

- Next.js App Router 독립 라우트 패턴: https://nextjs.org/docs/app/building-your-application/routing (확인: 2026-06-05)
- Lucide 아이콘 목록: https://lucide.dev/icons/ (확인: 2026-06-05)
- 관계형 정규화 1NF→3NF 패턴: 업계 표준 (CMMS 자산관리 시스템 공통 원칙)
- IBM Maximo 자산관리 UX 벤치마크: 자산 목록 + 위치 별도 화면 구조 채택 (블로그 출처)

---

## 리스크

1. **고아 데이터(Orphaned Asset)**: DB FK 제약 없으므로 `hallId` 유실 가능 → Vitest 무결성 검증으로 대응
2. **`getSpaceEquipment` 함수 참조**: `FacilityData` 타입에서 `equipment` 제거 시 컴파일 에러 발생 → `assets` 데이터를 별도 인자로 전달하도록 수정 필요
3. **기존 `result-facilities-ux-enhancement.md`와 중복**: 이전 UX 리서치 결과와 방향 일치 확인 필요

---

## Claude(클로이)에게 권장하는 다음 행동

1. **데이터 및 타입 격리**: `facility.json`을 `facilities.json`(장소)과 `assets.json`(설비)으로 분리, `types/facility.ts`에서 `Equipment` 인터페이스를 `types/asset.ts`로 이전
2. **Fetch 및 헬퍼 로직 수정**: `FacilitiesView`와 fetcher 코드에서 두 JSON을 각각 가져오도록 갱신, `getSpaceEquipment(assets, spaceId)` 시그니처 수정
3. **`/assets` 페이지 신규 구현**: 기존 `EquipmentTable` 재사용 + KPI 카드 + 카테고리 필터
4. **`/facilities` 페이지 리포커스**: 설비 테이블 제거, 시험장 카드에 Test 제품 인라인 표시
5. **사이드바 메뉴 추가**: `Wrench` 아이콘으로 `/assets` 자산관리 메뉴 삽입
6. **무결성 검증 테스트**: `facilities.test.ts` 신규 — `assets`의 `hallId`가 `facilities`에 실제 존재하는지 검증
