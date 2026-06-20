"use client"

import { useState } from "react"
import { ShieldCheck, ChevronDown, ChevronUp, Loader2, CheckCircle2, Sparkles } from "lucide-react"

interface Props {
  type: "ncr" | "claim"
  id: string
  /** 교훈 확정 권한 (해당 산출물 쓰기 권한자). 없으면 초안 열람만 가능. */
  canVerify: boolean
}

// Q4 producer — 종결 산출물의 AI 교훈 초안을 사람이 검토·편집·확정해 verified_lesson(1.5)으로 적재.
export function VerifiedLessonPanel({ type, id, canVerify }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fetched, setFetched] = useState(false)
  const [content, setContent] = useState("")
  const [existing, setExisting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleOpen() {
    const next = !open
    setOpen(next)
    if (next && !fetched) {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/ai/verified-lesson?type=${type}&id=${id}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? `서버 오류 (${res.status})`)
        setContent(data.content ?? "")
        setExisting(!!data.existing)
        setFetched(true)
      } catch (e) {
        setError(e instanceof Error ? e.message : "교훈 초안을 불러오지 못했습니다.")
      } finally {
        setLoading(false)
      }
    }
  }

  async function handleConfirm() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/ai/verified-lesson", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, id, content }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `서버 오류 (${res.status})`)
      setExisting(true)
    } catch (e) {
      // fail-closed — 실패를 조용히 삼키지 않고 표시
      setError(e instanceof Error ? e.message : "교훈 확정에 실패했습니다.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-linear-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100 shadow-sm overflow-hidden">
      {/* 헤더 */}
      <button
        onClick={handleOpen}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-emerald-50/60 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-bold text-emerald-900">교훈 확정 (Lessons Learned)</span>
          {fetched && existing && (
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> 확정됨
            </span>
          )}
          <span className="text-[9px] font-medium text-emerald-500 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-full">
            지식 선순환 · 외부 AI API 전송
          </span>
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-emerald-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-emerald-400" />
        )}
      </button>

      {/* 펼침 영역 */}
      {open && (
        <div className="px-6 pb-6 space-y-3 border-t border-emerald-100">
          {loading && (
            <div className="flex items-center gap-2 py-4 text-emerald-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-xs">교훈 초안 생성 중...</span>
            </div>
          )}

          {error && (
            <p className="text-xs text-rose-600 bg-rose-50 rounded-xl px-3 py-2 mt-3">{error}</p>
          )}

          {!loading && fetched && (
            <>
              <div className="mt-3 flex items-center gap-1.5 text-[10px] font-bold text-emerald-500 uppercase tracking-wider">
                <Sparkles className="w-3 h-3" />
                {existing ? "확정된 교훈 (수정 후 재확정 가능)" : "AI 교훈 초안 (검토 후 확정하세요)"}
              </div>

              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                disabled={!canVerify || saving}
                rows={10}
                className="w-full text-xs text-slate-700 leading-relaxed bg-white border border-emerald-100 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-y disabled:bg-slate-50 disabled:text-slate-500"
              />

              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] text-slate-400">
                  확정 시 가중치 1.5로 지식 베이스에 적재되어 신규 입찰 검토에 자동 노출됩니다.
                </p>
                {canVerify ? (
                  <button
                    onClick={handleConfirm}
                    disabled={saving || !content.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl disabled:opacity-40 shrink-0"
                  >
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                    {saving ? "확정 중..." : existing ? "재확정" : "교훈 확정"}
                  </button>
                ) : (
                  <span className="text-[10px] text-slate-400 shrink-0">팀장 이상이 확정할 수 있습니다.</span>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
