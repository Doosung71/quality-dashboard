# ITP 구조 참조 문서

카타르 GTC 1266 (220kV) 및 GTC 1288 (400kV) 샘플에서 추출한 ITP 표준 구조.  
ITP 자동 생성 AI 기능 설계 시 이 문서를 기준으로 삼는다.

---

## 1. ITP 테이블 컬럼 구조 (9개 컬럼)

| 컬럼 | 영문명 | 한글명 | 필수 | 비고 |
|------|--------|--------|------|------|
| 1 | NO | 번호 | Y | 순번 (1, 2, 3...) |
| 2 | Test Items | 시험 항목 | Y | 구체적 시험명 |
| 3 | Reference Standard / Document | 참조 규격 | Y | IEC, KM Spec 등 |
| 4 | Equipment | 시험 장비 | Y | 측정 장비명 |
| 5 | Acceptance Criteria | 합부 판정 기준 | Y | 수치/조건 명시 |
| 6 | Sampling | 샘플링 방법 | Y | LS내부 % + FAT % |
| 7 | Inspection Involvement (LS) | LS 검사 관여도 | Y | H / W / R / (W) |
| 8 | Inspection Involvement (KM) | 고객 검사 관여도 | Y | H / W / R / (W) |

> 실제 테이블은 컬럼 7·8이 "Inspection Involvement"라는 하나의 헤더 아래  
> LS / KM 두 서브컬럼으로 분리된다.

---

## 2. 검사 관여도 코드 정의

| 코드 | 명칭 | 의미 |
|------|------|------|
| **H** | HOLD POINT | 검사원 필참 필수. 부재 시 시험 진행 불가 |
| **W** | WITNESS POINT | 검사원 참석 선택. 기록은 검토 가능해야 함 |
| **R** | REVIEW | 기록·성적서·인증서 제출 필요 (현장 참석 불요) |
| **(W)** | Spot Witness | 부분 입회 (고객 측에 주로 표기) |

실제 패턴 (샘플 기준):
- LS 컬럼: 대부분 **H**
- KM 컬럼: 대부분 **(W)** (Spot Witness)
- 원자재 투입 검사(Cleanliness 등): LS=**R**, KM=**R**

---

## 3. 시험 분류 체계

### 3.1 케이블 시험 3단계

| 분류 | 영문 | 대상 | 샘플링 기준 |
|------|------|------|------------|
| Routine Test | 루틴 시험 | 전 드럼 | LS: 100%, FAT: 10% of Shipping drums |
| Additional Regular Test | 추가 정규 시험 | 압출런 단위 | LS: 10~20% / extrusion run, FAT: 10% |
| Sample Test | 샘플 시험 | 특정 샘플 | 10km당 1개 20m 샘플 등 |

### 3.2 부속품 시험 (Joint / Termination / Link Box / SVL)

각 부속품별로 동일하게 Routine / Additional / Sample로 구분됨.

---

## 4. 주요 시험 항목 목록 (220kV 기준)

### Routine Test (케이블)

| NO | 시험명 | 규격 | 합부 기준 예시 |
|----|--------|------|--------------|
| 1 | Voltage test | IEC 62067:2022 C 9.3 | No breakdown at 325kV for 30min |
| 2 | Partial discharge test | IEC 62067:2022 C 9.2 | Max. 3pC at 195kV |
| 3 | Dielectric loss angle | IEC 62067:2022 C 12.4.5 | Max. 0.0005 at 195kV (1.5U0) |
| 4 | Conductor examination | IEC 62067:2022 C 10.4 | No. of wires: 91, Diameter: Nom 63.0mm |
| 5 | Conductor DC resistance | IEC 62067:2022 C 10.5 | Max 0.0072 Ω/km at 20℃ |
| 6 | Metallic sheath resistance | IEC 62067:2022 C 10.5 | Max 0.06970 Ω/km at 20℃ |
| 7 | Oversheath voltage withstand | IEC 62067:2022 C 9.4 | No breakdown at DC 25kV for 1min |

### Additional Regular Test (케이블) — 주요 항목

