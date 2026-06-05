import { redirect } from "next/navigation"
import Link from "next/link"
import { requireActivePageSession } from "@/lib/session-guard"

// ─── 블록 타입 ────────────────────────────────────────────
type ContentBlock =
  | { type: "p"; text: string }
  | { type: "tip"; text: string }
  | { type: "warn"; text: string }
  | { type: "poc" }
  | { type: "steps"; items: string[] }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "checklist"; title: string; items: string[] }
  | { type: "h3"; text: string }
  | { type: "faq"; items: { q: string; a: string }[] }

type SectionItem = { id: string; title: string; content: ContentBlock[] }

// ─── 공통 상단 섹션 (모든 역할) ──────────────────────────
const COMMON_TOP: SectionItem[] = [
  {
    id: "poc-notice",
    title: "⚠️ 먼저 읽어주세요 — PoC 시스템 안내",
    content: [
      { type: "poc" },
      { type: "p", text: "이 시스템은 QMS 2.0 정식 도입 전 개념 증명(PoC) 단계입니다. 현재 데이터는 모두 시범용 샘플 데이터입니다." },
      {
        type: "table",
        headers: ["항목", "현재 상태", "의미"],
        rows: [
          ["대시보드 KPI", "샘플 데이터", "실제 ERP·현장 데이터가 아닙니다"],
          ["고객 클레임 / NCR", "샘플 데이터", "실제 클레임·부적합 건이 아닙니다"],
          ["검사 기록 (수입·출장·감사)", "샘플 데이터", "실제 검사 이력과 다릅니다"],
          ["AI 분석 결과", "Draft (초안)", "반드시 직접 검토 후 사용하세요"],
          ["계정 데이터", "실제 저장", "가입 정보·입찰 분석 이력은 실제 DB에 저장됩니다"],
        ],
      },
      { type: "warn", text: "원가·견적·진행 중인 실제 입찰 데이터를 시스템에 입력하지 마세요. PoC 단계에서는 비민감 샘플 시방서만 사용하세요." },
    ],
  },
  {
    id: "getting-started",
    title: "0. 시작하기 — 최초 접속 방법",
    content: [
      { type: "h3", text: "1단계: 가입 신청" },
      {
        type: "steps",
        items: [
          "아래 URL로 접속합니다: quality-dashboard-flax.vercel.app/register",
          "이름, 이메일, 비밀번호, 부서, 사번을 입력하고 '가입 신청' 버튼을 클릭합니다.",
          "'관리자 승인 대기 중' 화면이 나타나면 정상입니다. 관리자(부문장)가 승인할 때까지 기다립니다.",
        ],
      },
      { type: "h3", text: "2단계: 승인 후 로그인" },
      {
        type: "steps",
        items: [
          "관리자 승인 완료 연락을 받으면 /login 페이지에서 로그인합니다.",
          "로그인 후 역할에 따라 대시보드 화면이 자동으로 표시됩니다.",
          "로그인 시 3단계 온보딩 가이드가 자동으로 팝업됩니다. (이후에도 이 페이지에서 확인 가능)",
        ],
      },
      { type: "h3", text: "비밀번호를 잊어버렸을 때" },
      {
        type: "steps",
        items: [
          "관리자(부문장 신두성)에게 연락합니다.",
          "관리자가 임시 비밀번호(예: QMS-A3K7M2)를 발급해 드립니다.",
          "임시 비밀번호로 로그인 후, 오른쪽 상단 프로필 → '비밀번호 변경'에서 새 비밀번호로 교체하세요.",
        ],
      },
      { type: "tip", text: "로그인 후 프로필 페이지에서 비밀번호와 닉네임을 언제든지 변경할 수 있습니다." },
    ],
  },
]

