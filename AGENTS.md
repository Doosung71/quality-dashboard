# AGENTS.md

## 1. 목적

이 문서는 이 프로젝트에서 Claude Code CLI, Codex CLI, Antigravity CLI, ChatGPT를 어떻게 사용할지 정하는 작업 규칙이다.

이 프로젝트의 기본 운영 방식은 다음과 같다.

- Claude Code CLI를 중심으로 개발을 진행한다.
- Codex CLI는 코드 리뷰와 검증에 사용한다.
- Antigravity CLI는 기술 조사와 대안 비교가 필요할 때 사용한다.
- ChatGPT는 전략 정리, 학습, 프롬프트 작성, 문서화를 돕는다.

처음부터 여러 Agent가 동시에 코드를 수정하지 않는다.

목표는 많은 AI를 동시에 사용하는 것이 아니라, 역할을 나누어 더 안전하고 체계적으로 개발하는 방법을 배우는 것이다.

---

## 2. 가장 중요한 규칙

한 번에 하나의 Agent만 파일을 수정한다.

기본적으로 파일 수정 권한은 Claude Code CLI에게만 있다.

Codex CLI와 Antigravity CLI는 사용자가 명확히 허락하지 않는 한 파일을 수정하지 않는다.

기본 역할은 다음과 같다.

```text
Claude는 구현한다.
Codex는 리뷰한다.
Antigravity는 조사한다.
ChatGPT는 정리하고 설명한다.
사용자가 최종 결정한다.
```

---

## 3. 프로젝트 정보

**프로젝트**: quality-dashboard  
**설명**: LS전선 품질부문장을 위한 5개 업무 영역 통합 대시보드 PoC  
**D-day**: 2026년 9월 품질전략기능회의 (CEO + 임원진 시연)

---

## 4. 아키텍처

```
quality-dashboard/
├── app/
│   ├── layout.tsx                     # 루트 레이아웃
│   ├── globals.css
│   └── (dashboard)/                   # 대시보드 라우트 그룹
│       ├── layout.tsx                 # 사이드바 + 헤더 공통 레이아웃
│       ├── page.tsx                   # 메인 통합 대시보드 (예정)
│       ├── facilities/                # ① 시험장·시험 현황 ✅ 완료
│       ├── claims/                    # ② 고객 클레임 트래커 (6월)
│       ├── vendors/                   # ③ 협력업체 카드 풀 (7월)
│       ├── hr/                        # ④ 인사·면담 (8월)
│       └── intelligence/              # ⑤ 경쟁사·고객 정보 (8월)
├── components/
│   ├── layout/                        # 사이드바, 헤더
│   │   ├── sidebar.tsx
│   │   └── header.tsx
│   ├── facilities/                    # 시험장 뷰 컴포넌트
│   │   └── facilities-view.tsx
│   └── ui/                            # shadcn/ui 공통 컴포넌트
├── data/                              # 로컬 JSON + TypeScript 데이터 레이어
│   ├── facility.json                  # 시드 데이터 (구미·동해 ✅)
│   ├── facility.data.ts
│   ├── tests.json
│   └── tests.data.ts
├── types/                             # TypeScript 타입 정의
│   ├── facility.ts                    # Site, TestHall, TestYard, Equipment
│   └── test.ts                        # Test, TestStatus, TestLog
├── lib/
│   └── utils.ts
├── docs/
│   ├── research/                      # Antigravity 조사 결과 저장
│   └── reviews/                       # Codex 리뷰 결과 저장
└── PRD.md                             # 제품 요구사항 (마일스톤 포함)
```

---

## 5. 핵심 워크플로우

```
PRD.md에서 해당 영역 요구사항 확인
→ 불확실성 있으면 Antigravity에게 조사 요청
→ types/ 에 TypeScript 타입 정의
→ data/ 에 JSON + .data.ts 파일 작성
→ components/ 에 클라이언트 컴포넌트 구현
→ app/(dashboard)/ 에 서버 컴포넌트 페이지 연결
→ npm run build 로 타입 오류 확인
→ Codex에게 구현 리뷰 요청
→ Critical/High 수정 후 docs/reviews/ 저장
```

---

## 6. 개발 명령어

```bash
npm run dev      # 개발 서버 시작 (http://localhost:3000)
npm run build    # 프로덕션 빌드 (타입 오류 최종 확인)
npm run lint     # ESLint 검사
```

---

## 7. 코딩 규칙

1. **JSON 데이터 캐스트**: `as unknown as Type` 방식 사용
   - JSON import는 union 리터럴을 string으로 넓히므로 `satisfies` 사용 불가
   - 예: `const data = raw as unknown as FacilityData`