| NO | 시험명 | 규격 |
|----|--------|------|
| 1 | Insulation/sheath thickness | IEC 60811-201 |
| 2 | Insulation concentricity | IEC 62067:2022 C 10.6 |
| 3 | Insulation purity | KM Spec. V3 |
| 4 | Moisture content | KM Spec. V3 |
| 5 | Hot set test (XLPE) | IEC 60811-507 |
| 6 | Insulation shrinkage | IEC 60840:2020 |
| 7 | Semiconducting screen resistivity | IEC 62067:2022 |
| 8 | Screen protrusions | KM Spec. V3 |
| 9 | Capacitance | IEC 62067:2022 |
| 10 | XLPE crosslinking by-product concentration | KM Spec. V3 |
| 11~13 | FTIR / DSC / TGA | KM Spec. V3 |
| 14 | Cleanliness (incoming insulation) | KM Spec. V3 |
| 15 | Smoothness (incoming semiconducting) | KM Spec. V3 |
| 16 | Weight (copper & lead) | KM Spec. V3 |
| 17 | Density HDPE & carbon content | KM Spec. V3 |
| 18 | Water penetration | IEC 62067:2022 |

---

## 5. 전압별 주요 파라미터 비교

| 항목 | 220kV (GTC 1266) | 400kV (GTC 1288) |
|------|-----------------|-----------------|
| Voltage test | 325kV / 30min | 440kV / 60min |
| PD test 기준 | Max. 3pC at 195kV | Max. 3pC at 345kV |
| DLA 기준 | Max. 0.0005 at 195kV | Max. 0.0005 at 345kV |
| Joint HV | 325kV / 30min | 575kV / 30min |
| Joint PD | Max. 5pC at 195kV | Max. 5pC at 345kV |
| Sample 전압시험 | 650kV (5U0) / 1hr | 1,150kV (5U0) / 1hr |
| Conductor (No) | 91 wires | Data Sheet 참조 |

---

## 6. 문서 헤더 구조 (표지 필드)

ITP 문서 표지에 공통으로 포함되는 필드:

```
Ref. No.          : (문서번호)
Manufacturing     : 228, Suchul-daero, Gumi-si, Gyeongsangbuk-do, Korea
location
Client            : KAHRAMAA
Rev. No.          : 0 / 1
Date              : YYYY-MM-DD
Project Name      : GTC/XXXX/2025
Document Title    : Inspection and Test Plan for [전압]kV Power Cables and Accessories
```

개정 이력 테이블:
| Rev. No | Date | Descriptions | Prepared By | Checked By | Approved By (LS) | Approved By (Client) |

---

## 7. AI 자동 생성 시 매핑 규칙

고객 사양서에서 ITP를 생성할 때 아래 매핑 로직을 적용한다:

### 전압 → 시험 파라미터 매핑

```
전압 U0 = Rated voltage / √3

Routine Voltage test = 2.5 × U0
PD test voltage = 1.5 × U0
Sample test = 5 × U0
```

### 사양서 → ITP 컬럼 매핑

| 사양서 내용 | ITP 컬럼 | 추출 방법 |
|-----------|--------|---------|
| 전압 등급 | Acceptance Criteria 수치 | 공식 계산 |
| 참조 규격 번호 | Reference Standard | 직접 매핑 |
| 시험 장비 | Equipment | 규격별 표준 장비 lookup |
| 샘플링 빈도 | Sampling | KM Spec 또는 기본값 적용 |

### 기본 Inspection Involvement 패턴

- 전기 시험 (Voltage, PD, DLA 등): LS=H, KM=(W)
- 치수/재료 시험 (Thickness, Purity 등): LS=H, KM=(W)
- 원자재 시험 (Cleanliness, Smoothness): LS=R, KM=R
- 포장 검사: LS=H, KM=(W)

---

## 8. 부속품별 시험 구조 요약

### Joint (접속함)

| 분류 | 시험 수 | 주요 시험 |
|------|--------|---------|
| Routine | 4 | HV withstand, PD, X-Ray, Packing |
| Sample | 4 | FTIR, Cleanliness, DLA, TGA |
| Additional | 3 | Mechanical stretch, Semi-screen resistance, Insulated gap |

### Termination (종단함) — Joint과 동일 구조

### Link Box

| 분류 | 시험 수 | 주요 시험 |
|------|--------|---------|
| Routine | 7 | Visual, Insulation R, Contact R, Water seal, DC/Impulse withstand, Packing |
| Additional | 없음 | — |

### Sheath Voltage Limiters (SVL)

| 분류 | 시험 수 | 주요 시험 |
|------|--------|---------|
| Routine | 2 | Leakage current, Insulation R |

---

*최초 작성: 2026-06-11*  
*출처: GTC1266D-10-82-P001 Rev.1 (2026-05-11), GTC/1288/2025 Rev.0 (2026-06-01)*
