"use client"

import { useEffect, useState } from "react"
import { X, CheckCircle, ChevronRight, ChevronLeft, Sparkles } from "lucide-react"

// ── 공통: 공지사항 (Step 1) ──────────────────────────────
const NOTICE = {
  badge: "E2E-1 검증 단계 — 2026년 6월",
  title: "시작 전 꼭 읽어주세요",
  items: [
    {
      icon: "🚧",
      label: "PoC 시스템",
      desc: "대시보드·클레임·협력업체 데이터는 샘플입니다. 실제 원가·견적·진행 중 입찰 데이터는 절대 입력하지 마세요.",
    },
    {
      icon: "✅",
      label: "실제 저장",
      desc: "회원가입 정보와 입찰 검토 분석 이력은 실제 DB에 저장됩니다. 비민감 샘플 시방서만 사용하세요.",
    },
    {
      icon: "💬",
      label: "피드백 필수",
      desc: "막힌 곳, 빠진 기능, 불편한 UX를 사이드바 하단 '피드백' 메뉴로 남겨주세요. 모든 피드백이 개선에 반영됩니다.",
    },
    {
      icon: "🔑",
      label: "비밀번호 분실",
      desc: "잊어버리면 관리자(신두성 doosung71@gmail.com)에게 요청하세요. 임시 비밀번호를 즉시 발급해 드립니다.",
    },
  ],
}

// ── 역할별: 메뉴 구조 (Step 2) ──────────────────────────
type MenuItem = { icon: string; path: string; desc: string; sub?: string[] }
const MENU: Record<string, MenuItem[]> = {
  DIRECTOR: [
    { icon: "💰", path: "품질비용(Q-Cost)", desc: "Q-Cost KPI 총괄", sub: ["고객 클레임", "부적합품보고(NCR)"] },
    { icon: "🏭", path: "공급망관리", desc: "협력업체 A/B/C/D 등급 카드 및 품질 지표" },
    { icon: "📚", path: "지식저장소(QKM)", desc: "IEC·KS·CIGRE 규격 자연어 RAG 검색" },
    { icon: "🔬", path: "시험장·시험 현황", desc: "구미·동해 설비 가동 상태·노후도" },
    { icon: "🔍", path: "입찰검토시스템", desc: "시방서 PDF → AI 독소조항·리스크 분석·최종 승인" },
    { icon: "🌐", path: "외부 정보", desc: "수집 동향 카드 + 실시간 외부 웹검색 (탭 전환)" },
    { icon: "👥", path: "인사·면담", desc: "팀원 현황 및 면담 이력" },
  ],
  TEAM_LEAD: [
    { icon: "💰", path: "품질비용(Q-Cost)", desc: "Q-Cost KPI — 조회 전용", sub: ["고객 클레임 (조회)", "부적합품보고 NCR (조회)"] },
    { icon: "🏭", path: "공급망관리", desc: "협력업체 현황 — 조회 전용" },
    { icon: "📚", path: "지식저장소(QKM)", desc: "규격 자연어 RAG 검색" },
    { icon: "🔬", path: "시험장·시험 현황", desc: "설비 가동 상태 — 조회 전용" },
    { icon: "🔍", path: "입찰검토시스템", desc: "실무자 Draft 1차 검토·승인·반려" },
    { icon: "🌐", path: "외부 정보", desc: "수집 동향 + 실시간 웹검색 — 조회 전용" },
  ],
  PRACTITIONER: [
    { icon: "💰", path: "품질비용(Q-Cost)", desc: "하위 메뉴로 이동", sub: ["고객 클레임 (조회)", "부적합품보고 NCR"] },
    { icon: "🏭", path: "공급망관리", desc: "협력업체 현황 — 조회 전용" },
    { icon: "📚", path: "지식저장소(QKM)", desc: "IEC·KS·CIGRE 규격 자연어 RAG 검색" },
    { icon: "🔬", path: "시험장·시험 현황", desc: "담당 설비 현황 — 조회 전용" },
    { icon: "🔍", path: "입찰검토시스템", desc: "시방서 PDF 업로드 → AI 분석 → 팀장 상신" },
  ],
}

// ── 역할별: 핵심 행동 (Step 3) ──────────────────────────
const ACTIONS: Record<string, { title: string; items: string[] }> = {
  DIRECTOR: {
    title: "지금 바로 확인할 것",
    items: [
      "메인 대시보드: ①Q-Cost → ②클레임 → ③NCR → ④공급망 → ⑤시험장 순서로 KPI 이상 여부 점검",
      "긴급 Alert 섹션에서 Overdue NCR·과부하 인원 즉시 파악 후 조치 지시",
      "입찰검토시스템 → '최종 승인 대기' 건 검토·승인",
      "외부 정보 → '외부 웹 검색' 탭에서 시장·기술 동향 실시간 검색",
      "좌측 하단 '피드백'으로 개선 요청 수시 등록",
    ],
  },
  TEAM_LEAD: {
    title: "주요 업무 흐름",
    items: [
      "입찰검토시스템 → '검토 요청' 상태 건 클릭 → 항목별 검토 → 승인 or 반려",
      "품질비용 하위 메뉴(클레임·NCR)에서 팀 현황 조회",
      "공급망관리에서 C·D등급 협력업체 모니터링",
      "외부 정보 → '외부 웹 검색' 탭에서 경쟁사·기술 동향 조회",
      "좌측 하단 '피드백'으로 개선 요청 수시 등록",
    ],
  },
  PRACTITIONER: {
    title: "주요 업무 흐름",
    items: [
      "입찰검토시스템: 시방서 PDF 업로드 → AI 분석 결과 검토·수정 → '검토 요청'으로 팀장 상신",
      "지식저장소(QKM): 규격 기준·합격 판정 자연어 검색으로 분석 내용 보완",
      "시험장·시험 현황: 담당 설비 상태·교정 주기 조회",
      "불편하거나 막히는 점은 즉시 사이드바 하단 '피드백'에 남겨주세요",
    ],
  },
}