2. **설비 상태 계산**: `computeStatus(eq)` 함수 사용
   - raw `eq.status` 직접 사용 금지
   - 도입연도 기준 자동 분류: 20년↑ = 노후, 10년↑ = 정상, 미만 = 신규

3. **간트 차트 연도**: `GANTT_START` / `GANTT_END` 상수로 관리 (현재 2026년 고정)

4. **데이터 레이어 분리**: 컴포넌트는 데이터 출처를 모름
   - 데이터 접근 함수는 `lib/data.ts`에 집중 (V1.5 Notion API 전환 대비)
   - 리스트 컴포넌트는 `page` / `limit` 파라미터를 처음부터 수용

5. **필터 상태**: URL 쿼리 파라미터로 관리 (딥링크 + 서버사이드 전환 용이)

6. **UI 언어**: 한국어 전용, 간결하고 정보 밀도 높게 유지

---

## 8. 보안 원칙

- 비밀키, `.env`, API key, token 절대 노출 또는 임의 수정 금지
- 새 패키지 설치, 대규모 리팩토링, 파일 삭제는 사용자 승인 후 진행
- MVP는 로그인·권한 없음 (내부 시연용) — 외부 배포 전 반드시 인증 추가

---

## 9. Antigravity·Codex 협업 방법 (수동 운영)

모든 협업은 대화창에서 명시적 요청으로 시작한다. 자동 실행 훅은 사용하지 않는다.  
**파일 수정 주체는 Claude Code 하나로 제한** — Antigravity와 Codex는 코드를 직접 작성하거나 파일을 수정하지 않는다.

### Antigravity 리서치 요청
설계 전 조사가 필요할 때 아래 형식으로 대화창에 직접 요청.  
결과는 `docs/research/` 에 저장 후 참조.

```text
프로젝트 배경:
조사 주제:
확인할 질문:
제약:
원하는 출력:
출처 요구:
```

### Codex 리뷰 요청
구현 완료 후 아래 형식으로 대화창에 직접 요청.  
결과는 `docs/reviews/` 에 저장.  
🔴 Critical 항목 발생 시 즉시 수정 후 재진행.

```text
변경 목적:
변경 파일:
실행한 테스트:
특별히 봐야 할 리스크:
원하는 판정:
```

---

## 10. 지식 보관함 연계 (Vault Context)

**보관함 경로**: `C:\Obsidian\Dennis-Knowledge-Vault\`

코드 설계·데이터 시드 작성 전, 아래 vault 문서를 먼저 읽어 도메인 맥락을 확보한다.  
Claude Code는 구현 중 모르는 도메인 사항이 생기면 vault를 조회하고 Dennis에게 확인을 구한다.

### 대시보드 영역별 참조 vault 문서

| 영역 | 참조할 vault 문서 | 용도 |
|------|-----------------|------|
| ① 시험장·시험 현황 | `05_Work/wiki/2026-05-13_구미동해_시험설비_현황.md` | 구미·동해 실제 설비 현황, 투자 계획 |
| ① 시험장·시험 현황 | `05_Work/wiki/2026-05-20_구미동해_시험설비_투자_크로스레퍼런스.md` | 투자 방향 교차 분석 |
| ② 클레임 트래커 | `05_Work/wiki/MOC_업무_지식_허브.md` | 팀별 업무 구조 파악 |
| ③ 협력업체 카드 풀 | `05_Work/wiki/2026-05-20_구매품질팀.md` | 구매품질팀 현황, 협력사 관리 방식 |
| ③ 협력업체 카드 풀 | `05_Work/wiki/standards/MOC_규격_허브.md` | 협력사 인증·규격 항목 참고 |
| ④ 인사·면담 | `05_Work/wiki/2026-05-20_지중가공QA팀.md` 외 6개 팀 파일 | 팀별 인원·역할 구조 |
| ④ 인사·면담 | `05_Work/wiki/2026-05-20_품질경영팀.md` | QMS 인증 총괄 팀 현황 |
| 전 영역 공통 | `05_Work/wiki/standards/` 폴더 | IEC·KS 규격 내용 (시드 데이터 정확도) |

### 사용 원칙

- 데이터 시드(`data/*.json`) 작성 시 vault의 실제 수치·항목명을 우선 참조한다.
- 단, **원본 민감 정보(실명, 실제 거래처명 등)는 코드·시드에 절대 사용하지 않는다** — 반드시 가명 처리.
- vault 문서 내용과 PRD 요구사항이 충돌하면 Dennis에게 확인 후 결정한다.
- vault 문서는 읽기 전용이다. 코딩 작업 중 vault 파일을 수정하지 않는다.
