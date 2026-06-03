# Quality Director Board

품질부문장의 5개 핵심 업무 영역을 한 화면에 통합한 PoC 대시보드.
2026년 9월 품질전략기능회의(CEO 주관) 시연 목표.

## 개발 서버 실행

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) 에서 확인.

---

## 현재 상태

| 영역 | 상태 | 비고 |
|------|------|------|
| 프로젝트 셋업 + 공통 레이아웃 | ✅ 완료 | |
| ① 시험장·시험 현황 | ✅ 완료 (2026-05-12) | 구미/동해 설비 시드 연동 |
| ② 고객 클레임 트래커 | ✅ 완료 (2026-05-29) | 5단계 칸반 + KPI + 상세 사이드바 |
| ③ 협력업체 카드 풀 | ✅ 완료 (2026-05-30) | SRM 카드 풀 + 세부 정보 탭 |
| ④ 품질부문 인사·면담 | ✅ 완료 (2026-05-30) | 기본 정보 + 자격 추적 + 면담 결과 기록 |
| ⑤ 경쟁사·고객·기타 정보 | ✅ 완료 (2026-05-30) | Market Intelligence 수집 및 품질대응 |
| ⑥ 하이브리드 Web-RAG 지식 검색 | ✅ 완료 (2026-05-31) | 외부 실시간 웹 수집 결합 및 Claude-OpenAI 2중 Fallback 적용 |
| ⑦ 입찰 검토 보조 (TRA 통합) | ✅ 이식 완료 (2026-05-30) | PDF 업로드/AI 분석/RAG 규격 매칭/상세검토 및 댓글 |
| 통합 메인 대시보드 | ✅ 완료 (2026-05-30) | 권한별 실시간 모니터링 시뮬레이션 탑재 |
| **CEO 시연 프리미엄 UI 고도화** | ✅ 완료 (2026-06-03) | 글래스모피즘·네온 경보·게이지·모달·Skeleton 전면 적용 |
| **관리자 페이지 개선** | ✅ 완료 (2026-06-03) | 뒤로가기·연락처 저장·자기계정 편집·Role ADMIN 추가 |
| **헤더 레이아웃 개편** | ✅ 완료 (2026-06-03) | 프로필·가이드·사용자관리 헤더 이동, 사이드바 공간 확보 |
| **품질부문 게시판** | ✅ 완료 (2026-06-03) | 공지/일반 분리·댓글·대댓글·파일첨부·이미지프리뷰·이모지피커·익명·공개범위 |

---

## 파일 구조

```
app/
  layout.tsx                         루트 레이아웃
  (dashboard)/
    layout.tsx                       대시보드 공통 레이아웃
    page.tsx                         통합 메인 ✅
    facilities/page.tsx              ① 시험장·시험 현황 ✅
    claims/                          ② 클레임 ✅
    vendors/                         ③ 협력업체 ✅
    hr/                              ④ 인사 ✅
    intelligence/                    ⑤ 외부정보 ✅
    knowledge/                       ⑥ 지식 검색 탭 ✅

  dashboard/                         ⑥ 입찰 검토 - 업로드/리스트 ✅
  tender/                            ⑥ 입찰 검토 - 상세/조치 ✅
  feedback/                          피드백 게시판 ✅
  profile/                           사용자 프로필 ✅
  help/                              도움말 가이드 ✅

components/
  layout/
    sidebar.tsx
    header.tsx
  facilities/
    facilities-view.tsx
  claims/
    claims-kanban.tsx
  ui/
    button.tsx
    card.tsx
    input.tsx

data/
  facility.json                      구미·동해 시험장·설비 시드 데이터
  claims.json                        고객 클레임 시드 데이터

types/
  facility.ts                        TypeScript 타입 정의
  claim.ts                           클레임 타입 정의
```

---

## 기술 스택

| 항목 | 내용 |
|------|------|
| 프레임워크 | Next.js 15 (App Router) |
| UI | Tailwind CSS + shadcn/ui + Tremor |
| 데이터 | 로컬 JSON (`/data/`) → 추후 Notion API |
| 배포 | Vercel |
| 개발 환경 | Surface Pro 11 (Windows 11 ARM64) |

→ 상세 기획은 [PRD.md](PRD.md) 참조