// ─── 공통 하단 섹션 (모든 역할) ──────────────────────────
const COMMON_BOTTOM: SectionItem[] = [
  {
    id: "feedback-how",
    title: "피드백 남기는 방법",
    content: [
      { type: "p", text: "이 시스템은 여러분의 피드백으로 개선됩니다. 불편한 점, 빠진 기능, 버그를 적극적으로 남겨주세요." },
      {
        type: "steps",
        items: [
          "왼쪽 사이드바 하단 '피드백' 메뉴를 클릭합니다.",
          "내용을 입력합니다. 화면 캡처를 첨부하면 더욱 빠른 처리가 가능합니다.",
          "'피드백 등록' 버튼을 클릭하면 관리자에게 바로 전달됩니다.",
        ],
      },
      {
        type: "checklist",
        title: "이런 피드백이 특히 도움됩니다",
        items: [
          "어디서 막혔는지 (예: '검사 등록 버튼을 눌렀는데 저장이 안 됐다')",
          "화면이 깨지거나 오류 메시지가 떴을 때 스크린샷",
          "실무에서 꼭 필요한데 없는 기능 (예: '클레임 엑셀 내보내기가 필요하다')",
          "용어나 설명이 이해하기 어려웠던 부분",
        ],
      },
    ],
  },
  {
    id: "faq",
    title: "자주 묻는 질문 (FAQ)",
    content: [
      {
        type: "faq",
        items: [
          {
            q: "로그인이 안 됩니다.",
            a: "두 가지 경우가 있습니다. ① 관리자 승인 전 — 가입 후 관리자 승인이 완료되어야 로그인할 수 있습니다. 관리자(부문장)에게 승인 요청을 하세요. ② 비밀번호 오류 — 자동 이메일 발송은 미지원입니다. 관리자에게 임시 비밀번호 발급을 요청하세요.",
          },
          {
            q: "검사 결과를 등록했는데 목록에 바로 나타나지 않습니다.",
            a: "페이지를 새로고침(F5)하거나 다른 메뉴를 갔다가 돌아오면 새로 등록된 결과가 표시됩니다. 저장은 즉시 완료되어 있습니다.",
          },
          {
            q: "클레임/NCR 상세 페이지에서 수정이 안 됩니다.",
            a: "인라인 편집 필드를 클릭하면 수정 모드가 활성화됩니다. 수정 후 필드 바깥을 클릭하거나 엔터를 눌러야 저장됩니다. 종결(Closed) 상태는 수정이 불가합니다.",
          },
          {
            q: "AI 분석이 멈추거나 너무 오래 걸립니다.",
            a: "파일 크기에 따라 최대 5분까지 소요됩니다. '분석 중...' 스피너가 표시되면 정상 진행 중입니다. 절대 새로고침(F5)하지 마세요. 5분 이상 응답이 없으면 페이지를 새로 열고 재시도한 뒤, 피드백 게시판에 알려주세요.",
          },
          {
            q: "파일 업로드가 실패합니다.",
            a: "세 가지를 확인하세요. ① 형식: PDF만 지원합니다. ② 크기: 파일 한 개당 50MB 이하. ③ 파일명: 특수문자(!, @, #, & 등)가 있으면 영문·숫자·한글로 변경 후 재시도하세요.",
          },
          {
            q: "화면이 흰색만 보이거나 버튼이 반응하지 않습니다.",
            a: "브라우저 캐시를 삭제하세요. Chrome 기준: 주소창에 chrome://settings/clearBrowserData 입력 → '캐시된 이미지 및 파일' 체크 → '데이터 삭제'. 이후 재접속하면 대부분 해결됩니다.",
          },
          {
            q: "지식 검색 결과가 없거나 관련 없는 내용이 나옵니다.",
            a: "짧은 키워드보다 구체적인 질문 문장으로 검색하세요. 예: '케이블' → 'XLPE 케이블 PD 시험 합격 기준'. 그래도 없으면 해당 주제가 현재 지식베이스에 없는 것입니다. 피드백으로 추가를 요청해 주세요.",
          },
          {
            q: "NCR 카드에 빨간 경고가 표시됩니다.",
            a: "처리 기한(목표 조치일)이 지난 NCR에 자동으로 '기한 초과' 경고가 표시됩니다. 상세 페이지에서 조치 내역을 업데이트하고 다음 단계로 이동하거나 목표일을 수정하세요.",
          },
        ],
      },
    ],
  },
  {
    id: "troubleshooting",
    title: "오류 유형별 대처법",
    content: [
      {
        type: "table",
        headers: ["증상", "가능한 원인", "해결 방법"],
        rows: [
          ["로그인 후 '승인 대기' 화면 표시", "관리자 미승인", "관리자(doosung71@gmail.com)에게 승인 요청"],
          ["검사 등록/수정 저장 후 화면 그대로", "서버 응답 대기", "잠시 후 새로고침 — 저장은 완료된 상태"],
          ["클레임/NCR 상세 페이지 Not Found", "잘못된 URL 또는 삭제된 데이터", "목록 페이지로 돌아가서 다시 클릭"],
          ["버튼 클릭 시 아무 반응 없음", "브라우저 오류 또는 세션 만료", "F5 새로고침 또는 재로그인"],
          ["'분석 실패' 오류 메시지", "파일 형식 오류 또는 서버 과부하", "PDF 형식 확인 후 1~2분 뒤 재시도"],
          ["화면 무한 로딩", "네트워크 불안정", "인터넷 연결 확인 후 재접속"],
          ["'권한이 없습니다' 메시지", "세션 만료 또는 역할 미설정", "로그아웃 후 재로그인, 지속 시 관리자 문의"],
          ["파일 업로드 용량 초과 메시지", "50MB 한도 초과", "파일 압축 또는 분할 업로드 시도"],
        ],
      },
      { type: "tip", text: "위 방법으로 해결되지 않으면 피드백 게시판에 오류 메시지와 화면 캡처를 함께 남겨주세요. 빠르게 확인하겠습니다." },
    ],
  },
]

