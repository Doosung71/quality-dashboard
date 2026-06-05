"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, X, Link as LinkIcon, FileText } from "lucide-react"

type ApprovedTender = { id: string; title: string }
type Mode = "tender" | "standalone"

export default function CreateProjectButton({ approvedTenders }: { approvedTenders: ApprovedTender[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<Mode>("standalone")
  const [selected, setSelected] = useState("")
  const [title, setTitle] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  function handleOpen() {
    setMode("tender")
    setSelected("")
    setTitle("")
    setError("")
    setOpen(true)
  }

  async function handleCreate() {
    setLoading(true)
    setError("")
    try {
      const body = mode === "tender"
        ? { tenderId: selected }
        : { title: title.trim() }

      const res = await fetch("/api/awarded-projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const j = await res.json() as { error?: string }
        throw new Error(j.error ?? "등록 실패")
      }
      const { id } = await res.json() as { id: string }
      setOpen(false)
      router.push(`/projects/${id}`)
    } catch (e) {
      setError((e as Error).message)
      setLoading(false)
    }
  }

  const canSubmit = mode === "tender" ? !!selected : title.trim().length > 0

  return (
    <>
      <button
        onClick={handleOpen}
        className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shrink-0"
      >
        <Plus className="w-3.5 h-3.5" />
        수주 프로젝트 등록
      </button>

      {open && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-slate-900">수주 프로젝트 등록</h2>
              <button onClick={() => setOpen(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 모드 선택 탭 */}
            <div className="flex rounded-lg border border-slate-200 overflow-hidden mb-5">
              <button
                onClick={() => setMode("standalone")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors ${
                  mode === "standalone"
                    ? "bg-emerald-600 text-white"
                    : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                수의계약 (직접 등록)
              </button>
              <button
                onClick={() => setMode("tender")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors ${
                  mode === "tender"
                    ? "bg-emerald-600 text-white"
                    : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                <LinkIcon className="w-3.5 h-3.5" />
                입찰 연계
              </button>
            </div>

            {/* 수의계약 모드 */}
            {mode === "standalone" && (
              <div className="space-y-3">
                <p className="text-xs text-slate-500">
                  입찰 검토 없이 계약서를 직접 업로드하고 AI가 리스크를 분석합니다.
                </p>
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1.5">프로젝트명 *</label>
                  <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="예: A사 154kV 케이블 공급 계약"
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    autoFocus
                  />
                </div>
              </div>
            )}

            {/* 입찰 연계 모드 */}
            {mode === "tender" && (
              <div className="space-y-3">
                <p className="text-xs text-slate-500">
                  최종 승인된 입찰 건을 선택하면 입찰 요구사항과 계약서를 비교 분석합니다.
                </p>
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1.5">연계 입찰 선택 *</label>
                  <select
                    value={selected}
                    onChange={e => setSelected(e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">-- 입찰 건 선택 --</option>
                    {approvedTenders.map(t => (
                      <option key={t.id} value={t.id}>{t.title}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {error && <p className="text-xs text-rose-600 mt-3">{error}</p>}

            <div className="flex gap-2 justify-end mt-5">
              <button
                onClick={() => setOpen(false)}
                className="px-4 py-2 text-xs text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                취소
              </button>
              <button
                onClick={handleCreate}
                disabled={!canSubmit || loading}
                className="px-4 py-2 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                {loading ? "등록 중..." : "프로젝트 생성"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
