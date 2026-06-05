"use client"

import { useState } from "react"
import { AlertTriangle, ChevronDown, ChevronUp } from "lucide-react"

type Gap = {
  id: string
  category: string
  tenderItem: string
  contractItem: string
  gapType: string
  isRisk: boolean
  sourcePage: number | null
  remark: string | null
}

type GapBadge = { label: string; cls: string }

export default function GapAnalysisView({
  gaps,
  gapTypeBadge,
  analysisStatus,
  aiUsed,
  hasTender,
}: {
  gaps: Gap[]
  gapTypeBadge: Record<string, GapBadge>
  analysisStatus: string
  aiUsed: string | null
  hasTender: boolean
}) {
  const [filter, setFilter] = useState<string>("ALL")
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const categories = Array.from(new Set(gaps.map(g => g.category)))
  const riskCount = gaps.filter(g => g.isRisk).length
  const gapCount  = gaps.filter(g => g.gapType === "GAP").length
  const newCount  = gaps.filter(g => g.gapType === "NEW").length

  const filtered = filter === "ALL" ? gaps :
    filter === "RISK" ? gaps.filter(g => g.isRisk) :
    gaps.filter(g => g.gapType === filter)

  function toggle(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const statusBadge: Record<string, string> = {
    DRAFT:    "bg-slate-100 text-slate-500",
    REVIEWED: "bg-blue-50 text-blue-700",
    APPROVED: "bg-emerald-50 text-emerald-700",
  }
  const statusLabel: Record<string, string> = {
    DRAFT: "작성 중", REVIEWED: "팀장 승인", APPROVED: "최종 승인",
  }

  return (
    <section className="bg-white rounded-xl border border-slate-200">
      {/* 헤더 요약 */}
      <div className="px-5 py-4 border-b border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-800">{hasTender ? "갭 분석 결과" : "리스크 분석 결과"} ({gaps.length}건)</h2>
          <div className="flex items-center gap-2">
            {aiUsed && <span className="text-[10px] text-slate-400">by {aiUsed}</span>}
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusBadge[analysisStatus] ?? statusBadge.DRAFT}`}>
              {statusLabel[analysisStatus] ?? analysisStatus}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {riskCount > 0 && (
            <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-semibold">
              <AlertTriangle className="w-3 h-3" /> 리스크 {riskCount}건
            </span>
          )}
          <span className="text-xs px-2 py-1 rounded-full bg-rose-50 text-rose-600 border border-rose-200">차이 {gapCount}건</span>
          <span className="text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-600 border border-amber-200">신규 {newCount}건</span>
          <span className="text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
            일치 {gaps.filter(g => g.gapType === "MATCH").length}건
          </span>
        </div>
      </div>

      {/* 필터 */}
      <div className="px-5 py-2 border-b border-slate-50 flex gap-2 flex-wrap">
        {(["ALL", "RISK", "GAP", "NEW", "RELAXED", "MATCH"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
              filter === f ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {f === "ALL" ? "전체" : f === "RISK" ? "리스크만" : gapTypeBadge[f]?.label ?? f}
            {f !== "ALL" && f !== "RISK" && ` (${gaps.filter(g => g.gapType === f).length})`}
            {f === "RISK" && ` (${riskCount})`}
          </button>
        ))}
      </div>

      {/* 갭 목록 */}
      <div className="divide-y divide-slate-50">
        {filtered.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-8 italic">해당 항목이 없습니다.</p>
        ) : filtered.map(g => {
          const badge = gapTypeBadge[g.gapType] ?? { label: g.gapType, cls: "bg-slate-50 text-slate-500 border-slate-200" }
          const isOpen = expanded.has(g.id)
          return (
            <div key={g.id} className={`px-5 py-3 ${g.isRisk ? "bg-rose-50/30" : ""}`}>
              <button className="w-full text-left" onClick={() => toggle(g.id)}>
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{g.category}</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badge.cls}`}>{badge.label}</span>
                      {g.isRisk && <span className="flex items-center gap-0.5 text-[10px] text-rose-600 font-bold"><AlertTriangle className="w-3 h-3" />리스크</span>}
                      {g.sourcePage && <span className="text-[10px] text-slate-400">p.{g.sourcePage}</span>}
                    </div>
                    <p className="text-xs text-slate-800 mt-1.5 font-medium leading-relaxed line-clamp-2">{g.contractItem}</p>
                  </div>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0 mt-1" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 mt-1" />}
                </div>
              </button>
              {isOpen && (
                <div className="mt-3 space-y-2 ml-0">
                  <div className={hasTender ? "grid grid-cols-2 gap-3" : ""}>
                    {hasTender && g.tenderItem && g.tenderItem !== "해당 없음" && (
                      <div className="bg-indigo-50/50 rounded-lg p-3 border border-indigo-100">
                        <p className="text-[10px] font-bold text-indigo-600 mb-1">입찰 약속</p>
                        <p className="text-xs text-slate-700 leading-relaxed">{g.tenderItem}</p>
                      </div>
                    )}
                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-500 mb-1">{hasTender ? "계약서 요구사항" : "계약 요구사항"}</p>
                      <p className="text-xs text-slate-700 leading-relaxed">{g.contractItem}</p>
                    </div>
                  </div>
                  {g.remark && (
                    <div className="bg-amber-50 rounded-lg p-2.5 border border-amber-100">
                      <p className="text-[10px] font-bold text-amber-600 mb-0.5">비고</p>
                      <p className="text-xs text-slate-700">{g.remark}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
