"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronDown, ChevronUp, Trash2, Globe } from "lucide-react"

type Req = {
  id: string
  category: string
  content: string
  sourcePage: number | null
  isRisk: boolean
  isVE: boolean
  comply: string | null
}

type AnalysisSummary = {
  id: string
  createdAt: string
  aiUsed: string | null
  ragChunkCount: number
  webContextApplied: boolean
  requirementCount: number
  requirements: Req[]
  documentName: string | null
}

const complyLabel: Record<string, string> = {
  COMPLY: "부합",
  NON_COMPLY: "불부합",
  TBD: "검토중",
}
const complyStyle: Record<string, string> = {
  COMPLY: "bg-emerald-50 text-emerald-700 border-emerald-100",
  NON_COMPLY: "bg-rose-50 text-rose-700 border-rose-100",
  TBD: "bg-amber-50 text-amber-700 border-amber-100",
}

export default function AnalysisHistory({
  analyses,
  canDelete,
}: {
  analyses: AnalysisSummary[]
  canDelete: boolean
}) {
  const router = useRouter()
  const [openIds, setOpenIds] = useState<Set<string>>(new Set())
  const [deletingId, setDeletingId] = useState<string | null>(null)

  function toggle(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleDelete(id: string, idx: number) {
    if (!confirm(`분석 이력 ${idx + 1}번을 삭제하시겠습니까? 요구사항 데이터도 함께 삭제됩니다.`)) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/analysis/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        alert((d as { error?: string }).error ?? "삭제 실패")
        return
      }
      router.refresh()
    } catch { alert("네트워크 오류가 발생했습니다.") }
    finally { setDeletingId(null) }
  }

  if (analyses.length === 0) return null

  return (
    <section className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-3">
      <h2 className="text-xs font-extrabold text-slate-400 tracking-wider uppercase flex items-center gap-1.5 border-b pb-2">
        분석 이력 ({analyses.length}건) — 최신순
      </h2>

      <div className="space-y-2">
        {analyses.map((a, idx) => {
          const isOpen = openIds.has(a.id)
          const isLatest = idx === 0
          return (
            <div key={a.id} className={`border rounded-xl overflow-hidden transition-all ${isLatest ? "border-indigo-200 bg-indigo-50/30" : "border-slate-100"}`}>
              {/* 헤더 행 */}
              <div className="flex items-center justify-between px-4 py-3">
                <button
                  type="button"
                  onClick={() => toggle(a.id)}
                  className="flex items-center gap-3 text-left flex-1 min-w-0"
                >
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    {isLatest && (
                      <span className="shrink-0 text-[9px] font-extrabold px-2 py-0.5 bg-indigo-600 text-white rounded-full">최신</span>
                    )}
                    <span className="text-[10px] font-bold text-slate-600">
                      #{analyses.length - idx} · {new Date(a.createdAt).toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {a.documentName && (
                      <span className="text-[9px] text-slate-400 truncate max-w-[180px]">{a.documentName}</span>
                    )}
                    <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 rounded text-slate-500 font-bold">
                      AI: {a.aiUsed ?? "—"}
                    </span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold border ${a.ragChunkCount > 0 ? "bg-violet-50 text-violet-600 border-violet-100" : "bg-slate-50 text-slate-400 border-slate-100"}`}>
                      RAG: {a.ragChunkCount > 0 ? `${a.ragChunkCount}청크` : "미적용"}
                    </span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold border flex items-center gap-0.5 ${a.webContextApplied ? "bg-sky-50 text-sky-600 border-sky-100" : "bg-slate-50 text-slate-400 border-slate-100"}`}>
                      <Globe className="w-2.5 h-2.5" /> 웹: {a.webContextApplied ? "포함" : "미포함"}
                    </span>
                    <span className="text-[9px] text-slate-500 font-bold">요구사항 {a.requirementCount}건</span>
                  </div>
                  <span className="shrink-0 text-slate-400 ml-2">
                    {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </span>
                </button>

                {canDelete && (
                  <button
                    type="button"
                    onClick={() => handleDelete(a.id, idx)}
                    disabled={deletingId === a.id}
                    className="ml-3 shrink-0 text-slate-300 hover:text-rose-500 transition-colors disabled:opacity-40"
                    title="이 분석 이력 삭제"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* 펼쳐진 요구사항 목록 */}
              {isOpen && (
                <div className="border-t border-slate-100 px-4 py-3 space-y-2 bg-white/60">
                  {a.requirements.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-2">추출된 요구사항이 없습니다.</p>
                  ) : (
                    <ul className="space-y-2.5">
                      {a.requirements.map((r) => (
                        <li key={r.id} className="border-b last:border-0 pb-2 last:pb-0">
                          <div className="flex items-center gap-1.5 flex-wrap mb-1">
                            <span className="text-[8px] px-1.5 py-0.5 bg-slate-100 border rounded text-slate-500 font-bold uppercase">{r.category}</span>
                            {r.isRisk && <span className="text-[8px] px-1.5 py-0.5 bg-rose-50 border border-rose-100 rounded text-rose-700 font-extrabold">RISK</span>}
                            {r.isVE && <span className="text-[8px] px-1.5 py-0.5 bg-blue-50 border border-blue-100 rounded text-blue-700 font-extrabold">VE</span>}
                            {r.sourcePage && <span className="text-[9px] text-slate-400 font-mono">p.{r.sourcePage}</span>}
                            {r.comply && (
                              <span className={`text-[8px] px-1.5 py-0.5 rounded border font-bold ${complyStyle[r.comply] ?? ""}`}>
                                {complyLabel[r.comply] ?? r.comply}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-700 leading-relaxed">{r.content}</p>
                        </li>
                      ))}
                    </ul>
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