// ─── 역할별 섹션 ─────────────────────────────────────────
const SECTIONS = {
  PRACTITIONER: [
    {
      id: "inspection",
      title: "1. 검사 업무 — 수입검사 · 출장검사 · 협력업체 감사",
      content: [
        { type: "p", text: "현장 검사 결과를 직접 등록·수정·삭제합니다. 수입검사, 출장검사, 협력업체 감사 3가지 유형이 각각 별도 메뉴로 운영됩니다." },
        {
          type: "table",
          headers: ["메뉴", "경로", "주요 내용"],
          rows: [
            ["수입검사", "검사 업무 → 수입검사", "납품 자재·부품 입고 시 검사 결과 기록"],
            ["출장검사", "검사 업무 → 출장검사", "협력업체 현장 방문 검사 기록"],
            ["협력업체 감사", "검사 업무 → 협력업체 감사", "공급망 감사 계획·결과·조치 이력"],
          ],
        },
        { type: "h3", text: "검사 결과 등록" },
        {
          type: "steps",
          items: [
            "왼쪽 메뉴 '검사 업무' 아래 해당 검사 유형을 클릭합니다.",
            "오른쪽 상단 '+ 신규 등록' 버튼을 클릭합니다.",
            "검사 일자, 검사자, 대상(업체·품목), 결과(합격/불합격/조건부합격), 비고를 입력합니다.",
            "'등록' 버튼을 클릭하면 즉시 목록에 반영됩니다.",
          ],
        },
        { type: "h3", text: "검사 결과 수정·삭제" },
        {
          type: "steps",
          items: [
            "목록에서 수정할 검사 행을 클릭합니다.",
            "상세 Drawer(오른쪽 패널)에서 수정 버튼을 클릭해 내용을 변경합니다.",
            "삭제가 필요하면 삭제 버튼 클릭 후 확인 팝업에서 '삭제'를 선택합니다.",
          ],
        },
        { type: "warn", text: "현재 검사 데이터는 샘플 데이터입니다. 실제 검사 결과를 등록해도 무방하나, PoC 단계에서는 테스트 데이터 위주로 사용하세요." },
        {
          type: "checklist",
          title: "피드백 포인트",
          items: [
            "검사 결과 등록 폼에 추가로 필요한 입력 항목이 있나요?",
            "목록 화면에서 필터·정렬 기능이 필요한가요? (예: 날짜 범위, 검사 결과별)",
            "검사 기록을 엑셀로 내보내는 기능이 필요한가요?",
          ],
        },
      ],
    },
    {
      id: "claims",
      title: "2. 고객 클레임 — 접수부터 종결까지",
      content: [
        { type: "p", text: "고객 클레임을 5단계 칸반 보드로 관리합니다. 카드를 클릭하면 상세 페이지로 이동해 내용 수정, 단계 이동, 처리 이력 추가, 종결 처리를 할 수 있습니다." },
        {
          type: "table",
          headers: ["단계", "의미"],
          rows: [
            ["접수", "클레임 신규 접수, 내용 확인 중"],
            ["조사", "원인 분석 및 현장 조사 중"],
            ["대책", "재발방지 대책 수립 중"],
            ["검증", "대책 적용 후 효과 검증 중"],
            ["클로징", "처리 완료 및 고객 회신 완료"],
          ],
        },
        { type: "h3", text: "새 클레임 등록" },
        {
          type: "steps",
          items: [
            "왼쪽 메뉴 '품질 이슈 → 고객 클레임'을 클릭합니다.",
            "오른쪽 상단 '+ 신규 클레임' 버튼을 클릭합니다.",
            "제목, 고객사, 우선순위, 담당자, 내용을 입력하고 등록합니다.",
            "등록 즉시 칸반 '접수' 열에 카드가 생성됩니다.",
          ],
        },
        { type: "h3", text: "클레임 상세 처리 (단계 이동·이력 추가)" },
        {
          type: "steps",
          items: [
            "칸반 보드에서 처리할 클레임 카드를 클릭합니다.",
            "상세 페이지에서 제목·담당자·우선순위 등을 인라인으로 직접 수정합니다.",
            "하단 '다음 →' 버튼으로 다음 처리 단계로 이동합니다. '← 이전'으로 단계를 되돌릴 수 있습니다.",
            "'처리 이력 추가' 입력창에 현재까지의 조치 내용을 입력하고 '추가'를 클릭합니다.",
            "모든 처리가 완료되면 '종결 처리' 버튼으로 Closed 상태로 변경합니다.",
          ],
        },
        { type: "tip", text: "처리 이력은 시간 순으로 자동 정렬되어 전체 대응 히스토리를 한눈에 볼 수 있습니다." },
        {
          type: "checklist",
          title: "피드백 포인트",
          items: [
            "단계 이동 방식(버튼 클릭)이 직관적인가요? 드래그 방식이 더 편리한가요?",
            "클레임 상세 페이지에서 추가로 필요한 정보가 있나요?",
            "처리 이력에 사진·파일 첨부 기능이 필요한가요?",
          ],
        },
      ],
    },
    {
      id: "ncr",
      title: "3. 부적합품보고(NCR) — 발행부터 종결까지",
      content: [
        { type: "p", text: "부적합품 발생 시 NCR을 발행하고, 처리방안·시정조치·효과검증 단계를 거쳐 종결합니다. 처리 기한이 지난 NCR에는 빨간 경고 배지가 자동으로 표시됩니다." },
        {
          type: "table",
          headers: ["단계", "의미"],
          rows: [
            ["Open", "NCR 발행, 초기 확인 중"],
            ["Under Review", "원인 분석 및 처리방안 수립 중"],
            ["Corrective Action", "시정조치 실행 중"],
            ["Verification", "조치 효과 검증 중"],
            ["Closed", "종결 완료"],
          ],
        },
        { type: "h3", text: "NCR 발행" },
        {
          type: "steps",
          items: [
            "왼쪽 메뉴 '품질 이슈 → 부적합품보고(NCR)'을 클릭합니다.",
            "오른쪽 상단 '+ NCR 발행' 버튼을 클릭합니다.",
            "발생 원인, 심각도(Critical/Major/Minor), 담당자, 목표 조치일을 입력합니다.",
            "등록 즉시 칸반 'Open' 열에 카드가 생성됩니다.",
          ],
        },
        { type: "h3", text: "NCR 처리 진행 (상세 페이지)" },
        {
          type: "steps",
          items: [
            "칸반 보드에서 처리할 NCR 카드를 클릭합니다.",
            "상세 페이지에서 발생 원인, 처리방안, 담당자, 목표 조치일을 수정합니다.",
            "하단 '다음 →' 버튼으로 처리 단계를 진행합니다.",
            "'처리 이력 추가' 입력창에 조치 내용을 입력하고 '추가'를 클릭합니다.",
            "효과 검증이 완료되면 '종결 처리' 버튼으로 Closed 상태로 변경합니다.",
          ],
        },
        {
          type: "warn",
          text: "목표 조치일이 지난 NCR에는 자동으로 빨간 '기한 초과' 배지가 표시됩니다. 상세 페이지에서 목표 조치일을 업데이트하거나 단계를 진행해 경고를 해제하세요.",
        },
        {
          type: "checklist",
          title: "피드백 포인트",
          items: [
            "NCR 심각도(Critical/Major/Minor) 구분이 실무에 맞나요?",
            "처리 이력 추가 방식이 편리한가요?",
            "NCR 처리 현황을 담당자별·월별로 집계하는 통계 화면이 필요한가요?",
          ],
        },
      ],
    },
    {
      id: "tra",
      title: "4. 입찰검토시스템 — AI 독소조항 분석",
      content: [
        { type: "p", text: "입찰 시방서(PDF)를 업로드하면 AI가 독소 조항, 기술 리스크, 누락 항목을 자동 분석합니다. 분석 결과는 Draft 초안으로 생성되며, 반드시 직접 검토 후 사용합니다." },
        { type: "warn", text: "파일 형식: PDF만 지원합니다. 스캔 이미지 PDF(텍스트 레이어 없음)는 분석 결과가 0건이 될 수 있습니다. 반드시 텍스트가 포함된 PDF를 사용하세요." },
        { type: "h3", text: "새 입찰 분석 시작" },
        {
          type: "steps",
          items: [
            "왼쪽 메뉴 '프로젝트 → 입찰 검토'를 클릭합니다.",
            "오른쪽 상단 '+ 새 입찰 검토 시작' 버튼을 클릭합니다.",
            "프로젝트명, 고객사, 입찰 유형을 입력합니다.",
            "시방서 파일(PDF, 최대 50MB)을 업로드합니다.",
            "'AI 분석 시작' 버튼을 클릭합니다. 파일 크기에 따라 30초~5분이 소요됩니다. 분석 중에는 절대 새로고침(F5)하지 마세요.",
            "분석 완료 후 '독소조항', '기술리스크', '누락항목' 3개 섹션으로 결과를 확인합니다.",
          ],
        },
        { type: "h3", text: "분석 결과 검토 후 팀장 상신" },
        {
          type: "steps",
          items: [
            "AI 분석 항목을 직접 검토하고 필요시 내용을 수정합니다.",
            "'검토 요청' 버튼을 클릭하면 팀장에게 1차 검토 요청이 상신됩니다.",
            "팀장이 반려하면 반려 사유를 확인하고 내용을 수정해 재상신합니다.",
          ],
        },
        { type: "tip", text: "RAG 배지(📚)가 표시된 분석 항목은 내부 IEC/KS 규격 지식베이스를 참조한 결과입니다. 더 신뢰도가 높지만 최종 판단은 반드시 사람이 해야 합니다." },
        {
          type: "checklist",
          title: "피드백 포인트",
          items: [
            "분석 결과의 정확도는 어느 정도였나요? (정확 / 부분 맞음 / 엉뚱한 결과)",
            "독소조항·기술리스크·누락항목 중 어떤 카테고리가 가장 유용했나요?",
            "분석 속도가 허용 가능한 수준이었나요?",
          ],
        },
      ],
    },
    {
      id: "knowledge",
      title: "5. 지식저장소(QKM) — 규격 자연어 검색",
      content: [
        { type: "p", text: "IEC·KS·CIGRE 규격과 내부 기술 노트를 자연어로 검색합니다. 합격 판정 기준, 시험 방법, 규격 해석을 별도 문서 검색 없이 바로 확인할 수 있습니다." },
        {
          type: "steps",
          items: [
            "왼쪽 메뉴 '품질 지식'을 클릭합니다.",
            "검색창에 질문을 자연어로 입력합니다.",
            "Enter 또는 검색 버튼을 클릭합니다.",
            "답변 하단의 '출처' 정보로 원문 규격을 직접 확인할 수 있습니다.",
          ],
        },
        {
          type: "table",
          headers: ["질문 예시", "활용 상황"],
          rows: [
            ["초고압 XLPE 케이블 PD 측정 합격 기준은?", "시험 합격 기준 확인"],
            ["IEC 60840 임펄스 시험 방법 요약해줘", "시험 절차 빠른 확인"],
            ["해저케이블 굽힘 반경 계산 방법은?", "설계 기준 확인"],
          ],
        },
        { type: "tip", text: "짧은 키워드보다 구체적인 문장으로 검색할수록 더 정확한 결과가 나옵니다." },
      ],
    },
  ] as SectionItem[],

  TEAM_LEAD: [
    {
      id: "overview-tl",
      title: "1. 팀장 역할 개요",
      content: [
        { type: "p", text: "팀장은 실무자가 상신한 입찰 검토 Draft를 1차 검토·승인하고, 팀 단위 클레임·NCR·검사 현황을 모니터링합니다." },
        {
          type: "table",
          headers: ["메뉴 그룹", "팀장 권한"],
          rows: [
            ["검사 업무 (수입·출장·협력업체 감사)", "전체 조회 + 상세 확인"],
            ["품질 이슈 (클레임·NCR)", "전체 조회 + 단계 이동 + 처리 이력 확인"],
            ["프로젝트 → 입찰 검토", "실무자 Draft 1차 검토·승인·반려"],
            ["품질 지식", "전체 이용"],
            ["시험 장비", "전체 조회"],
            ["외부 정보", "수집 동향 + 실시간 웹검색"],
          ],
        },
      ],
    },
    {
      id: "inspection-tl",
      title: "2. 검사 업무 모니터링",
      content: [
        { type: "p", text: "수입검사·출장검사·협력업체 감사 결과를 팀 단위로 확인합니다." },
        {
          type: "steps",
          items: [
            "왼쪽 메뉴 '검사 업무' 아래 해당 검사 유형을 클릭합니다.",
            "목록에서 날짜·검사자·결과 필터로 현황을 파악합니다.",
            "특정 검사 기록을 클릭하면 상세 내역을 확인할 수 있습니다.",
          ],
        },
        {
          type: "checklist",
          title: "피드백 포인트",
          items: [
            "팀장이 주로 보는 검사 현황 지표가 있나요? (예: 이번 달 불합격 건수 집계)",
            "검사 기록 검색·필터 기능이 필요한가요?",
          ],
        },
      ],
    },
    {
      id: "claims-tl",
      title: "3. 클레임·NCR 현황",
      content: [
        { type: "p", text: "클레임 처리 현황을 팀 단위로 모니터링합니다. 장기 미처리 건을 파악하고 병목을 제거합니다." },
        {
          type: "table",
          headers: ["KPI 카드", "의미", "위치"],
          rows: [
            ["미클로징 건수", "현재 처리 중인 전체 클레임 수", "클레임 페이지 상단"],
            ["평균 처리 일수", "접수~클로징까지 평균 소요 일수", "클레임 페이지 상단"],
            ["30일 초과 건", "한 달 이상 미클로징 건 수 (긴급)", "클레임 페이지 상단"],
          ],
        },
        {
          type: "steps",
          items: [
            "상단 KPI 카드로 전체 현황을 파악합니다.",
            "30일 초과 건이 있으면 해당 카드 클릭 → 상세 페이지에서 담당자 확인 후 조치를 요청합니다.",
            "NCR 메뉴에서 기한 초과(Overdue) 배지 건을 우선 확인합니다.",
          ],
        },
        { type: "tip", text: "클레임 카드 상세 페이지에서 처리 이력을 확인하면 어느 단계에서 지연됐는지 파악할 수 있습니다." },
        {
          type: "checklist",
          title: "피드백 포인트",
          items: [
            "팀장이 일상적으로 모니터링하기에 화면이 충분히 간결한가요?",
            "팀원별 담당 클레임/NCR 필터가 있으면 유용할까요?",
          ],
        },
      ],
    },
    {
      id: "tra-tl",
      title: "4. 입찰검토시스템 — 1차 검토·승인",
      content: [
        { type: "p", text: "실무자가 AI 분석 후 상신한 입찰 Draft를 검토하고 승인 또는 반려합니다." },
        {
          type: "steps",
          items: [
            "왼쪽 메뉴 '프로젝트 → 입찰 검토'를 클릭합니다.",
            "목록에서 상태가 '검토 요청'인 건을 클릭합니다.",
            "AI 분석 내용(독소 조항·기술 리스크·누락 항목)을 항목별로 검토합니다.",
            "내용이 적절하면 '1차 승인' 버튼을 클릭합니다.",
            "수정이 필요하면 '반려' 버튼과 함께 사유를 입력합니다.",
          ],
        },
        {
          type: "table",
          headers: ["상태", "의미", "다음 단계"],
          rows: [
            ["초안(Draft)", "실무자 작성 중", "실무자가 검토 요청 상신"],
            ["검토 요청", "팀장 검토 대기", "팀장이 승인 또는 반려"],
            ["1차 승인", "팀장 승인 완료", "부문장 최종 승인 대기"],
            ["반려", "팀장이 반려", "실무자에게 반환, 수정 후 재상신"],
            ["최종 승인", "부문장 승인 완료", "영업팀 전달 가능 상태"],
          ],
        },
      ],
    },
    {
      id: "intelligence-tl",
      title: "5. 외부 정보",
      content: [
        { type: "p", text: "시장·기술·경쟁사 동향을 모니터링하고, 실시간 외부 웹 검색을 실행합니다." },
        {
          type: "steps",
          items: [
            "왼쪽 메뉴 '외부 정보'를 클릭합니다.",
            "'수집 동향' 탭: 사전 수집된 시장·기술·경쟁사 동향 카드를 필터·검색합니다.",
            "'외부 웹 검색' 탭: 검색창에 질문을 입력하면 최신 웹 정보를 최대 8건 실시간 검색합니다.",
          ],
        },
        { type: "tip", text: "웹 검색 예시: 'Prysmian HVDC 해저케이블 수주 2026', 'IEC 62067 개정안 최신 동향'" },
      ],
    },
  ] as SectionItem[],

  DIRECTOR: [
    {
      id: "overview-dir",
      title: "1. 부문장 역할 개요",
      content: [
        { type: "p", text: "부문장 대시보드는 품질부문 전체 현황을 한 화면에서 확인하고, 입찰 검토의 최종 승인권을 가집니다." },
        {
          type: "table",
          headers: ["메뉴 그룹", "부문장 권한"],
          rows: [
            ["메인 대시보드", "전체 KPI 요약 화면"],
            ["검사 업무 (수입·출장·협력업체 감사)", "전체 조회"],
            ["품질 이슈 (클레임·NCR)", "전체 조회 + 처리 이력 확인"],
            ["프로젝트 → 입찰 검토", "최종 승인·반려"],
            ["품질 지식", "전체 이용"],
            ["시험 장비·자산", "전체 조회"],
            ["외부 정보", "수집 동향 + 실시간 웹검색"],
            ["인사·면담", "팀원 면담 이력 및 현황 조회"],
            ["사용자 관리", "가입 승인·역할 부여·비밀번호 초기화"],
          ],
        },
      ],
    },
    {
      id: "dashboard-dir",
      title: "2. 메인 대시보드 읽는 법",
      content: [
        { type: "p", text: "로그인 후 메인 대시보드에서 5개 영역의 핵심 KPI를 한눈에 확인합니다." },
        {
          type: "table",
          headers: ["카드", "카드명", "확인 항목"],
          rows: [
            ["①", "Q-Cost", "당월 품질비용 총액, 실패비용/예방비용 비율"],
            ["②", "고객 클레임", "미클로징 건수, 평균 처리일, 30일 초과 건"],
            ["③", "NCR 부적합", "미조치 NCR 건수, Overdue 건수"],
            ["④", "공급망관리", "C·D등급 협력업체 수 (리스크 업체)"],
            ["⑤", "시험장·시험 현황", "가동 중 시험 건수, 노후 설비 수"],
          ],
        },
        {
          type: "steps",
          items: [
            "메인 대시보드에서 각 영역 카드를 훑어봅니다.",
            "빨간색 또는 노란색 수치가 있는 카드를 우선 확인합니다.",
            "카드 클릭으로 해당 영역 상세 화면으로 바로 이동합니다.",
            "실무자 퀵링크 섹션에서 주요 기능으로 바로 이동할 수 있습니다.",
          ],
        },
        { type: "tip", text: "신호등 체계: 🟢 정상 · 🟡 주의 · 🔴 이상. 각 영역 카드에 신호등 아이콘이 표시됩니다." },
      ],
    },
    {
      id: "claims-dir",
      title: "3. 클레임·NCR 현황",
      content: [
        { type: "p", text: "전사 고객 클레임·NCR 현황을 확인하고 장기 미처리 건을 파악합니다." },
        {
          type: "steps",
          items: [
            "품질 이슈 → 고객 클레임에서 30일 초과 미클로징 건을 파악합니다.",
            "품질 이슈 → NCR에서 기한 초과(빨간 배지) 건을 우선 확인합니다.",
            "카드 클릭 → 상세 페이지에서 처리 이력 전체를 확인하고 담당자에게 조치 지시합니다.",
          ],
        },
        { type: "tip", text: "NCR 상세 페이지에서는 처리 이력, 현재 단계, 목표 조치일을 한눈에 볼 수 있습니다." },
      ],
    },
    {
      id: "vendors-dir",
      title: "4. 공급망관리·인사·외부 정보",
      content: [
        { type: "p", text: "공급망(협력업체) SRM 현황, 인사·면담 현황, 경쟁사·시장 동향 및 실시간 웹 검색을 확인합니다." },
        { type: "h3", text: "공급망관리" },
        {
          type: "steps",
          items: [
            "'공급망관리' 메뉴에서 C·D등급 업체를 파악합니다.",
            "카드 클릭으로 상세 Drawer를 열어 최근 감사 이력과 품질 지표를 확인합니다.",
          ],
        },
        { type: "h3", text: "인사·면담" },
        {
          type: "steps",
          items: [
            "'인사·면담' 메뉴에서 팀원 기본사항과 면담 이력을 확인합니다.",
            "면담 이력 탭에서 최근 면담일과 다음 예정일을 파악합니다.",
          ],
        },
        { type: "h3", text: "외부 정보" },
        {
          type: "steps",
          items: [
            "'외부 정보' 메뉴를 클릭합니다.",
            "'수집 동향' 탭: 사전 수집된 시장·기술·경쟁사 동향 카드를 확인합니다.",
            "'외부 웹 검색' 탭: 검색창에 질문을 입력하면 실시간 외부 웹 정보를 최대 8건 검색합니다.",
          ],
        },
        { type: "tip", text: "웹 검색 예시: 'Prysmian 2026 해저케이블 수주', 'IEC 62067 개정 동향'" },
      ],
    },
    {
      id: "tra-dir",
      title: "5. 입찰검토시스템 — 최종 승인",
      content: [
        { type: "p", text: "팀장 1차 검토를 통과한 입찰 분석 결과를 최종 승인합니다. 최종 승인 후 영업팀 전달 가능 상태가 됩니다." },
        {
          type: "steps",
          items: [
            "왼쪽 메뉴 '프로젝트 → 입찰 검토'를 클릭합니다.",
            "목록에서 상태가 '최종 승인 대기'인 건을 클릭합니다.",
            "AI 분석 내용 전체와 팀장 검토 의견을 확인합니다.",
            "부문장 메모(선택)를 입력하고 '최종 승인' 또는 '반려' 버튼을 클릭합니다.",
          ],
        },
        { type: "warn", text: "최종 승인 이후에는 수정이 제한됩니다. 충분히 검토한 후 승인하세요." },
      ],
    },
    {
      id: "admin-dir",
      title: "6. 사용자 관리",
      content: [
        { type: "p", text: "팀원 가입 신청을 승인하고 역할을 부여합니다. 비밀번호 초기화도 이 화면에서 처리합니다." },
        {
          type: "steps",
          items: [
            "왼쪽 사이드바 하단 '사용자 관리'를 클릭합니다.",
            "상태가 'PENDING(대기)'인 신청자를 확인합니다.",
            "역할 드롭다운에서 실무자 / 팀장 / 임원을 선택합니다.",
            "'승인' 버튼을 클릭하면 해당 사용자가 로그인할 수 있게 됩니다.",
          ],
        },
        { type: "h3", text: "비밀번호 초기화" },
        {
          type: "steps",
          items: [
            "해당 사용자 행에서 'PW초기화' 버튼을 클릭합니다.",
            "확인 팝업에서 '확인'을 클릭합니다.",
            "화면에 임시 비밀번호(예: QMS-A3K7M2)가 표시됩니다. '복사' 버튼으로 복사 후 사용자에게 전달합니다.",
            "사용자는 로그인 후 프로필 → 비밀번호 변경에서 새 비밀번호로 교체해야 합니다.",
          ],
        },
        { type: "warn", text: "역할 변경 후 해당 사용자는 재로그인해야 변경된 권한이 적용됩니다." },
      ],
    },
  ] as SectionItem[],
} as const

