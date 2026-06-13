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

// ─── 공통 상단 섹션 ───────────────────────────────────────
const COMMON_TOP: SectionItem[] = [
  {
    id: "poc-notice",
    title: "⚠️ 먼저 읽어주세요 — PoC 시스템 안내",
    content: [
      { type: "poc" },
      { type: "p", text: "이 시스템은 QMS 2.0 정식 도입 전 개념 증명(PoC) 단계로, 현재 품질부문 전원이 참여하는 E2E-1 실사용 검증이 진행 중입니다. 여러분의 피드백이 시스템 개선에 직접 반영됩니다." },
      {
        type: "table",
        headers: ["항목", "현재 상태", "의미"],
        rows: [
          ["대시보드 KPI", "일부 샘플 데이터", "실제 ERP·현장 연동 전 상태"],
          ["고객 클레임 / NCR", "실제 등록 가능", "등록한 데이터는 실제 DB에 저장됩니다"],
          ["검사 기록 (수입·출장·QPA·입회검사)", "실제 등록 가능", "등록한 데이터는 실제 DB에 저장됩니다"],
          ["AI 분석 결과", "Draft (초안)", "반드시 직접 검토 후 활용하세요"],
          ["계정·이력 데이터", "실제 저장", "가입 정보·업무 이력은 실제 DB에 저장됩니다"],
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
          "브라우저에서 quality-dashboard-flax.vercel.app/register 로 접속합니다.",
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
          "로그인 시 온보딩 가이드 팝업이 자동으로 표시됩니다.",
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
      { type: "tip", text: "로그인 후 헤더 오른쪽 상단 프로필 아이콘 → '내 프로필'에서 비밀번호와 닉네임을 언제든지 변경할 수 있습니다." },
    ],
  },
]

// ─── 공통 하단 섹션 ───────────────────────────────────────
const COMMON_BOTTOM: SectionItem[] = [
  {
    id: "feedback-how",
    title: "피드백 남기는 방법",
    content: [
      { type: "p", text: "이 시스템은 여러분의 피드백으로 개선됩니다. 불편한 점, 빠진 기능, 버그를 적극적으로 남겨주세요." },
      {
        type: "steps",
        items: [
          "왼쪽 사이드바 하단 '소통 채널 → 피드백' 메뉴를 클릭합니다.",
          "내용을 입력합니다. 이미지를 붙여넣기(Ctrl+V)하거나 파일을 첨부하면 더욱 빠른 처리가 가능합니다.",
          "'등록' 버튼을 클릭하면 관리자에게 바로 전달됩니다.",
        ],
      },
      {
        type: "checklist",
        title: "이런 피드백이 특히 도움됩니다",
        items: [
          "어디서 막혔는지 구체적으로 (예: '수입검사 등록 버튼을 눌렀는데 저장이 안 됐다')",
          "화면이 깨지거나 오류 메시지가 떴을 때 스크린샷 (Ctrl+V로 바로 첨부 가능)",
          "실무에서 꼭 필요한데 없는 기능 (예: '검사 결과 엑셀 내보내기가 필요하다')",
          "용어나 절차가 실무와 맞지 않는 부분",
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
            a: "두 가지 경우가 있습니다. ① 관리자 승인 전 — 가입 후 관리자 승인이 완료되어야 로그인할 수 있습니다. ② 비밀번호 오류 — 자동 이메일 발송은 미지원입니다. 관리자에게 임시 비밀번호 발급을 요청하세요.",
          },
          {
            q: "등록한 데이터가 목록에 바로 나타나지 않습니다.",
            a: "페이지를 새로고침(F5)하거나 다른 메뉴를 갔다가 돌아오면 새로 등록된 데이터가 표시됩니다. 저장은 즉시 완료된 상태입니다.",
          },
          {
            q: "상세 페이지에서 수정이 안 됩니다.",
            a: "인라인 편집 필드를 클릭하면 수정 모드가 활성화됩니다. 수정 후 필드 바깥을 클릭하거나 엔터를 눌러야 저장됩니다. 종결(Closed) 상태는 수정이 불가합니다.",
          },
          {
            q: "AI 분석이 멈추거나 너무 오래 걸립니다.",
            a: "파일 크기에 따라 최대 5분까지 소요됩니다. '분석 중...' 스피너가 표시되면 정상 진행 중입니다. 절대 새로고침(F5)하지 마세요. 5분 이상 응답이 없으면 피드백 게시판에 알려주세요.",
          },
          {
            q: "파일 업로드가 실패합니다.",
            a: "세 가지를 확인하세요. ① 형식: 입찰 분석은 PDF만 지원, 첨부파일은 이미지·PDF·Office 형식 지원. ② 크기: 파일 한 개당 10MB 이하(입찰 분석 시방서는 50MB). ③ 파일명: 특수문자(!, @, #, & 등)가 있으면 영문·숫자·한글로 변경 후 재시도하세요.",
          },
          {
            q: "화면이 흰색만 보이거나 버튼이 반응하지 않습니다.",
            a: "브라우저 캐시를 삭제하세요. Chrome 기준: 주소창에 chrome://settings/clearBrowserData 입력 → '캐시된 이미지 및 파일' 체크 → '데이터 삭제'. 이후 재접속하면 대부분 해결됩니다.",
          },
          {
            q: "NCR / 클레임 카드에 빨간 경고가 표시됩니다.",
            a: "처리 기한(목표 조치일)이 지난 항목에 자동으로 '기한 초과' 경고가 표시됩니다. 상세 페이지에서 조치 내역을 업데이트하거나 목표일을 수정하세요.",
          },
          {
            q: "입회검사 .ics 파일이 뭔가요?",
            a: "캘린더 파일입니다. 다운로드 후 더블클릭하면 Outlook·Google 캘린더 등에 자동으로 검사 일정이 등록됩니다.",
          },
          {
            q: "지식 검색 결과가 없거나 관련 없는 내용이 나옵니다.",
            a: "짧은 키워드보다 구체적인 질문 문장으로 검색하세요. 예: '케이블' → 'XLPE 케이블 PD 시험 합격 기준'. 그래도 없으면 해당 주제가 현재 지식베이스에 없는 것입니다. 피드백으로 추가를 요청해 주세요.",
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
          ["등록·수정 저장 후 화면 그대로", "서버 응답 대기", "잠시 후 새로고침 — 저장은 완료된 상태"],
          ["상세 페이지 Not Found", "잘못된 URL 또는 삭제된 데이터", "목록 페이지로 돌아가서 다시 클릭"],
          ["버튼 클릭 시 아무 반응 없음", "브라우저 오류 또는 세션 만료", "F5 새로고침 또는 재로그인"],
          ["'분석 실패' 오류 메시지", "파일 형식 오류 또는 서버 과부하", "PDF 형식 확인 후 1~2분 뒤 재시도"],
          ["화면 무한 로딩", "네트워크 불안정", "인터넷 연결 확인 후 재접속"],
          ["'권한이 없습니다' 메시지", "세션 만료 또는 역할 미설정", "로그아웃 후 재로그인, 지속 시 관리자 문의"],
          ["파일 업로드 용량 초과 메시지", "용량 한도 초과", "파일 압축 또는 분할 후 재시도"],
        ],
      },
      { type: "tip", text: "위 방법으로 해결되지 않으면 사이드바 하단 '피드백' 메뉴에서 오류 메시지와 화면 캡처를 함께 남겨주세요." },
    ],
  },
]

// ─── 역할별 섹션 ─────────────────────────────────────────
const SECTIONS = {
  PRACTITIONER: [
    {
      id: "my-job",
      title: "1. 내 할 일 & 회의록",
      content: [
        { type: "p", text: "회의에서 내가 담당으로 지정된 액션 아이템을 확인하고, 회의 결과를 직접 등록합니다." },
        { type: "h3", text: "내 할 일 확인 — 사이드바 하단 '내 할 일'" },
        {
          type: "table",
          headers: ["섹션", "의미"],
          rows: [
            ["기한 초과 (빨강)", "완료하지 못한 채 기한이 지난 액션 아이템"],
            ["오늘 마감 (주황)", "오늘까지 처리해야 하는 항목"],
            ["예정 (파랑)", "앞으로 처리해야 할 항목"],
            ["완료", "처리 완료된 항목 이력"],
          ],
        },
        { type: "h3", text: "회의록 등록 — 품질 이상/사후 관리 → 회의록" },
        {
          type: "steps",
          items: [
            "왼쪽 메뉴 '품질 이상/사후 관리 → 회의록'을 클릭합니다.",
            "오른쪽 상단 '+ 새 회의록' 버튼을 클릭합니다.",
            "회의명, 회의 유형, 일시, 참석자, 안건을 입력합니다.",
            "회의 상세 페이지에서 '액션 아이템 추가' 버튼으로 담당자·기한·내용을 지정합니다.",
            "지정된 담당자의 '내 할 일' 화면에 자동으로 항목이 추가됩니다.",
          ],
        },
        { type: "tip", text: "회의록 상세에서 이슈 연결 버튼으로 클레임·NCR 항목을 연결하면 회의와 품질 이슈가 자동으로 추적됩니다." },
      ],
    },
    {
      id: "projects",
      title: "2. 프로젝트 관리 — 입찰·수주 프로젝트",
      content: [
        { type: "p", text: "입찰 시방서 AI 분석과 수주 프로젝트 현황을 관리합니다." },
        { type: "h3", text: "입찰 프로젝트 (AI 독소조항 분석) — 프로젝트 관리 → 입찰 프로젝트" },
        { type: "warn", text: "파일 형식: PDF만 지원합니다. 스캔 이미지 PDF(텍스트 레이어 없음)는 분석 결과가 0건이 될 수 있습니다. 반드시 텍스트가 포함된 PDF를 사용하세요." },
        {
          type: "steps",
          items: [
            "왼쪽 메뉴 '프로젝트 관리 → 입찰 프로젝트'를 클릭합니다.",
            "오른쪽 상단 '+ 새 입찰 검토 시작' 버튼을 클릭합니다.",
            "프로젝트명, 고객사, 입찰 유형을 입력합니다.",
            "시방서 파일(PDF, 최대 50MB)을 업로드하고 'AI 분석 시작' 버튼을 클릭합니다.",
            "분석 중에는 절대 새로고침(F5)하지 마세요. 파일 크기에 따라 30초~5분이 소요됩니다.",
            "분석 완료 후 독소조항·기술리스크·누락항목 결과를 확인하고, '검토 요청' 버튼으로 팀장에게 상신합니다.",
          ],
        },
        { type: "h3", text: "수주 프로젝트 — 프로젝트 관리 → 수주 프로젝트" },
        {
          type: "steps",
          items: [
            "왼쪽 메뉴 '프로젝트 관리 → 수주 프로젝트'를 클릭합니다.",
            "오른쪽 상단 '+ 수주 프로젝트 등록' 버튼을 클릭합니다.",
            "프로젝트명, 고객사, 수주 금액, 납기, 담당자를 입력합니다.",
            "목록에서 프로젝트 클릭 → 상세 페이지에서 진행 현황·문서·Gap 분석을 관리합니다.",
          ],
        },
        { type: "tip", text: "RAG 배지(📚)가 표시된 분석 항목은 내부 IEC/KS 규격 지식베이스를 참조한 결과입니다. 최종 판단은 반드시 사람이 해야 합니다." },
      ],
    },
    {
      id: "vendors",
      title: "3. 공급망 품질관리 — 공정감사·출장검사·수입검사",
      content: [
        { type: "p", text: "협력사 대상 공정감사(QPA), 현장 출장검사, 자재 수입검사 결과를 등록하고 이력을 관리합니다." },
        {
          type: "table",
          headers: ["메뉴", "경로", "주요 내용"],
          rows: [
            ["공정감사 (QPA)", "공급망 품질관리 → 공정감사 (QPA)", "협력사 공정품질 47항목 체크리스트 감사"],
            ["출장 검사", "공급망 품질관리 → 출장 검사", "협력사 현장 방문 검사 결과 등록"],
            ["수입 검사", "공급망 품질관리 → 수입 검사", "자재·부품 입고 시 검사 결과 등록"],
          ],
        },
        { type: "h3", text: "공정감사 (QPA) 신규 등록" },
        {
          type: "steps",
          items: [
            "왼쪽 메뉴 '공급망 품질관리 → 공정감사 (QPA)'를 클릭합니다.",
            "오른쪽 상단 '+ 신규 감사 등록' 버튼을 클릭합니다.",
            "협력업체, 감사일, 감사자를 입력하고 등록합니다.",
            "생성된 감사 상세 페이지에서 '체크리스트' 탭을 열고 47개 항목을 평가합니다. 각 항목 점수는 자동 저장됩니다.",
            "'요약' 탭에서 레이더 차트·등급(A~D)·PASS/FAIL 결과를 확인합니다.",
            "개선사항이 있으면 '개선대책' 탭에서 대책 항목을 등록합니다.",
          ],
        },
        { type: "h3", text: "출장검사 / 수입검사 신규 등록" },
        {
          type: "steps",
          items: [
            "해당 메뉴(출장 검사 또는 수입 검사)를 클릭합니다.",
            "오른쪽 상단 '+ 신규 등록' 버튼을 클릭합니다.",
            "검사 일자, 검사자, 대상 업체·품목, 결과(합격/불합격/조건부합격), 비고를 입력합니다.",
            "파일 첨부가 필요하면 첨부파일 섹션에서 업로드합니다.",
            "'등록' 버튼을 클릭하면 즉시 목록에 반영됩니다.",
          ],
        },
        { type: "tip", text: "AI 유사사례 패널이 각 검사 상세 페이지 하단에 자동으로 표시됩니다. 과거 유사 사례와 대책 초안을 참조하세요." },
        {
          type: "checklist",
          title: "피드백 포인트",
          items: [
            "QPA 체크리스트 47개 항목이 실무 기준과 맞나요?",
            "검사 결과 목록에서 필터·정렬 기능이 필요한가요? (날짜 범위, 결과별)",
            "검사 기록을 엑셀로 내보내는 기능이 필요한가요?",
          ],
        },
      ],
    },
    {
      id: "facilities",
      title: "4. 시험 및 품질 보증 — 시험·분석 관리",
      content: [
        { type: "p", text: "시험 계획을 등록하고 진행 상태를 관리합니다. 이슈 발생 시 중단·재개 이력도 기록합니다." },
        {
          type: "table",
          headers: ["상태", "의미"],
          rows: [
            ["계획", "시험 일정 등록, 시작 전"],
            ["시험중", "현재 진행 중"],
            ["지연", "이슈로 일정 지연 중"],
            ["완료", "시험 완료"],
            ["취소", "시험 취소"],
          ],
        },
        {
          type: "steps",
          items: [
            "왼쪽 메뉴 '시험 및 품질 보증 → 시험/분석 관리'를 클릭합니다.",
            "상태 필터 칩으로 현재 진행 중인 시험을 빠르게 확인합니다.",
            "카드를 클릭하면 수정 모달이 열립니다. 상태·담당자·일정을 수정하고 저장합니다.",
            "이슈가 발생하면 수정 모달에서 '이슈 등록' → 이슈 내용과 중단일을 입력합니다. 상태가 자동으로 '지연'으로 변경됩니다.",
            "이슈가 해소되면 '조치 완료' 처리 → 재개일을 입력하면 상태가 '시험중'으로 복원됩니다.",
          ],
        },
        { type: "tip", text: "간트 차트 뷰(탭 전환)에서 전체 시험 일정을 타임라인으로 확인할 수 있습니다. 이슈로 인한 중단 구간은 주황색으로 표시됩니다." },
      ],
    },
    {
      id: "assets",
      title: "5. 시험설비/계측기 관리",
      content: [
        { type: "p", text: "품질부문 보유 설비·계측기 현황을 확인합니다." },
        {
          type: "steps",
          items: [
            "왼쪽 메뉴 '시험설비/계측기 관리 → 전체 설비 현황'을 클릭합니다.",
            "설비명을 클릭하면 우측에 상세 드로어가 열립니다. 기본 정보, 담당자 이력, 수선 이력을 확인합니다.",
            "가동 중/유휴/노후 상태가 배지로 표시됩니다.",
          ],
        },
        { type: "tip", text: "설비 등록과 수선 등록은 팀장 이상 권한이 필요합니다. 신규 설비 등록·수선이 필요하면 팀장에게 요청하세요." },
      ],
    },
    {
      id: "quality-issues",
      title: "6. 품질 이상/사후 관리 — NCR · 클레임",
      content: [
        { type: "p", text: "부적합품(NCR)과 고객 클레임을 칸반 보드로 관리합니다. 각 항목의 처리 단계를 실시간으로 진행하고 이력을 기록합니다." },
        { type: "h3", text: "부적합품 (NCR)" },
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
        {
          type: "steps",
          items: [
            "왼쪽 메뉴 '품질 이상/사후 관리 → 부적합품 (NCR)'을 클릭합니다.",
            "오른쪽 상단 '+ NCR 발행' 버튼을 클릭합니다.",
            "발생 원인, 심각도(Critical/Major/Minor), 담당자, 목표 조치일을 입력합니다.",
            "칸반 카드를 클릭해 상세 페이지에서 처리 이력을 추가하고 단계를 진행합니다.",
          ],
        },
        { type: "warn", text: "목표 조치일이 지난 NCR에는 자동으로 빨간 D+N 배지가 표시됩니다. 상세 페이지에서 목표일을 업데이트하거나 단계를 진행해 경고를 해제하세요." },
        { type: "h3", text: "고객 클레임" },
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
        {
          type: "steps",
          items: [
            "왼쪽 메뉴 '품질 이상/사후 관리 → 고객 클레임'을 클릭합니다.",
            "오른쪽 상단 '+ 신규 클레임' 버튼을 클릭합니다.",
            "제목, 고객사, 우선순위, 담당자, 내용을 입력하고 등록합니다.",
            "칸반 카드를 클릭해 상세 페이지에서 단계 이동, 처리 이력 추가, 파일 첨부를 진행합니다.",
          ],
        },
        { type: "tip", text: "클레임·NCR 상세 페이지 하단에 AI 유사사례 분석 패널이 자동으로 표시됩니다. 과거 유사 사례와 대책 초안을 바로 참조할 수 있습니다." },
      ],
    },
    {
      id: "witness",
      title: "7. 고객 품질 관리 — 입회검사",
      content: [
        { type: "p", text: "고객이 직접 입회하는 검사 일정을 등록하고, VoC(고객 의견)와 검사 결과를 기록합니다. .ics 파일로 Outlook·Google 캘린더에 바로 등록할 수 있습니다." },
        { type: "h3", text: "입회검사 등록" },
        {
          type: "steps",
          items: [
            "왼쪽 메뉴 '고객 품질 관리 → 입회검사'를 클릭합니다.",
            "오른쪽 상단 '+ 입회검사 등록' 버튼을 클릭합니다.",
            "고객사, 검사명, 검사 일시, 장소, 담당자, 상태를 입력하고 등록합니다.",
            "등록된 일정은 달력 뷰와 리스트 뷰(탭 전환)에서 모두 확인할 수 있습니다.",
          ],
        },
        { type: "h3", text: "검사 상세 관리" },
        {
          type: "steps",
          items: [
            "목록 또는 달력에서 입회검사 항목을 클릭합니다.",
            "'기본 정보' 탭에서 검사 내용과 결과를 수정합니다.",
            "'문서 첨부' 탭에서 검사 성적서·사진 등을 첨부합니다.",
            "'VoC' 탭에서 고객이 제기한 의견·불만을 등록합니다. VoC별로 대응 이력을 관리할 수 있습니다.",
          ],
        },
        { type: "h3", text: "캘린더 내보내기 (.ics)" },
        {
          type: "steps",
          items: [
            "입회검사 상세 페이지 우측 상단 '.ics 내보내기' 버튼을 클릭합니다.",
            "다운로드된 파일을 더블클릭하면 Outlook 또는 기본 캘린더 앱에 자동으로 일정이 등록됩니다.",
          ],
        },
        {
          type: "checklist",
          title: "피드백 포인트",
          items: [
            "입회검사 등록 폼에 추가로 필요한 항목이 있나요?",
            "VoC 등록 방식이 직관적인가요?",
            "달력 뷰가 일정 파악에 충분히 유용한가요?",
          ],
        },
      ],
    },
    {
      id: "knowledge",
      title: "8. 지식 관리 — AI 지식 검색 · 규격 현황",
      content: [
        { type: "p", text: "IEC·KS·CIGRE 규격과 내부 기술 노트를 자연어로 검색합니다. 합격 판정 기준, 시험 방법, 규격 해석을 별도 문서 검색 없이 바로 확인할 수 있습니다." },
        { type: "h3", text: "AI 지식 검색 — 기준 정보 및 지원 → AI 지식 검색" },
        {
          type: "steps",
          items: [
            "왼쪽 메뉴 '기준 정보 및 지원 → AI 지식 검색'을 클릭합니다.",
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
        { type: "h3", text: "지식/규격 현황 — 기준 정보 및 지원 → 지식/규격 현황" },
        {
          type: "steps",
          items: [
            "왼쪽 메뉴 '기준 정보 및 지원 → 지식/규격 현황'을 클릭합니다.",
            "좌측 카테고리 트리에서 IEC·KS·CIGRE 등 분류를 선택합니다.",
            "규격 카드를 클릭하면 내용 보기 버튼이 활성화됩니다. '⤢ 크게 보기'로 전체화면 확인이 가능합니다.",
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
        { type: "p", text: "팀장은 실무자 기능을 모두 사용할 수 있으며, 추가로 설비 등록·수선, 지식 등록, 외부 정보 조회, 입찰 검토 1차 승인 권한을 가집니다." },
        {
          type: "table",
          headers: ["메뉴 그룹", "팀장 추가 권한"],
          rows: [
            ["프로젝트 관리 → 입찰 프로젝트", "실무자 Draft 1차 검토·승인·반려"],
            ["공급망 품질관리", "전체 CRUD + 협력사 드로어 QPA 이력 조회"],
            ["시험설비/계측기 관리", "설비 등록 (/assets/new) + 설비 수선 (/assets/repairs)"],
            ["품질 이상/사후 관리", "전체 CRUD + 단계 이동"],
            ["고객 품질 관리 → 입회검사", "전체 CRUD"],
            ["기준 정보 및 지원 → 지식/규격 등록", "규격·사내 기준 문서 등록 가능"],
            ["기준 정보 및 지원 → 외부 정보", "시장·기술·경쟁사 동향 + 실시간 웹검색"],
          ],
        },
        { type: "tip", text: "실무자 기능(내 할 일, 회의록, 검사 업무, NCR·클레임, 입회검사, 지식 검색)은 동일하게 사용합니다. 아래는 팀장 추가 기능 위주로 안내합니다." },
      ],
    },
    {
      id: "assets-tl",
      title: "2. 시험설비/계측기 관리 — 설비 등록·수선",
      content: [
        { type: "p", text: "팀장은 신규 설비 등록과 수선 이력 등록 권한을 가집니다." },
        { type: "h3", text: "설비 등록 — 시험설비/계측기 관리 → 설비 등록" },
        {
          type: "steps",
          items: [
            "왼쪽 메뉴 '시험설비/계측기 관리 → 설비 등록'을 클릭합니다.",
            "설비명, 규격, 사업장, 관리팀, 담당자, 취득일, 가용 여부를 입력합니다.",
            "'등록' 버튼 클릭 후 전체 설비 현황 목록에서 확인합니다.",
          ],
        },
        { type: "h3", text: "설비 수선 등록 — 시험설비/계측기 관리 → 설비 수선" },
        {
          type: "steps",
          items: [
            "왼쪽 메뉴 '시험설비/계측기 관리 → 설비 수선'을 클릭합니다.",
            "수선할 설비를 목록에서 선택합니다.",
            "수선 유형, 수선 일자, 비용, 수선 내용을 입력하고 등록합니다.",
            "수선 이력은 설비 상세 드로어 '수선 이력' 탭에서 시간 순으로 확인할 수 있습니다.",
          ],
        },
      ],
    },
    {
      id: "knowledge-tl",
      title: "3. 지식/규격 등록 — 사내 기준 문서 등록",
      content: [
        { type: "p", text: "팀장은 IEC·KS 외에 사내 규격·기준 문서를 직접 등록해 전 팀원이 AI 지식 검색에서 참조할 수 있도록 합니다." },
        {
          type: "steps",
          items: [
            "왼쪽 메뉴 '기준 정보 및 지원 → 지식/규격 등록'을 클릭합니다.",
            "'사내규격 등록' 섹션에서 문서명, 분류, 내용, 파일(PDF)을 입력합니다.",
            "등록된 문서는 즉시 AI 지식 검색 RAG 데이터베이스에 반영됩니다.",
            "기존 등록 문서는 목록에서 인라인 수정·삭제가 가능합니다.",
          ],
        },
        { type: "tip", text: "현장에서 자주 쓰는 사내 기준, 시험 절차서, LSC QPA 체크리스트 등을 등록하면 AI 검색 정확도가 크게 올라갑니다." },
      ],
    },
    {
      id: "intelligence-tl",
      title: "4. 외부 정보 — 시장·기술 동향 조회",
      content: [
        { type: "p", text: "시장·기술·경쟁사 동향을 모니터링하고, 실시간 외부 웹 검색을 실행합니다." },
        {
          type: "steps",
          items: [
            "왼쪽 메뉴 '기준 정보 및 지원 → 외부 정보'를 클릭합니다.",
            "'수집 동향' 탭: 사전 수집된 시장·기술·경쟁사 동향 카드를 필터·검색합니다.",
            "'외부 웹 검색' 탭: 검색창에 질문을 입력하면 최신 웹 정보를 최대 8건 실시간 검색합니다.",
          ],
        },
        { type: "tip", text: "웹 검색 예시: 'Prysmian HVDC 해저케이블 수주 2026', 'IEC 62067 개정안 최신 동향'" },
      ],
    },
    {
      id: "tra-tl",
      title: "5. 입찰 프로젝트 — 1차 검토·승인",
      content: [
        { type: "p", text: "실무자가 AI 분석 후 상신한 입찰 Draft를 검토하고 승인 또는 반려합니다." },
        {
          type: "steps",
          items: [
            "왼쪽 메뉴 '프로젝트 관리 → 입찰 프로젝트'를 클릭합니다.",
            "목록에서 상태가 '검토 요청'인 건을 클릭합니다.",
            "AI 분석 내용(독소 조항·기술 리스크·누락 항목)을 항목별로 검토합니다.",
            "내용이 적절하면 '1차 승인' 버튼을 클릭합니다.",
            "수정이 필요하면 '반려' 버튼과 함께 사유를 입력합니다. 실무자에게 자동 반환됩니다.",
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
      id: "monitor-tl",
      title: "6. 품질 현황 모니터링",
      content: [
        { type: "p", text: "팀 단위 클레임·NCR·검사 현황을 모니터링하고 병목을 파악합니다." },
        {
          type: "table",
          headers: ["KPI 카드", "위치", "확인 항목"],
          rows: [
            ["미클로징 클레임", "고객 클레임 페이지 상단", "현재 처리 중인 전체 클레임 수"],
            ["30일 초과 건", "고객 클레임 페이지 상단", "한 달 이상 미클로징 긴급 건"],
            ["Overdue NCR", "NCR 칸반 보드", "D+N 빨간 배지 건 — 즉시 조치 필요"],
          ],
        },
        {
          type: "steps",
          items: [
            "클레임·NCR 페이지 상단 KPI 카드로 전체 현황을 파악합니다.",
            "30일 초과 클레임 또는 기한 초과 NCR이 있으면 상세 페이지에서 담당자 확인 후 조치를 요청합니다.",
            "공급망 품질관리 → 협력업체 목록 클릭 → 드로어 '공정 현황' 탭에서 최근 QPA 결과를 확인합니다.",
          ],
        },
        { type: "tip", text: "입회검사 달력 뷰에서 이번 달 고객 입회 일정 전체를 한눈에 파악할 수 있습니다." },
      ],
    },
  ] as SectionItem[],

  DIRECTOR: [
    {
      id: "overview-dir",
      title: "1. 부문장 역할 개요",
      content: [
        { type: "p", text: "부문장 대시보드는 품질부문 전체 현황을 한 화면에서 확인하고, 입찰 검토의 최종 승인권과 인사·면담 조회 권한을 가집니다." },
        {
          type: "table",
          headers: ["메뉴 그룹", "부문장 권한"],
          rows: [
            ["메인 대시보드", "전체 KPI 요약 + 빠른 이동"],
            ["프로젝트 관리", "입찰 검토 최종 승인·반려 + 수주 프로젝트 조회"],
            ["공급망 품질관리", "전체 조회 + QPA 결과 분석"],
            ["시험 및 품질 보증 + 시험설비/계측기", "전체 조회 + 설비 등록·수선"],
            ["품질 이상/사후 관리", "전체 조회 + 처리 이력 확인 + 회의록"],
            ["고객 품질 관리 → 입회검사", "전체 조회"],
            ["기준 정보 및 지원", "지식 등록 + 외부 정보 + 인사·면담"],
            ["관리자 기능", "활동 현황 리더보드 + 게시판 공지 자동 등록"],
            ["사용자 관리", "가입 승인·역할 부여·비밀번호 초기화"],
          ],
        },
        { type: "tip", text: "팀장 기능(설비 등록·수선, 지식 등록, 외부 정보, 1차 검토)을 모두 포함합니다. 아래는 부문장 추가 기능 위주로 안내합니다." },
      ],
    },
    {
      id: "dashboard-dir",
      title: "2. 메인 대시보드 읽는 법",
      content: [
        { type: "p", text: "로그인 후 메인 대시보드에서 품질부문 전체 핵심 KPI를 한눈에 확인합니다." },
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
            "각 영역 카드를 훑어봅니다. 빨간색 또는 노란색 수치가 있는 카드를 우선 확인합니다.",
            "카드 클릭으로 해당 영역 상세 화면으로 바로 이동합니다.",
            "화면 우측 '내 승인 현황' 패널에서 최종 승인 대기 중인 입찰 건을 바로 확인합니다.",
          ],
        },
        { type: "tip", text: "신호등 체계: 🟢 정상 · 🟡 주의 · 🔴 이상. 각 카드에 자동으로 표시됩니다." },
      ],
    },
    {
      id: "tra-dir",
      title: "3. 입찰 프로젝트 — 최종 승인",
      content: [
        { type: "p", text: "팀장 1차 검토를 통과한 입찰 분석 결과를 최종 승인합니다. 최종 승인 후 영업팀 전달 가능 상태가 됩니다." },
        {
          type: "steps",
          items: [
            "왼쪽 메뉴 '프로젝트 관리 → 입찰 프로젝트'를 클릭합니다.",
            "목록에서 상태가 '최종 승인 대기'인 건을 클릭합니다.",
            "AI 분석 내용 전체와 팀장 검토 의견을 확인합니다.",
            "부문장 메모(선택)를 입력하고 '최종 승인' 또는 '반려' 버튼을 클릭합니다.",
          ],
        },
        { type: "warn", text: "최종 승인 이후에는 수정이 제한됩니다. 충분히 검토한 후 승인하세요." },
      ],
    },
    {
      id: "hr-dir",
      title: "4. 인사·면담",
      content: [
        { type: "p", text: "팀원 기본사항과 면담 이력을 확인합니다." },
        {
          type: "steps",
          items: [
            "왼쪽 메뉴 '기준 정보 및 지원 → 인사·면담'을 클릭합니다.",
            "팀원 목록에서 면담 이력 탭을 확인합니다.",
            "최근 면담일과 다음 예정일을 파악해 면담 주기를 관리합니다.",
            "리소스 현황 패널에서 팀원별 업무 부하를 확인합니다.",
          ],
        },
      ],
    },
    {
      id: "activity-dir",
      title: "5. 활동 현황 & 게시판 공지 등록",
      content: [
        { type: "p", text: "부문 전체 구성원의 시스템 활동 현황을 분석하고, 상위 기여자를 게시판에 자동으로 공지할 수 있습니다." },
        {
          type: "steps",
          items: [
            "헤더 우측 상단 '사용자 관리' → 하단 '활동 현황' 탭을 클릭합니다.",
            "기간 필터(전체/30일/7일)로 활동 집계를 조회합니다.",
            "각 사용자 행을 클릭하면 인라인 타임라인이 펼쳐져 활동 유형·내용·일시를 상세 확인합니다.",
            "'리더보드' 섹션에서 Top 3 기여자 현황을 확인합니다.",
            "'게시판에 공지 등록' 버튼 클릭 시 리더보드가 자동으로 공지 게시글(핀 고정)로 등록됩니다.",
          ],
        },
        { type: "tip", text: "관리자(ADMIN) 계정은 리더보드 집계에서 자동 제외됩니다." },
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
            "헤더 오른쪽 상단 '사용자 관리' 버튼을 클릭합니다.",
            "상태가 'PENDING(대기)'인 신청자를 확인합니다.",
            "역할 드롭다운에서 실무자 / 팀장 / 임원을 선택하고 '승인' 버튼을 클릭합니다.",
            "승인된 사용자는 즉시 로그인할 수 있습니다.",
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
          🚧 PoC(개념증명) 시스템 — E2E-1 실사용 검증 진행 중. 원가·실입찰 데이터 입력 금지.
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
