"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Send, CheckCircle2, XCircle, Loader2 } from "lucide-react"

export default function WorkflowActions({
  analysisId,
  status,
  submittedAt,
  role,
}: {
  analysisId: string
  status: string
  submittedAt: string | null
  role: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState("")
  const [reason, setReason] = useState("")
  const [showReject, setShowReject] = useState<"review" | "final" | null>(null)

  async function call(path: string, body: object = {}) {
    const res = await fetch(`/api/contract-analysis/${analysisId}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const j = await res.json() as { error?: string }
      throw new Error(j.error ?? "오류 발생")
    }
  }

  async function handle(action: string, body?: object) {
    setLoading(action)
    try {
      await call(action, body)
      router.refresh()
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setLoading("")
      setShowReject(null)
      setReason("")
    }
  }

  const isPractitioner = role === "PRACTITIONER"
  const isTeamLead = ["TEAM_LEAD", "DIRECTOR", "ADMIN"].includes(role)
  const isDirector = ["DIRECTOR", "ADMIN"].includes(role)
  const isSubmitted = !!submittedAt

  if (status === "APPROVED") return null

  return (
    <section className="bg-white rounded-xl border border-slate-200 p-5">
      <h2 className="text-sm font-semibold text-slate-800 mb-4">검토 액션</h2>
      <div className="flex flex-wrap gap-2">
        {/* 실무자: 검토 요청 */}
        {status === "DRAFT" && !isSubmitted && (
          <button
            onClick={() => handle("submit")}
            disabled={!!loading}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {loading === "submit" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            팀장 검토 요청
          </button>
        )}
        {status === "DRAFT" && isSubmitted && (
          <p className="text-xs text-amber-600 font-medium flex items-center gap-1">
            <Send className="w-3.5 h-3.5" /> 검토 요청됨 — 팀장 승인 대기 중
          </p>
        )}

        {/* 팀장: 승인/반려 */}
        {status === "DRAFT" && isSubmitted && isTeamLead && (
          <>
            <button
              onClick={() => handle("review-approve")}
              disabled={!!loading}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {loading === "review-approve" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              팀장 승인
            </button>
            <button
              onClick={() => setShowReject("review")}
              disabled={!!loading}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold border border-rose-300 text-rose-600 rounded-lg hover:bg-rose-50 disabled:opacity-50 transition-colors"
            >
              <XCircle className="w-3.5 h-3.5" /> 반려
            </button>
          </>
        )}

        {/* 부문장: 최종 승인/반려 */}
        {status === "REVIEWED" && isDirector && (
          <>
            <button
              onClick={() => handle("final-approve")}
              disabled={!!loading}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 disabled:opacity-50 transition-colors"
            >
              {loading === "final-approve" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              최종 승인
            </button>
            <button
              onClick={() => setShowReject("final")}
              disabled={!!loading}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold border border-rose-300 text-rose-600 rounded-lg hover:bg-rose-50 disabled:opacity-50 transition-colors"
            >
              <XCircle className="w-3.5 h-3.5" /> 부문장 반려
            </button>
          </>
        )}
      </div>

      {/* 반려 사유 입력 */}
      {showReject && (
        <div className="mt-4 space-y-2">
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="반려 사유를 입력하세요..."
            rows={3}
            className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rose-300"
          />
          <div className="flex gap-2">
            <button
              onClick={() => handle(showReject === "review" ? "review-reject" : "final-reject", { reason })}
              disabled={!!loading}
              className="px-4 py-2 text-xs font-semibold bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin inline" /> : "반려 확인"}
            </button>
            <button onClick={() => { setShowReject(null); setReason("") }} className="px-4 py-2 text-xs border border-slate-200 rounded-lg hover:bg-slate-50">
              취소
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
