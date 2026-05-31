import { redirect } from "next/navigation"
import Link from "next/link"
import { requireActivePageSession } from "@/lib/session-guard"

const SECTIONS = {
  PRACTITIONER: [
    {
      id: "facilities",
      title: "1. 시험장·시험 현황",
      content: [
        { type: "p", text: "시험장별 설비 현황과 가동 상태를 확인합니다." },
        { type: "steps", items: [
          "왼쪽 메뉴에서 '시험장·시험 현황'을 클릭합니다.",
          "사업장(구미/동해) 탭에서 시험실·시험장 목록을 확인합니다.",
          "설비 카드를 클릭하면 상세 사양을 볼 수 있습니다.",
        ]},
        { type: "tip", text: "설비 상태는 도입연도 기준으로 자동 분류됩니다. (신규/정상/노후/도입예정)" },
      ],
    },
    {
      id: "claims",
      title: "2. 고객 클레임",
      content: [
        { type: "p", text: "접수된 클레임의 현재 처리 단계와 KPI를 확인합니다." },
        { type: "steps", items: [
          "왼쪽 메뉴에서 '고객 클레임'을 클릭합니다.",
          "칸반 보드에서 각 단계(접수·조사·대책·검증·클로징)별 클레임 건수를 확인합니다.",
          "카드를 클릭하면 클레임 상세 내용과 처리 이력을 확인할 수 있습니다.",
        ]},
        { type: "warn", text: "클레임 데이터는 현재 시범 운영 중인 샘플 데이터입니다. 실제 데이터 연동 전까지 참고용으로만 사용하세요." },
      ],
    },
    {
      id: "tra",
      title: "3. 입찰 검토 AI",
      content: [
        { type: "p", text: "입찰 시방서(PDF/DOCX)를 업로드하면 AI가 독소 조항·기술 리스크·누락 항목을 자동으로 분석해 Draft를 생성합니다." },
        { type: "steps", items: [
          "왼쪽 메뉴 '입찰 검토 AI'를 클릭합니다.",
          "오른쪽 상단 '+ 새 입찰 검토 시작' 버튼을 클릭합니다.",
          "입찰 시방서 파일(PDF 또는 DOCX)을 업로드합니다.",
          "'AI 분석 시작' 버튼을 클릭합니다. (수십 초 소요)",
          "분석 완료 후 독소 조항·기술 리스크·누락 항목을 확인합니다.",
          "내용을 검토·수정한 뒤 '검토 요청' 버튼으로 팀장에게 상신합니다.",
        ]},
        { type: "tip", text: "RAG 배지(📚)가 표시되면 내부 규격 지식베이스를 참조한 분석입니다. 더 정확한 결과를 의미합니다." },
        { type: "warn", text: "AI 분석 결과는 Draft입니다. 반드시 내용을 직접 검토하고 수정 후 상신하세요. 자동 확정되지 않습니다." },
      ],
    },
    {
      id: "knowledge",
      title: "4. IEC/KS 규격 지식 검색",
      content: [
        { type: "p", text: "IEC·KS·CIGRE 규격과 내부 지식베이스를 자연어로 검색합니다. 합격 판정 기준, 시험 방법, 규격 해석을 빠르게 확인할 수 있습니다." },
        { type: "steps", items: [
          "왼쪽 메뉴 '지식 검색'을 클릭합니다.",
          "검색창에 질문을 자연어로 입력합니다. (예: '초고압 케이블 PD 측정 합격 기준은?')",
          "AI가 관련 규격과 내부 노트에서 답변을 생성합니다.",
          "출처 문서를 확인해 원문을 참조할 수 있습니다.",
        ]},
        { type: "tip", text: "짧은 키워드보다 구체적인 질문 문장으로 검색할수록 더 정확한 결과를 얻습니다." },
      ],
    },
    {
      id: "feedback-guide",
      title: "5. 피드백 남기기",
      content: [
        { type: "p", text: "시스템 사용 중 불편한 점이나 개선 요청을 피드백 게시판에 남겨주세요." },
        { type: "steps", items: [
          "왼쪽 하단 '피드백'을 클릭합니다.",
          "내용을 입력하고, 필요하면 화면 캡처를 첨부합니다.",
          "'피드백 등록' 버튼을 클릭합니다.",
        ]},
        { type: "tip", text: "화면 캡처를 첨부하면 문제 파악이 훨씬 빨라집니다." },
      ],
    },
  ],
  TEAM_LEAD: [
    {
      id: "facilities-tl",
      title: "1. 시험장·시험 현황",
      content: [
        { type: "p", text: "팀 담당 시험장의 설비 가동률과 노후 현황을 확인합니다." },
        { type: "steps", items: [
          "'시험장·시험 현황' 메뉴에서 전체 설비 현황을 확인합니다.",
          "노후 설비 카드에서 교체 진행 여부를 파악합니다.",
          "설비 상태 필터로 원하는 상태만 모아볼 수 있습니다.",
        ]},
      ],
    },
    {
      id: "claims-tl",
      title: "2. 고객 클레임",
      content: [
        { type: "p", text: "클레임 처리 현황을 팀 단위로 모니터링합니다." },
        { type: "table", headers: ["KPI", "의미", "확인 위치"], rows: [
          ["미클로징 건수", "아직 클로징되지 않은 클레임 수", "클레임 페이지 상단 KPI 카드"],
          ["평균 처리 일수", "접수~클로징까지 평균 소요 일수", "클레임 페이지 상단 KPI 카드"],
        ]},
        { type: "tip", text: "오래된 미클로징 클레임은 카드 색상으로 구분됩니다." },
      ],
    },
    {
      id: "vendors-tl",
      title: "3. 협력업체",
      content: [
        { type: "p", text: "원자재·외주 협력업체 현황과 등급을 확인합니다." },
        { type: "steps", items: [
          "'협력업체' 메뉴에서 카테고리 탭(원자재/반제품 외주/상품 외주)을 선택합니다.",
          "등급별 색상 카드로 협력업체 현황을 파악합니다.",
        ]},
      ],
    },
    {
      id: "tra-tl",
      title: "4. 입찰 검토 AI — 팀장 검토·승인",
      content: [
        { type: "p", text: "팀원(실무자)이 상신한 입찰 분석 Draft를 검토하고 승인 또는 반려 처리합니다." },
        { type: "steps", items: [
          "왼쪽 메뉴 '입찰 검토 AI'를 클릭합니다.",
          "목록에서 '검토 요청' 상태인 건을 클릭합니다.",
          "AI 분석 내용(독소 조항·리스크·누락 항목)을 검토합니다.",
          "'승인' 또는 '반려' 버튼으로 처리합니다. 반려 시 사유를 입력합니다.",
        ]},
        { type: "warn", text: "승인한 건은 부문장 최종 승인 단계로 넘어갑니다. 반려 시 실무자에게 반환됩니다." },
      ],
    },
    {
      id: "knowledge-tl",
      title: "5. IEC/KS 규격 지식 검색",
      content: [
        { type: "p", text: "입찰 검토 또는 클레임 대응 시 규격 기준을 빠르게 확인합니다." },
        { type: "steps", items: [
          "왼쪽 메뉴 '지식 검색'을 클릭합니다.",
          "자연어로 질문을 입력합니다. (예: 'XLPE 절연 두께 허용 편차 기준은?')",
          "AI가 관련 규격과 내부 지식베이스에서 답변을 생성합니다.",
        ]},
      ],
    },
  ],
  DIRECTOR: [
    {
      id: "overview",
      title: "1. 전체 현황 파악",
      content: [
        { type: "p", text: "대시보드에서 5개 영역의 핵심 KPI를 한눈에 확인합니다." },
        { type: "steps", items: [
          "메인 대시보드에서 각 영역별 요약 카드를 확인합니다.",
          "이상 징후가 있는 영역은 빨간색으로 표시됩니다.",
          "카드 클릭으로 해당 영역 상세 화면으로 이동합니다.",
        ]},
        { type: "tip", text: "신호등 체계: 🟢 정상 · 🟡 주의 · 🔴 이상" },
      ],
    },
    {
      id: "claims-dir",
      title: "2. 클레임 현황",
      content: [
        { type: "p", text: "전사 고객 클레임 현황을 확인하고 장기 미처리 건을 파악합니다." },
        { type: "table", headers: ["확인 항목", "설명"], rows: [
          ["전체 미클로징", "현재 처리 중인 클레임 총 건수"],
          ["평균 처리 일수", "최근 30일 기준 평균 소요 일수"],
          ["30일 초과 건", "한 달 이상 미클로징인 긴급 처리 대상"],
        ]},
      ],
    },
    {
      id: "vendors-dir",
      title: "3. 협력업체·인사·외부정보",
      content: [
        { type: "p", text: "협력업체 SRM 현황, 인사·면담 현황, 경쟁사·고객 정보를 확인합니다." },
        { type: "steps", items: [
          "왼쪽 메뉴에서 각 섹션을 순서대로 확인합니다.",
          "협력업체: 등급별 현황 및 리스크 파악",
          "인사·면담: 팀원별 면담 이력 및 현황",
          "외부정보: 경쟁사·고객 동향 카드",
        ]},
      ],
    },
    {
      id: "tra-dir",
      title: "4. 입찰 검토 AI — 부문장 최종 승인",
      content: [
        { type: "p", text: "팀장 검토를 통과한 입찰 분석 결과를 최종 승인합니다." },
        { type: "steps", items: [
          "왼쪽 메뉴 '입찰 검토 AI'를 클릭합니다.",
          "목록에서 '최종 승인 대기' 상태인 건을 클릭합니다.",
          "분석 내용과 팀장 검토 의견을 확인합니다.",
          "부문장 메모를 입력하고 '최종 승인' 또는 '반려'를 처리합니다.",
        ]},
        { type: "tip", text: "최종 승인 후 해당 건은 영업팀에 전달 가능한 상태가 됩니다." },
      ],
    },
    {
      id: "knowledge-dir",
      title: "5. IEC/CIGRE 지식 검색",
      content: [
        { type: "p", text: "규격·시장 동향·기술 기준을 자연어로 즉시 검색합니다. 회의 준비나 의사결정 참고자료로 활용합니다." },
        { type: "steps", items: [
          "왼쪽 메뉴 '지식 검색'을 클릭합니다.",
          "자연어로 질문을 입력합니다. (예: 'CIGRE TB 758 해저케이블 PD 판정 기준')",
          "AI가 내부 지식베이스와 규격 문서에서 답변을 생성합니다.",
        ]},
      ],
    },
    {
      id: "admin-dir",
      title: "6. 사용자 관리",
      content: [
        { type: "p", text: "회원가입 신청을 승인하고 역할을 부여합니다." },
        { type: "steps", items: [
          "왼쪽 하단 '사용자 관리'를 클릭합니다.",
          "PENDING 상태의 신청자를 확인합니다.",
          "역할(실무자/팀장/임원)을 선택하고 승인합니다.",
        ]},
        { type: "warn", text: "역할 부여 후 해당 사용자는 재로그인해야 변경된 권한이 적용됩니다." },
      ],
    },
  ],
} as const

