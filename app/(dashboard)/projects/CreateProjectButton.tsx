"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, X } from "lucide-react"

type ApprovedTender = { id: string; title: string }

export default function CreateProjectButton({ approvedTenders }: { approvedTenders: ApprovedTender[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleCreate() {
    if (!selected) return
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/awarded-projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenderId: selected }),
      })
      if (!res.ok) {
        const j = await res.json() as { error?: string }
        throw new Error(j.error ?? "등록 실패")
      }
      const { id } = await res.json() as { id: string }
      router.push(`/projects/${id}`)
    } catch (e) {
      setError((e as Error).message)
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        수주 프로젝트 등록
      </button>

      {open && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900">수주 프로젝트 등록</h2>
              <button onClick={() => setOpen(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4">최종 승인된 입찰 건을 선택하면 수주 프로젝트로 등록됩니다.</p>
            <select
              value={selected}
              onChange={e => setSelected(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-4"
            >
              <option value="">-- 입찰 건 선택 --</option>
              {approvedTenders.map(t => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
            {error && <p className="text-xs text-rose-600 mb-3">{error}</p>}
            <div className="flex gap-2 justify-end">
              <button onClick={() => setOpen(false)} className="px-4 py-2 text-xs text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">
                취소
              </button>
              <button
                onClick={handleCreate}
                disabled={!selected || loading}
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
