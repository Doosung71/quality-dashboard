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
      { type: "p", text: "이 시스템은 QMS 2.0 정식 도입 전 개념 증명(PoC) 단계입니다. 아직 완성된 시스템이 아니며, 현재 데이터는 모두 시범용 샘플 데이터입니다." },
      {
        type: "table",
        headers: ["항목", "현재 상태", "의미"],
        rows: [
          ["대시보드 데이터", "샘플 데이터", "실제 ERP·현장 데이터가 아닙니다"],
          ["고객 클레임", "샘플 데이터", "실제 클레임 건이 아닙니다"],
          ["협력업체 정보", "샘플 데이터", "실제 협력업체 등급과 다를 수 있습니다"],
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
      { type: "h3", text: "권장 브라우저 및 기기" },
      {
        type: "table",
        headers: ["항목", "권장", "비고"],
        rows: [
          ["브라우저", "Google Chrome · Microsoft Edge (최신 버전)", "Internet Explorer 미지원"],
          ["기기", "PC / 노트북 (화면 1280px 이상 권장)", "태블릿·스마트폰 접속 가능하나 일부 기능이 불편할 수 있음"],
          ["네트워크", "사내 Wi-Fi 또는 LTE 이상", "VPN 없이 외부 인터넷에서도 접속 가능"],
        ],
      },
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
          "어디서 막혔는지 (예: 'AI 분석 버튼을 눌렀는데 응답이 없었다')",
          "화면이 깨지거나 오류 메시지가 떴을 때 스크린샷",
          "실무에서 꼭 필요한데 없는 기능 (예: '분석 결과를 PDF로 내보내고 싶다')",
          "용어나 설명이 이해하기 어려웠던 부분",
          "속도가 너무 느리거나 불편했던 부분",
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
            a: "두 가지 경우가 있습니다. ① 관리자 승인 전 — 가입 후 관리자 승인이 완료되어야 로그인할 수 있습니다. 관리자(부문장)에게 승인 요청을 하세요. ② 비밀번호 오류 — '비밀번호 찾기' 이메일 자동 발송 기능은 현재 미지원입니다. 관리자에게 임시 비밀번호 발급을 요청하세요.",
          },
          {
            q: "AI 분석이 멈추거나 너무 오래 걸립니다.",
            a: "파일 크기에 따라 최대 5분까지 소요됩니다. '분석 중...' 스피너가 표시되면 정상 진행 중입니다. 절대 새로고침(F5)하지 마세요 — 분석이 처음부터 다시 시작됩니다. 5분 이상 응답이 없으면 페이지를 새로 열고 재시도한 뒤, 피드백 게시판에 알려주세요.",
          },
          {
            q: "AI 분석 결과가 엉뚱하게 나왔습니다.",
            a: "AI 분석은 초안(Draft)이라 틀리거나 과도한 경우가 있습니다. 직접 내용을 수정하거나 해당 항목을 삭제하세요. '어떤 시방서에서 어떤 결과가 나왔는지' 피드백에 남겨주시면 모델 개선에 반영됩니다.",
          },
          {
            q: "파일 업로드가 실패합니다.",
            a: "세 가지를 확인하세요. ① 형식: PDF만 지원합니다 (DOCX 미지원). ② 크기: 파일 한 개당 50MB 이하여야 합니다. ③ 파일명: 특수문자(!, @, #, & 등)가 있으면 영문·숫자·한글로 변경 후 재시도하세요.",
          },
          {
            q: "분석 결과 항목이 0건으로 나옵니다.",
            a: "파일이 스캔 이미지 PDF인 경우 텍스트를 읽지 못해 결과가 0건이 됩니다. 텍스트 레이어가 포함된 PDF(Word에서 '다른 이름으로 저장 → PDF' 로 변환한 것)로 재업로드하세요.",
          },
          {
            q: "화면이 흰색만 보이거나 버튼이 반응하지 않습니다.",
            a: "브라우저 캐시를 삭제하세요. Chrome 기준: 주소창에 chrome://settings/clearBrowserData 입력 → '캐시된 이미지 및 파일' 체크 → '데이터 삭제'. 이후 재접속하면 대부분 해결됩니다.",
          },
          {
            q: "스마트폰으로 접속할 수 있나요?",
            a: "동일한 URL(quality-dashboard-flax.vercel.app)로 접속 가능합니다. 다만 AI 분석 결과·협력업체 Drawer 등 일부 기능은 PC에 최적화되어 있어, 가능하면 PC 또는 노트북 이용을 권장합니다.",
          },
          {
            q: "지식 검색 결과가 없거나 관련 없는 내용이 나옵니다.",
            a: "짧은 키워드보다 구체적인 질문 문장으로 검색하세요. 예: '케이블' → 'XLPE 케이블 PD 시험 합격 기준'. 그래도 없으면 해당 주제가 현재 지식베이스에 없는 것입니다. 피드백으로 추가를 요청해 주세요.",
          },
          {
            q: "이전에 분석한 입찰 이력이 보이지 않습니다.",
            a: "로그아웃 후 재로그인해 보세요. 이력은 계정에 연결되어 있어 브라우저를 닫아도 유지됩니다. 그래도 없으면 관리자에게 문의하세요.",
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
          ["'분석 실패' 오류 메시지", "파일 형식 오류 또는 서버 일시 과부하", "파일 형식(PDF만 허용) 확인 후 1~2분 뒤 재시도"],
          ["버튼 클릭 시 아무 반응 없음", "브라우저 오류 또는 세션 만료", "F5 새로고침 또는 캐시 삭제 후 재시도"],
          ["화면 무한 로딩", "네트워크 불안정", "인터넷 연결 확인 후 재접속"],
          ["'권한이 없습니다' 메시지", "세션 만료 또는 역할 미설정", "로그아웃 후 재로그인, 지속 시 관리자 문의"],
          ["파일 업로드 용량 초과 메시지", "50MB 한도 초과", "파일 압축 또는 분할 업로드 시도"],
          ["분석 결과 항목이 0건", "스캔 이미지 PDF (텍스트 레이어 없음)", "Word에서 PDF로 변환한 텍스트 포함 PDF로 재업로드"],
          ["임시 비밀번호로 로그인 후 반복 이동", "비밀번호 변경 미완료", "프로필 → 비밀번호 변경에서 새 비밀번호로 교체"],
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
      id: "facilities",
      title: "1. 시험장·시험 현황",
      content: [
        { type: "p", text: "구미/동해 사업장의 시험장별 설비 현황과 가동 상태를 확인합니다. 담당 설비의 교정 주기·노후 여부를 빠르게 파악할 수 있습니다." },
        {
          type: "steps",
          items: [
            "왼쪽 메뉴에서 '시험장·시험 현황'을 클릭합니다.",
            "상단 탭에서 사업장(구미 / 동해)을 선택합니다.",
            "시험실 목록에서 담당 시험실을 클릭하면 내부 설비 카드가 펼쳐집니다.",
            "각 설비 카드에서 설비명, 제조사, 도입연도, 측정 범위, 현재 상태를 확인합니다.",
          ],
        },
        {
          type: "table",
          headers: ["상태 색상", "의미"],
          rows: [
            ["🟢 신규 (파란색 테두리)", "도입 5년 이내, 정상 운용"],
            ["🟢 정상 (초록색 테두리)", "정상 운용 중"],
            ["🟡 노후 (노란색 테두리)", "도입 15년 초과, 교체 검토 필요"],
            ["⬜ 도입예정 (회색 테두리)", "아직 도입되지 않은 예정 설비"],
          ],
        },
        { type: "tip", text: "설비를 클릭하면 상세 사양(최대 전압, 전류, 주파수, 담당자 등)을 볼 수 있습니다. 현재는 샘플 데이터입니다." },
        {
          type: "checklist",
          title: "피드백 포인트",
          items: [
            "실제 담당 설비 정보가 어떤 형태로 표시되길 원하나요?",
            "설비 카드에 추가로 있으면 좋은 정보가 있나요? (예: 마지막 교정일, 다음 교정 예정일)",
            "시험 진행률 정보가 있으면 유용할 것 같은가요?",
          ],
        },
      ],
    },
    {
      id: "claims",
      title: "2. 고객 클레임",
      content: [
        { type: "p", text: "고객 클레임을 5단계 칸반 보드로 관리합니다. 각 건의 현재 처리 단계와 담당자를 한눈에 파악할 수 있습니다." },
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
            "왼쪽 메뉴에서 '품질비용(Q-Cost)'를 클릭한 후, 하위 메뉴 '고객 클레임'을 클릭합니다.",
            "상단 KPI 카드에서 현재 미클로징 건수와 평균 처리 일수를 확인합니다.",
            "칸반 보드에서 담당 클레임 카드를 찾습니다.",
            "카드를 클릭하면 클레임 상세 정보(고객사, 제품, 접수일, 내용, 처리 이력)를 볼 수 있습니다.",
            "단계가 변경되면 카드를 드래그해서 다음 열로 이동합니다.",
          ],
        },
        { type: "warn", text: "현재 클레임 데이터는 샘플 데이터입니다. 실제 클레임을 이 시스템에 입력하지 마세요." },
        {
          type: "checklist",
          title: "피드백 포인트",
          items: [
            "칸반 이동이 직관적인가요? 드래그가 자연스러웠나요?",
            "클레임 카드에 표시되는 정보(고객사, 제품명, D+n일)가 충분한가요?",
            "필터나 정렬 기능이 필요한가요? (예: 담당자별, 고객사별 필터)",
            "클레임 등록·수정 기능이 필요한가요?",
          ],
        },
      ],
    },
    {
      id: "tra",
      title: "3. 입찰검토시스템",
      content: [
        { type: "p", text: "입찰 시방서(PDF)를 업로드하면 AI가 독소 조항, 기술 리스크, 누락 항목을 자동 분석합니다. 분석 결과는 Draft 초안으로 생성되며, 반드시 직접 검토 후 사용합니다." },
        { type: "warn", text: "파일 형식: PDF만 지원합니다. DOCX는 현재 지원하지 않습니다. 또한 스캔 이미지 PDF(텍스트 레이어 없음)는 분석 결과가 0건이 될 수 있습니다. 반드시 텍스트가 포함된 PDF를 사용하세요." },
        { type: "h3", text: "새 입찰 분석 시작" },
        {
          type: "steps",
          items: [
            "왼쪽 메뉴 '입찰검토시스템'을 클릭합니다.",
            "오른쪽 상단 '+ 새 입찰 검토 시작' 버튼을 클릭합니다.",
            "프로젝트명, 고객사, 입찰 유형을 입력합니다.",
            "시방서 파일(PDF, 텍스트 레이어 포함, 최대 50MB)을 업로드합니다. 여러 파일 동시 업로드 가능합니다. 스캔 이미지 PDF는 분석 결과가 0건이 될 수 있습니다.",
            "'AI 분석 시작' 버튼을 클릭합니다. 버튼이 회색으로 비활성화되고 '분석 중...' 스피너가 화면에 표시됩니다. 파일 크기에 따라 30초~5분이 소요됩니다. 분석 중에는 절대 새로고침(F5)하지 마세요 — 처음부터 다시 시작됩니다.",
            "분석이 완료되면 결과 화면이 자동으로 나타납니다. '독소조항', '기술리스크', '누락항목' 3개 섹션이 아코디언 형태로 표시됩니다. 각 섹션 제목을 클릭하면 AI가 추출한 항목 목록이 펼쳐집니다. 항목이 0건인 섹션은 AI가 해당 유형의 리스크를 발견하지 못한 것입니다.",
          ],
        },
        { type: "h3", text: "분석 결과 3개 카테고리 이해하기" },
        {
          type: "table",
          headers: ["카테고리", "내용", "확인 포인트"],
          rows: [
            ["독소 조항", "계약 시 불리하게 작용할 수 있는 조항 (과도한 페널티, 일방적 해지권 등)", "AI가 표시한 근거 문구를 원문에서 직접 확인"],
            ["기술 리스크", "당사 제조 능력으로 충족이 어렵거나 추가 비용이 발생할 수 있는 기술 요건", "자사 능력과 비교해 실제 리스크인지 판단 필요"],
            ["누락 항목", "시방서에 명시되지 않았지만 통상적으로 필요한 요건 또는 명확화가 필요한 항목", "발주처에 질의할 항목 목록 작성에 활용"],
          ],
        },
        { type: "h3", text: "요구사항 추가 및 AI 제안 기능" },
        {
          type: "steps",
          items: [
            "분석 결과 화면 하단 '요구사항 추가' 버튼을 클릭합니다.",
            "항목 유형(독소조항/기술리스크/누락항목)과 내용을 입력합니다.",
            "'AI 제안' 버튼을 클릭하면 AI가 입력 내용을 기반으로 상세 설명 초안을 자동 생성합니다.",
            "'웹 검색' 버튼을 클릭하면 외부 정보를 참조해 보완된 내용을 제안합니다.",
            "AI 제안 내용을 직접 수정한 뒤 저장합니다.",
          ],
        },
        { type: "h3", text: "재분석 기능" },
        {
          type: "steps",
          items: [
            "기존 분석 건에서 '재분석' 버튼을 클릭합니다.",
            "추가 파일을 업로드하거나 기존 파일만 재분석할 수 있습니다.",
            "분석 이력은 건별로 누적 보관됩니다.",
          ],
        },
        {
          type: "tip",
          text: "RAG 배지(📚)가 표시된 분석 항목은 내부 IEC/KS 규격 지식베이스를 참조한 결과입니다. 배지가 없는 항목보다 더 신뢰도가 높은 편이나, 최종 판단은 반드시 사람이 해야 합니다.",
        },
        { type: "h3", text: "AI 분석의 한계 — 꼭 알아두세요" },
        {
          type: "table",
          headers: ["AI가 잘 감지하는 것", "AI가 놓칠 수 있는 것"],
          rows: [
            ["일반적인 독소 조항 패턴 (과도한 지체상금, 일방적 해지권 등)", "업계 관행상 수용 가능한 조항을 과위험으로 분류하는 경우"],
            ["IEC·KS·CIGRE 규격 대비 누락된 시험 항목", "당사 최신 수주 실적 기반의 능력 판단 (현재 지식베이스 기준)"],
            ["반복되거나 모순되는 조항 감지", "시방서 전체 맥락을 종합한 계약 리스크 최종 판단"],
            ["표준 규격에서 벗어난 비정형 기술 요건", "스캔 이미지로만 구성된 PDF (텍스트 없는 파일)"],
          ],
        },
        {
          type: "warn",
          text: "AI 분석 결과는 '초안(Draft)' 입니다. 원문 시방서를 직접 확인하고 내용을 수정한 뒤 팀장에게 '검토 요청'을 합니다. AI가 자동으로 결론을 내리지 않습니다.",
        },
        {
          type: "checklist",
          title: "피드백 포인트",
          items: [
            "분석 결과의 정확도는 어느 정도였나요? (정확 / 부분 맞음 / 엉뚱한 결과)",
            "독소조항·기술리스크·누락항목 중 어떤 카테고리가 가장 유용했나요?",
            "AI 제안 기능이 실제 작성에 도움이 되었나요?",
            "분석 속도가 허용 가능한 수준이었나요?",
            "실무에서 꼭 있어야 할 기능이 빠져 있다고 느끼셨나요?",
          ],
        },
      ],
    },
    {
      id: "knowledge",
      title: "4. 지식저장소(QKM)",
      content: [
        { type: "p", text: "IEC·KS·CIGRE 규격과 내부 기술 노트를 자연어로 검색합니다. 합격 판정 기준, 시험 방법, 규격 해석을 별도 문서 검색 없이 바로 확인할 수 있습니다." },
        {
          type: "steps",
          items: [
            "왼쪽 메뉴 '지식저장소(QKM)'을 클릭합니다.",
            "검색창에 질문을 자연어로 입력합니다.",
            "Enter 또는 검색 버튼을 클릭합니다. AI가 규격 문서에서 관련 내용을 찾아 답변합니다.",
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
            ["CIGRE TB 490 주요 내용 요약", "문서 요약"],
          ],
        },
        { type: "tip", text: "짧은 키워드(예: 'PD 기준')보다 구체적인 문장(예: '초고압 케이블 PD 측정 합격 판정 기준')으로 검색할수록 더 정확한 결과가 나옵니다." },
        {
          type: "checklist",
          title: "피드백 포인트",
          items: [
            "실제 업무에서 자주 찾는 규격 정보를 검색했을 때 올바른 답변이 나왔나요?",
            "답변이 불충분하거나 틀린 경우 어떤 질문을 했는지 메모해 주세요.",
            "지식 검색보다 직접 문서를 여는 게 더 편리하다고 느끼셨나요?",
          ],
        },
      ],
    },
    {
      id: "feedback-guide",
      title: "5. 피드백 남기기",
      content: [
        { type: "p", text: "시스템 사용 중 불편한 점이나 개선 요청을 피드백 게시판에 남겨주세요. 이 피드백이 시스템 개선의 직접적인 재료가 됩니다." },
        {
          type: "steps",
          items: [
            "왼쪽 사이드바 하단 '피드백' 메뉴를 클릭합니다.",
            "내용을 자유롭게 입력합니다. '어디서 막혔다', '이 기능이 없다', '버튼이 잘 안 보인다' 등 무엇이든 좋습니다.",
            "화면 캡처를 첨부하면 더욱 빠르게 해결할 수 있습니다.",
            "'피드백 등록' 버튼을 클릭하면 즉시 관리자에게 전달됩니다.",
          ],
        },
        { type: "tip", text: "좋았던 점도 남겨주세요. 잘 되는 기능을 아는 것도 개선에 도움이 됩니다." },
      ],
    },
  ] as SectionItem[],

  TEAM_LEAD: [
    {
      id: "overview-tl",
      title: "1. 팀장 역할 개요",
      content: [
        { type: "p", text: "팀장은 실무자가 상신한 입찰 검토 Draft를 1차 검토·승인하고, 팀 단위 클레임/설비/협력업체 현황을 모니터링합니다." },
        {
          type: "table",
          headers: ["기능", "팀장 권한"],
          rows: [
            ["시험장·시험 현황", "전체 조회 가능"],
            ["고객 클레임", "전체 조회 + 칸반 이동"],
            ["협력업체", "전체 조회 + 상세 Drawer"],
            ["입찰 검토 AI", "실무자 Draft 1차 검토·승인·반려"],
            ["지식 검색", "전체 이용"],
          ],
        },
      ],
    },
    {
      id: "facilities-tl",
      title: "2. 시험장·시험 현황",
      content: [
        { type: "p", text: "팀 담당 시험장의 설비 가동률과 노후 현황을 파악합니다. 교체 계획이 필요한 설비를 빠르게 식별할 수 있습니다." },
        {
          type: "steps",
          items: [
            "'시험장·시험 현황' 메뉴에서 전체 설비 현황을 확인합니다.",
            "탭에서 사업장(구미/동해)을 선택하고 담당 시험실을 클릭합니다.",
            "노후(노란색 테두리) 설비를 식별합니다.",
            "설비 카드 클릭으로 제조사, 도입연도, 담당자 등 상세 정보를 확인합니다.",
          ],
        },
        { type: "tip", text: "설비 상태 필터(전체/신규/정상/노후/도입예정)로 원하는 상태만 모아볼 수 있습니다." },
        {
          type: "checklist",
          title: "피드백 포인트",
          items: [
            "팀장이 봐야 할 설비 정보가 추가로 필요한 것이 있나요?",
            "노후 설비 교체 요청을 시스템 내에서 할 수 있으면 유용할까요?",
          ],
        },
      ],
    },
    {
      id: "claims-tl",
      title: "3. 고객 클레임",
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
            "30일 초과 건이 있으면 해당 칼럼에서 카드를 찾아 내용을 확인합니다.",
            "병목 단계(카드가 가장 쌓인 칼럼)를 파악해 팀원에게 조치를 요청합니다.",
          ],
        },
        { type: "tip", text: "카드 테두리가 빨간색일수록 접수 이후 오래된 건입니다. 색상이 진할수록 주의가 필요합니다." },
        {
          type: "checklist",
          title: "피드백 포인트",
          items: [
            "팀장이 일상적으로 모니터링하기에 화면이 충분히 간결한가요?",
            "팀원별 담당 클레임 필터가 있으면 유용할까요?",
            "클레임 통계(월별 추이, 고객사별 집계)가 필요한가요?",
          ],
        },
      ],
    },
    {
      id: "vendors-tl",
      title: "4. 공급망관리",
      content: [
        { type: "p", text: "원자재·외주 협력업체 현황과 품질 등급을 확인합니다. 카드 클릭으로 협력업체별 상세 정보 Drawer를 열 수 있습니다." },
        {
          type: "steps",
          items: [
            "왼쪽 메뉴 '공급망관리'를 클릭합니다.",
            "상단 탭에서 카테고리(원자재 / 반제품 외주 / 상품 외주)를 선택합니다.",
            "협력업체 카드를 클릭하면 오른쪽에서 상세 Drawer가 펼쳐집니다.",
            "Drawer에서 등급, 주요 품목, 최근 감사 이력, 불량률, 납기 준수율 등을 확인합니다.",
          ],
        },
        {
          type: "table",
          headers: ["등급", "색상", "의미"],
          rows: [
            ["A등급", "초록색", "우수 협력업체, 우선 거래 권장"],
            ["B등급", "파란색", "일반 협력업체, 정기 모니터링"],
            ["C등급", "노란색", "개선 필요, 집중 관리 대상"],
            ["D등급", "빨간색", "거래 위험, 대체 업체 검토"],
          ],
        },
        { type: "warn", text: "현재 협력업체 데이터는 샘플 데이터입니다. 실제 협력업체 등급과 다를 수 있습니다." },
        {
          type: "checklist",
          title: "피드백 포인트",
          items: [
            "협력업체 Drawer에 표시되는 정보가 실무에 충분한가요?",
            "협력업체 검색·필터 기능이 필요한가요?",
            "SRM(공급망 위험 관리) 알림 기능이 있으면 유용할까요?",
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
            "상단 탭 '수집 동향': 사전 수집된 시장·기술·경쟁사 동향 카드를 필터·검색합니다.",
            "상단 탭 '외부 웹 검색': 검색창에 질문을 입력하면 DuckDuckGo 기반으로 최신 웹 정보를 최대 8건 실시간 검색합니다.",
            "웹 검색 결과 카드 우측 아이콘을 클릭하면 원문 페이지로 바로 이동합니다.",
          ],
        },
        {
          type: "table",
          headers: ["탭", "내용", "활용 상황"],
          rows: [
            ["수집 동향", "영향도·카테고리 필터 + 내용 검색", "정기 모니터링, 동향 카드 상세 확인"],
            ["외부 웹 검색", "실시간 인터넷 검색 (최대 8건)", "경쟁사 동향·규격 발표 최신 정보 즉시 확인"],
          ],
        },
        { type: "tip", text: "웹 검색 예시: 'Prysmian HVDC 해저케이블 수주 2026', 'IEC 62067 개정안 최신 동향'" },
        {
          type: "checklist",
          title: "피드백 포인트",
          items: [
            "수집 동향 카드의 정보가 실무에 충분한가요?",
            "웹 검색 결과의 품질(관련성)은 어느 정도였나요?",
          ],
        },
      ],
    },
    {
      id: "tra-tl",
      title: "6. 입찰검토시스템 — 1차 검토·승인",
      content: [
        { type: "p", text: "실무자가 AI 분석 후 상신한 입찰 Draft를 검토하고 승인 또는 반려합니다. 팀장 승인 이후 부문장 최종 승인 단계로 넘어갑니다." },
        {
          type: "steps",
          items: [
            "왼쪽 메뉴 '입찰검토시스템'을 클릭합니다.",
            "목록에서 상태가 '검토 요청'인 건을 클릭합니다.",
            "AI 분석 내용(독소 조항·기술 리스크·누락 항목)을 항목별로 검토합니다.",
            "내용이 적절하면 '1차 승인' 버튼을 클릭합니다.",
            "내용이 불충분하거나 수정이 필요하면 '반려' 버튼과 함께 사유를 입력합니다.",
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
        { type: "warn", text: "현재 DB에 저장된 입찰 분석 이력은 실제 데이터입니다. 비민감 샘플 시방서로만 테스트하세요." },
        {
          type: "checklist",
          title: "피드백 포인트",
          items: [
            "검토 화면에서 분석 내용 파악이 쉬웠나요?",
            "반려 사유 입력 방식이 편리한가요?",
            "실무자와 댓글로 소통하는 기능이 필요한가요?",
            "검토 기한(D-데이) 표시 기능이 있으면 유용할까요?",
          ],
        },
      ],
    },
    {
      id: "knowledge-tl",
      title: "7. 지식저장소(QKM)",
      content: [
        { type: "p", text: "입찰 검토 또는 클레임 대응 중 규격 기준을 즉시 검색합니다. 회의 중에도 바로 확인할 수 있습니다." },
        {
          type: "steps",
          items: [
            "왼쪽 메뉴 '지식저장소(QKM)'을 클릭합니다.",
            "자연어로 질문을 입력합니다. (예: 'XLPE 절연 두께 허용 편차 기준은?')",
            "AI가 관련 규격과 내부 지식베이스에서 답변을 생성합니다.",
            "출처 문서를 확인해 원문을 참조합니다.",
          ],
        },
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
          headers: ["기능", "부문장 권한"],
          rows: [
            ["메인 대시보드", "5개 영역 전체 KPI 요약 화면"],
            ["시험장·시험 현황", "전체 조회"],
            ["고객 클레임", "전체 조회 + 칸반 이동"],
            ["협력업체", "전체 조회 + 상세 Drawer"],
            ["인사·면담", "팀원 면담 이력 및 현황 조회"],
            ["외부정보", "시장·기술·경쟁사 동향 카드"],
            ["입찰 검토 AI", "최종 승인·반려"],
            ["지식 검색", "전체 이용"],
          ],
        },
      ],
    },
    {
      id: "dashboard-dir",
      title: "2. 메인 대시보드 읽는 법",
      content: [
        { type: "p", text: "로그인 후 메인 대시보드에서 5개 영역의 핵심 KPI를 한눈에 확인합니다. 이상 징후가 있는 영역은 빨간색으로 강조됩니다." },
        {
          type: "table",
          headers: ["카드 순서", "카드명", "확인 항목"],
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
          ],
        },
        { type: "tip", text: "신호등 체계: 🟢 정상 · 🟡 주의 · 🔴 이상. 각 영역 카드에 신호등 아이콘이 표시됩니다." },
        {
          type: "checklist",
          title: "피드백 포인트",
          items: [
            "메인 대시보드에서 의사결정에 필요한 정보를 즉시 파악할 수 있었나요?",
            "현재 5개 카드 외에 추가로 필요한 KPI가 있나요?",
            "카드 배치나 크기가 적절한가요?",
          ],
        },
      ],
    },
    {
      id: "claims-dir",
      title: "3. 클레임 현황",
      content: [
        { type: "p", text: "전사 고객 클레임 현황을 확인하고 장기 미처리 건을 파악합니다." },
        {
          type: "table",
          headers: ["확인 항목", "설명"],
          rows: [
            ["전체 미클로징", "현재 처리 중인 클레임 총 건수"],
            ["평균 처리 일수", "최근 접수건 기준 평균 소요 일수"],
            ["30일 초과 건", "한 달 이상 미클로징 — 즉시 조치 필요"],
          ],
        },
        { type: "tip", text: "30일 초과 건이 있을 경우 해당 카드 담당자를 확인하고 직접 조치를 지시하세요." },
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
        { type: "h3", text: "외부 정보 — 수집 동향 + 웹 검색" },
        {
          type: "steps",
          items: [
            "'외부 정보' 메뉴를 클릭합니다.",
            "'수집 동향' 탭: 사전 수집된 시장·기술·경쟁사 동향 카드를 영향도·카테고리 필터로 확인합니다. 카드 클릭으로 상세 내용과 출처를 봅니다.",
            "'외부 웹 검색' 탭: 검색창에 질문을 입력하면 실시간 외부 웹 정보를 최대 8건 검색합니다.",
            "검색 결과 카드 우측 외부링크 아이콘을 클릭하면 원문 페이지로 바로 이동합니다.",
          ],
        },
        { type: "tip", text: "웹 검색 예시: 'Prysmian 2026 해저케이블 수주', 'IEC 62067 개정 동향', 'NKT HVDC 경쟁사 기술 동향'" },
        {
          type: "checklist",
          title: "피드백 포인트",
          items: [
            "부문장이 주로 확인하는 정보가 빠진 것이 있나요?",
            "인사·면담 화면에서 추가로 있으면 좋을 정보가 있나요?",
            "외부 정보 웹 검색 결과의 품질과 속도가 만족스러운가요?",
          ],
        },
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
            "왼쪽 메뉴 '입찰검토시스템'을 클릭합니다.",
            "목록에서 상태가 '최종 승인 대기'인 건을 클릭합니다.",
            "AI 분석 내용 전체와 팀장 검토 의견을 확인합니다.",
            "부문장 메모(선택)를 입력하고 '최종 승인' 또는 '반려' 버튼을 클릭합니다.",
          ],
        },
        { type: "warn", text: "최종 승인 이후에는 수정이 제한됩니다. 충분히 검토한 후 승인하세요." },
        {
          type: "checklist",
          title: "피드백 포인트",
          items: [
            "최종 승인 화면에서 판단에 필요한 정보가 충분히 제공되었나요?",
            "AI 분석 신뢰도 지표(정확도 수치 등)가 있으면 유용할까요?",
            "승인 이후 결과물을 이메일이나 시스템으로 영업팀에 전달하는 기능이 필요한가요?",
          ],
        },
      ],
    },
    {
      id: "knowledge-dir",
      title: "6. 지식저장소(QKM) — IEC/CIGRE 지식 검색",
      content: [
        { type: "p", text: "규격·시장 동향·기술 기준을 자연어로 즉시 검색합니다. 회의 준비나 의사결정 참고 자료로 활용합니다." },
        {
          type: "steps",
          items: [
            "왼쪽 메뉴 '지식저장소(QKM)'을 클릭합니다.",
            "자연어로 질문을 입력합니다.",
            "AI가 내부 지식베이스와 규격 문서에서 답변을 생성합니다.",
          ],
        },
        {
          type: "table",
          headers: ["질문 예시", "활용 상황"],
          rows: [
            ["CIGRE TB 758 해저케이블 PD 판정 기준 요약", "회의 전 규격 확인"],
            ["최근 해저케이블 시장 경쟁사 동향", "전략 미팅 준비"],
            ["IEC 62067 초고압 케이블 시험 요건 요약", "입찰 판단 근거 확인"],
          ],
        },
      ],
    },
    {
      id: "admin-dir",
      title: "7. 사용자 관리",
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
  const role = session.user.role as Role

  if (!SECTIONS[role]) redirect("/")

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
            {ROLE_LABEL[role]} 역할에서 활용하는 주요 기능 안내입니다.
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