type Role = keyof typeof SECTIONS
type SectionItem = { id: string; title: string; content: ContentBlock[] }
type ContentBlock =
  | { type: "p"; text: string }
  | { type: "tip" | "warn"; text: string }
  | { type: "steps"; items: string[] }
  | { type: "table"; headers: string[]; rows: string[][] }

function renderBlock(block: ContentBlock, i: number) {
  if (block.type === "p") {
    return <p key={i} className="text-sm text-zinc-600 leading-relaxed">{block.text}</p>
  }
  if (block.type === "tip") {
    return (
      <div key={i} className="text-sm bg-blue-50 border-l-4 border-blue-400 px-4 py-2.5 rounded-r text-blue-800">
        <span className="font-semibold">TIP · </span>{block.text}
      </div>
    )
  }
  if (block.type === "warn") {
    return (
      <div key={i} className="text-sm bg-amber-50 border-l-4 border-amber-400 px-4 py-2.5 rounded-r text-amber-800">
        <span className="font-semibold">주의 · </span>{block.text}
      </div>
    )
  }
  if (block.type === "steps") {
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
  }
  if (block.type === "table") {
    return (
      <table key={i} className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-zinc-100">
            {block.headers.map((h, j) => (
              <th key={j} className="px-3 py-2 text-left font-semibold text-zinc-700 border border-zinc-200">{h}</th>
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
    )
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
            {sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="text-sm text-zinc-600 hover:text-zinc-900 hover:underline">
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-4">
          {sections.map((section) => (
            <GuideSection key={section.id} section={section} />
          ))}
        </div>

        <div className="mt-8 text-center text-xs text-zinc-400">
          다른 역할의 가이드는 관리자에게 문의하세요.
        </div>
      </div>
    </div>
  )
}
