"use client"

import { useEffect, useState } from "react"
import { X, CheckCircle, Sparkles } from "lucide-react"

const ROLE_GUIDE: Record<string, { badge: string; title: string; items: string[] }> = {
  DIRECTOR: {
    badge: "Executive View",
    title: "부문장 / 임원 대시보드 안내",
    items: [
      "전사 품질 KPI(시험·클레임·NCR·Q-Cost·협력사)를 한 화면에서 실시간 모니터링합니다.",
      "부문장 특별 지시 및 긴급 Alert 목록에서 즉각 조치가 필요한 건을 확인합니다.",
      "AI 입찰 검토 어시스턴트와 IEC/CIGRE RAG 지식 검색을 바로 실행합니다.",
      "좌측 메뉴에서 시험장·클레임·NCR·인사·외부정보 각 영역으로 이동합니다.",
    ],
  },
  TEAM_LEAD: {
    badge: "Team Leader View",
    title: "팀장 대시보드 안내",
    items: [
      "팀원들의 결재/검토 요청을 승인 또는 반려 처리합니다.",
      "팀 소속 가동 시험 현황, 미해결 NCR, 팀원 과부하 인원을 파악합니다.",
      "팀원 리소스 풀에서 각 구성원의 업무 부하도를 실시간으로 확인합니다.",
    ],
  },
  PRACTITIONER: {
    badge: "Operator View",
    title: "실무자 대시보드 안내",
    items: [
      "내 담당 업무(보고서·분석서·NCR 조치)의 진행 현황을 확인합니다.",
      "작성 완료 후 '검토 요청' 버튼으로 팀장에게 결재를 상신합니다.",
      "IEC/KS 규격 RAG 검색으로 합격 판정 기준을 신속하게 조회합니다.",
      "입찰 규격서 PDF를 업로드하면 AI가 독소 조항을 자동 분석합니다.",
    ],
  },
}

export function OnboardingModal({ userId, role }: { userId: string; role: string }) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!userId) return
    const key = `qms_welcomed_${userId}`
    if (!localStorage.getItem(key)) setShow(true)
  }, [userId])

  function dismiss() {
    if (userId) localStorage.setItem(`qms_welcomed_${userId}`, "1")
    setShow(false)
  }

  if (!show) return null

  const guide = ROLE_GUIDE[role] ?? ROLE_GUIDE.PRACTITIONER

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 space-y-6 animate-fade-in">
        <div className="flex items-start justify-between">
          <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-indigo-600" />
          </div>
          <button
            onClick={dismiss}
            className="text-slate-400 hover:text-slate-700 transition-colors p-1"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-1">
          <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-widest">
            QMS 2.0 AX Platform — {guide.badge}
          </span>
          <h2 className="text-lg font-black text-slate-900 mt-1">{guide.title}</h2>
          <p className="text-xs text-slate-500">아래 기능을 확인하고 대시보드를 시작하세요.</p>
        </div>

        <ul className="space-y-3">
          {guide.items.map((item, i) => (
            <li key={i} className="flex items-start gap-3 text-xs text-slate-700 leading-relaxed">
              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <button
          onClick={dismiss}
          className="w-full bg-slate-950 hover:bg-slate-800 text-white text-sm font-bold py-3 rounded-xl transition-colors"
        >
          대시보드 시작하기
        </button>
      </div>
    </div>
  )
}