type Role = keyof typeof SECTIONS

// ADMIN 역할은 DIRECTOR 뷰로 폴백
const ROLE_FALLBACK: Record<string, keyof typeof SECTIONS> = {
  ADMIN: "DIRECTOR",
}

// ─── 렌더러 ─────────────────────────────────────────────
function renderBlock(block: ContentBlock, i: number) {
  switch (block.type) {
    case "p":
      return <p key={i} className="text-sm text-zinc-600 leading-relaxed">{block.text}</p>
    case "h3":
      return <h3 key={i} className="text-sm font-semibold text-zinc-800 pt-1">{block.text}</h3>
    case "tip":
      return (
        <div key={i} className="text-sm bg-blue-50 border-l-4 border-blue-400 px-4 py-2.5 rounded-r text-blue-800">
          <span className="font-semibold">TIP · </span>{block.text}
        </div>
      )
    case "warn":
      return (
        <div key={i} className="text-sm bg-amber-50 border-l-4 border-amber-400 px-4 py-2.5 rounded-r text-amber-800">
          <span className="font-semibold">주의 · </span>{block.text}
        </div>
      )
    case "poc":
      return (
        <div key={i} className="text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-800 font-medium">
          🚧 PoC(개념증명) 시스템 — 샘플 데이터, 미완성 기능 포함. 실제 업무 데이터 입력 금지.
        </div>
      )
    case "steps":
      return (
        <ol key={i} className="space-y-2">
          {block.items.map((step, j) => (
            <li key={j} className="flex gap-3 text-sm text-zinc-700">
              <span className="shrink-0 w-5 h-5 rounded-full bg-zinc-800 text-white text-xs flex items-center justify-center font-bold mt-0.5">
                {j + 1}
              </span>
              <span className="leading-relaxed">{step}</span>
            </li>
          ))}
        </ol>
      )
    case "table":
      return (
        <div key={i} className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-zinc-100">
                {block.headers.map((h, j) => (
                  <th key={j} className="px-3 py-2 text-left font-semibold text-zinc-700 border border-zinc-200 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, j) => (
                <tr key={j} className={j % 2 === 1 ? "bg-zinc-50" : ""}>
                  {row.map((cell, k) => (
                    <td key={k} className="px-3 py-2 border border-zinc-200 text-zinc-600">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    case "checklist":
      return (
        <div key={i} className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 space-y-2">
          <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">{block.title}</p>
          <ul className="space-y-1.5">
            {block.items.map((item, j) => (
              <li key={j} className="flex gap-2 text-sm text-emerald-800">
                <span className="shrink-0 mt-0.5">□</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )
    case "faq":
      return (
        <dl key={i} className="space-y-4">
          {block.items.map((item, j) => (
            <div key={j} className="border-b border-zinc-100 pb-4 last:border-0 last:pb-0">
              <dt className="text-sm font-semibold text-zinc-800 mb-1.5">Q. {item.q}</dt>
              <dd className="text-sm text-zinc-600 leading-relaxed pl-4 border-l-2 border-zinc-200 ml-1">→ {item.a}</dd>
            </div>
          ))}
        </dl>
      )
    default:
      return null
  }
}

function GuideSection({ section }: { section: SectionItem }) {
  return (
    <article id={section.id} className="scroll-mt-6 bg-white border rounded-xl p-6 space-y-4">
      <h2 className="text-base font-semibold text-zinc-900 pb-3 border-b">{section.title}</h2>
      {section.content.map((block, i) => renderBlock(block, i))}
    </article>
  )
}

const ROLE_LABEL: Record<Role, string> = {
  PRACTITIONER: "실무자",
  TEAM_LEAD: "팀장",
  DIRECTOR: "부문장",
}

const ROLE_COLOR: Record<Role, string> = {
  PRACTITIONER: "bg-blue-100 text-blue-700",
  TEAM_LEAD: "bg-green-100 text-green-700",
  DIRECTOR: "bg-purple-100 text-purple-700",
}

export default async function HelpPage() {
  const session = await requireActivePageSession()
  const rawRole = session.user.role as string
  const role: Role = (SECTIONS as Record<string, SectionItem[]>)[rawRole]
    ? (rawRole as Role)
    : (ROLE_FALLBACK[rawRole] ?? null as unknown as Role)

  if (!role) redirect("/")

  const sections = SECTIONS[role] as unknown as SectionItem[]
  const allSections = [...COMMON_TOP, ...sections, ...COMMON_BOTTOM]

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="bg-white border-b px-6 py-3 flex items-center justify-between">
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-800">← 대시보드</Link>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${ROLE_COLOR[role]}`}>
          {ROLE_LABEL[role]} 가이드
        </span>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-zinc-900">사용 가이드</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {ROLE_LABEL[role]} 역할에서 활용하는 주요 기능 안내입니다. (E2E-1 검증 단계 · 2026년 6월)
          </p>
        </div>

        <nav className="bg-white border rounded-xl p-4 mb-6">
          <p className="text-xs font-semibold text-zinc-400 mb-3 uppercase tracking-wide">목차</p>
          <ul className="space-y-1">
            {allSections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="text-sm text-zinc-600 hover:text-zinc-900 hover:underline">
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-4">
          {allSections.map((section) => (
            <GuideSection key={section.id} section={section} />
          ))}
        </div>

        <div className="mt-8 bg-white border rounded-xl p-5 text-sm text-zinc-600 space-y-1">
          <p className="font-semibold text-zinc-800">문의 · 긴급 연락</p>
          <p>관리자: 신두성 (품질부문장)</p>
          <p>이메일: doosung71@gmail.com</p>
          <p className="text-xs text-zinc-400 mt-2">다른 역할의 가이드가 필요하면 관리자에게 문의하세요.</p>
        </div>
      </div>
    </div>
  )
}