const TOTAL_STEPS = 3

export function OnboardingModal({ userId, role }: { userId: string; role: string }) {
  const [show, setShow] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (!userId) return
    // v2 키로 변경 → 기존 사용자도 업데이트된 온보딩 다시 노출
    const key = `qms_welcomed_v2_${userId}`
    if (!localStorage.getItem(key)) setShow(true)
  }, [userId])

  function dismiss() {
    if (userId) localStorage.setItem(`qms_welcomed_v2_${userId}`, "1")
    setShow(false)
  }

  if (!show) return null

  const menuItems = MENU[role] ?? MENU.PRACTITIONER
  const actions = ACTIONS[role] ?? ACTIONS.PRACTITIONER

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full animate-fade-in flex flex-col" style={{ maxHeight: "90vh" }}>
        {/* 헤더 */}
        <div className="px-8 pt-8 pb-4 shrink-0">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-widest block">
                  QMS 2.0 Platform
                </span>
                <span className="text-[11px] text-slate-400">
                  {step + 1} / {TOTAL_STEPS} 단계
                </span>
              </div>
            </div>
            <button onClick={dismiss} className="text-slate-400 hover:text-slate-700 transition-colors p-1" aria-label="닫기">
              <X className="w-5 h-5" />
            </button>
          </div>
          {/* 진행 바 */}
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-300"
              style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
            />
          </div>
        </div>

        {/* 콘텐츠 (스크롤 가능) */}
        <div className="px-8 overflow-y-auto flex-1">

          {/* Step 1: 공지사항 */}
          {step === 0 && (
            <div className="space-y-4 pb-2">
              <div>
                <span className="inline-block text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-100 px-2.5 py-0.5 rounded-full">
                  {NOTICE.badge}
                </span>
                <h2 className="text-lg font-black text-slate-900 mt-2">{NOTICE.title}</h2>
              </div>
              <div className="space-y-3">
                {NOTICE.items.map((item, i) => (
                  <div key={i} className="flex gap-3 bg-slate-50 rounded-xl px-4 py-3">
                    <span className="text-xl shrink-0 leading-none">{item.icon}</span>
                    <div className="text-sm">
                      <span className="font-bold text-slate-800">{item.label}: </span>
                      <span className="text-slate-600 leading-relaxed">{item.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: 메뉴 구조 */}
          {step === 1 && (
            <div className="space-y-4 pb-2">
              <div>
                <h2 className="text-lg font-black text-slate-900">새 사이드바 메뉴 구조</h2>
                <p className="text-xs text-slate-400 mt-0.5">경영자 우선순위(손익·비용) 기준으로 재정렬됐습니다.</p>
              </div>
              <div className="space-y-2">
                {menuItems.map((item, i) => (
                  <div key={i} className="bg-slate-50 rounded-xl px-3.5 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className="text-base shrink-0">{item.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold text-slate-800">{item.path}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                    {item.sub && (
                      <div className="ml-8 mt-1.5 pl-3 border-l-2 border-slate-200 space-y-0.5">
                        {item.sub.map((s, j) => (
                          <p key={j} className="text-[11px] text-slate-500">└ {s}</p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: 핵심 행동 */}
          {step === 2 && (
            <div className="space-y-4 pb-2">
              <div>
                <h2 className="text-lg font-black text-slate-900">{actions.title}</h2>
                <p className="text-xs text-slate-400 mt-0.5">지금 바로 시작해보세요.</p>
              </div>
              <ul className="space-y-3">
                {actions.items.map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-slate-700">
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
              <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700 leading-relaxed">
                상세 기능 설명은 사이드바 하단 <strong>사용 가이드</strong> 메뉴에서 언제든지 확인할 수 있습니다.
              </div>
            </div>
          )}
        </div>

        {/* 네비게이션 버튼 */}
        <div className="px-8 py-6 shrink-0 flex gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep(s => s - 1)}
              className="flex items-center gap-1.5 px-4 py-2.5 border border-slate-200 text-slate-600 text-sm font-bold rounded-xl hover:bg-slate-50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> 이전
            </button>
          )}
          {step < TOTAL_STEPS - 1 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              className="flex-1 bg-slate-950 hover:bg-slate-800 text-white text-sm font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1.5"
            >
              다음 <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={dismiss}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold py-2.5 rounded-xl transition-colors"
            >
              대시보드 시작하기 🚀
            </button>
          )}
        </div>
      </div>
    </div>
  )
}