# QMS 2.0 마스터플랜 통합 및 인수인계 보고서 (Gemini → Claude)

**일자**: 2026-05-28
**작성자**: Gemini CLI (R&D / Planner)
**수신자**: Claude Code (PM / Coder)
**대상 프로젝트**: quality-dashboard (QMS 2.0 PoC)

---

## 1. 개요: QMS 2.0 비전 정렬 (Alignment)

Claude 부재 중, Dennis 품질부문장님의 **QMS 2.0 AX 마스터플랜**이 확정되어 프로젝트 루트에 공식 문서로 편입되었습니다. 앞으로의 모든 코딩 및 기능 구현은 이 마스터플랜의 4대 원칙을 최우선으로 준수해야 합니다.

### 📜 핵심 편입 자산
1.  `QMS_2.0_MASTER_PLAN.md`: 부문장님이 직접 작성한 4대 핵심 아키텍처 원칙 (루트 디렉토리 저장 완료).
2.  `GEMINI.md`: AI 에이전트 행동 강령 (Zero Double Work, Obsidian Style Data 등).

---

## 2. Claude 준수 사항 (Architectural Mandates)

### ① Zero Double Work (시스템 내 업무 완결)
*   **요구사항**: 오프라인 작업을 박멸해야 합니다. 사용자가 시스템 밖으로 나가지 않도록 설계하세요.
*   **Action Item**: 현재 구현된 `/claims` 페이지의 상세 사이드바에 있는 '보고서 생성' 및 '단계 이동' 버튼이 단순 더미가 아니라, 실제 상태를 변경하고 알림(Mock)을 발생시키는 방향으로 로직이 연결되어야 합니다.

### ② Data Standardization (Obsidian / MD / JSON 구조)
*   **요구사항**: 향후 사내 RAG 시스템의 연료로 쓰이기 위해 데이터 포맷이 파편화되어서는 안 됩니다.
*   **Action Item**: 향후 개발될 팀원 관리, 협력업체 평가 등의 데이터 시드 생성 시 반드시 JSON 또는 Markdown 형식으로 설계하여 API 연동(마이크로서비스)이 용이하도록 유지하세요.

### ③ Director's View & 시각화
*   **요구사항**: 부문장 뷰에 맞게 숫자의 단순 나열을 피하고 직관적인 신호등 체계(Red/Yellow/Green)를 사용하세요.
*   **Action Item**: 클레임이나 설비 상태 표출 시, 지연(Red) 상태가 시각적으로 가장 먼저 인지되도록 UI 가중치를 조정해 주세요.

---

## 3. Gemini 선행 작업 요약 (Phase 1 & 2)

*   **Phase 1 리팩토링**: 배지 컴포넌트(`badges.tsx`) 공용화 및 타입 에러 수정 완료.
*   **Phase 2 클레임 트래커**: 
    *   `data/claims.json` 시드 구축 완료.
    *   5단계 칸반 보드 및 KPI 대시보드 UI 구현 완료.
    *   검색/우선순위 필터링 및 타임라인 상세 사이드바 연동 완료.

---

## 4. 🚀 Claude Next Action (수행 요청 사항)

Claude 복귀 즉시 다음 작업을 우선적으로 검토 및 수행해 주십시오.

1.  **마스터플랜 숙지**: 루트의 `QMS_2.0_MASTER_PLAN.md`와 `GEMINI.md`를 우선 읽고 맥락을 동기화할 것.
2.  **클레임 액션 구현**: `claims-view.tsx`의 사이드바 내 '단계 이동' 로직을 State 기반으로 실제 동작하게 만들고, '보고서 생성' 클릭 시 마크다운 형태의 텍스트가 클립보드에 복사되는 (또는 모달로 뜨는) PoC 기능을 구현할 것.
3.  **반응형(모바일) 체크**: 부문장님의 잦은 현장 이동을 고려하여, 현재까지 구현된 칸반과 대시보드가 모바일/태블릿에서 깨짐 없이 보이도록 Tailwind 클래스 점검 및 수정.

> **Gemini's Note**: "클로드, 베이스 캠프는 내가 완벽히 셋업해 뒀어. 이제 네가 부문장님의 마스터플랜에 맞춰 이 앱에 생명력(Interaction & Responsive)을 불어넣을 차례야!"
