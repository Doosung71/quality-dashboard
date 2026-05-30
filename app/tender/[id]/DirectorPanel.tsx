"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

type Props = {
  analysisId: string
  initialMemo: string | null
  initialDraft: string | null
}

export default function DirectorPanel({ analysisId, initialMemo, initialDraft }: Props) {
  const [memo, setMemo] = useState(initialMemo ?? "")
  const [draft, setDraft] = useState(initialDraft ?? "")
  const [memoSaving, setMemoSaving] = useState(false)
  const [draftSaving, setDraftSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [memoSaved, setMemoSaved] = useState(false)
  const [draftSaved, setDraftSaved] = useState(false)
  const [memoError, setMemoError] = useState(false)
  const [draftError, setDraftError] = useState(false)

  async function saveMemo() {
    setMemoSaving(true)
    setMemoError(false)
    try {
      const res = await fetch(`/api/analysis/${analysisId}/director-memo`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ directorMemo: memo }),
      })
      if (!res.ok) { setMemoError(true); return }
      setMemoSaved(true)
      setTimeout(() => setMemoSaved(false), 2000)
    } catch {
      setMemoError(true)
    } finally {
      setMemoSaving(false)
    }
  }

  async function generateDraft() {
    setGenerating(true)
    try {
      const res = await fetch(`/api/analysis/${analysisId}/draft-opinion`, { method: "POST" })
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string }
        alert(body.error ?? "초안 생성 실패")
        return
      }
      const { draft: generated } = await res.json() as { draft: string }
      setDraft(generated)
    } catch {
      alert("네트워크 오류가 발생했습니다.")
    } finally {
      setGenerating(false)
    }
  }

  async function saveDraft() {
    setDraftSaving(true)
    setDraftError(false)
    try {
      const res = await fetch(`/api/analysis/${analysisId}/director-memo`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftOpinion: draft }),
      })
      if (!res.ok) { setDraftError(true); return }
      setDraftSaved(true)
      setTimeout(() => setDraftSaved(false), 2000)
    } catch {
      setDraftError(true)
    } finally {
      setDraftSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* 부문장 메모 */}
      <section className="bg-white border rounded-lg p-4 space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-700">부문장 메모</h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            DB에 없는 경험적 판단 — 공장 캐파, 발주처 히스토리, 과거 유사 프로젝트 이슈 등
          </p>
        </div>
        <textarea
          className="w-full border rounded p-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-zinc-400"
          rows={5}
          placeholder="자유롭게 입력하세요. 이 메모는 검토의견 초안 생성 시 반영됩니다."
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
        />
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={saveMemo} disabled={memoSaving}>
            {memoSaving ? "저장 중…" : "메모 저장"}
          </Button>
          {memoSaved && <span className="text-xs text-green-600">저장됨</span>}
          {memoError && <span className="text-xs text-red-600">저장 실패</span>}
        </div>
      </section>

      {/* 검토의견 초안 */}
      <section className="bg-white border rounded-lg p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-sm font-semibold text-zinc-700">검토의견 초안</h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              AI가 분석 결과 + 부문장 메모를 종합하여 기검통보서 형식의 초안을 생성합니다.
            </p>
          </div>
          <Button size="sm" onClick={generateDraft} disabled={generating}>
            {generating ? "생성 중…" : draft ? "초안 재생성" : "검토의견 초안 생성"}
          </Button>
        </div>

        {generating && (
          <div className="text-xs text-zinc-400 animate-pulse">
            Claude AI가 분석 결과를 종합하여 초안을 작성 중입니다… (30~60초 소요)
          </div>
        )}

        {draft && !generating && (
          <>
            <textarea
              className="w-full border rounded p-3 text-sm font-mono resize-y focus:outline-none focus:ring-1 focus:ring-zinc-400"
              rows={20}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={saveDraft} disabled={draftSaving}>
                {draftSaving ? "저장 중…" : "초안 저장"}
              </Button>
              {draftSaved && <span className="text-xs text-green-600">저장됨</span>}
              {draftError && <span className="text-xs text-red-600">저장 실패</span>}
              <span className="text-xs text-zinc-400">초안을 직접 편집 후 저장할 수 있습니다.</span>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
