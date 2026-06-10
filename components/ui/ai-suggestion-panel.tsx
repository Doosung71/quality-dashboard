"use client"

import { useState } from "react"
import { Sparkles, ChevronDown, ChevronUp, Copy, Check, Loader2, BookOpen } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface KnowledgeChunk {
  content: string
  source_path: string
  title: string | null
  similarity: number
}

interface Props {
  title: string
  description?: string
  type: "claim" | "ncr"
}

export function AiSuggestionPanel({ title, description, type }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [chunks, setChunks] = useState<KnowledgeChunk[]>([])
  const [draft, setDraft] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draftError, setDraftError] = useState<string | null>(null)
  const [fetched, setFetched] = useState(false)

  async function handleOpen() {
    const next = !open
    setOpen(next)
    if (next && !fetched) {
      setLoading(true)
      setError(null)
      setDraftError(null)
      try {
        const res = await fetch("/api/ai/suggest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, description, type }),
        })
        if (!res.ok) throw new Error(`서버 오류 (${res.status})`)
        const data = await res.json()
        setChunks(data.chunks ?? [])
        setDraft(data.draft ?? null)
        setDraftError(data.draftError ?? null)
        setFetched(true)
      } catch (e) {
        setError(e instanceof Error ? e.message : "AI 분석 중 오류가 발생했습니다.")
      } finally {
        setLoading(false)
      }
    }
  }

  async function handleCopy() {
    if (!draft) return
    await navigator.clipboard.writeText(draft)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const typeLabel = type === "claim" ? "클레임 대책" : "NCR 시정조치"

  return (
    <div className="bg-linear-to-br from-violet-50 to-indigo-50 rounded-2xl border border-violet-100 shadow-sm overflow-hidden">
      {/* 헤더 — 항상 표시 */}
      <button
        onClick={handleOpen}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-violet-50/60 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-bold text-violet-900">AI 유사사례 분석 &amp; {typeLabel} 초안</span>
          {fetched && !loading && (
            <span className="text-[10px] font-medium text-violet-500 bg-violet-100 px-2 py-0.5 rounded-full">
              유사사례 {chunks.length}건
            </span>
          )}
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-violet-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-violet-400" />
        )}
      </button>

      {/* 펼침 영역 */}
      {open && (
        <div className="px-6 pb-6 space-y-4 border-t border-violet-100">
          {loading && (
            <div className="flex items-center gap-2 py-4 text-violet-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-xs">유사 사례 검색 및 초안 생성 중...</span>
            </div>
          )}

          {error && (
            <p className="text-xs text-rose-600 bg-rose-50 rounded-xl px-3 py-2 mt-3">{error}</p>
          )}

          {!loading && fetched && (
            <>
              {/* 유사 사례 */}
              {chunks.length > 0 && (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-violet-500 uppercase tracking-wider">
                    <BookOpen className="w-3 h-3" /> 유사 사례 ({chunks.length}건)
                  </div>
                  {chunks.map((c, i) => (
                    <div key={i} className="bg-white rounded-xl border border-violet-100 px-4 py-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-700 line-clamp-1">
                          {c.title ?? c.source_path}
                        </span>
                        <span className="text-[10px] font-bold text-violet-500 shrink-0 ml-2">
                          유사도 {(c.similarity * 100).toFixed(0)}%
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-2">{c.content}</p>
                    </div>
                  ))}
                </div>
              )}

              {chunks.length === 0 && (
                <p className="text-xs text-slate-400 mt-3">지식 베이스에 유사 사례가 없습니다.</p>
              )}

              {/* AI 초안 생성 실패 */}
              {draftError && (
                <p className="text-xs text-amber-600 bg-amber-50 rounded-xl px-3 py-2">{draftError}</p>
              )}

              {/* AI 초안 */}
              {draft && (
                <div className="mt-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-violet-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3" /> AI {typeLabel} 초안
                    </span>
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-violet-600 bg-violet-100 hover:bg-violet-200 rounded-lg transition-colors"
                    >
                      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copied ? "복사됨" : "복사"}
                    </button>
                  </div>
                  <div className="bg-white rounded-xl border border-violet-100 px-4 py-3 text-xs text-slate-700 leading-relaxed
                    [&_h2]:text-[11px] [&_h2]:font-bold [&_h2]:text-violet-700 [&_h2]:uppercase [&_h2]:tracking-wide [&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:first:mt-0
                    [&_ul]:pl-4 [&_ul]:space-y-1.5 [&_ul]:mb-3 [&_ul]:list-disc
                    [&_ol]:pl-4 [&_ol]:space-y-1.5 [&_ol]:mb-3 [&_ol]:list-decimal
                    [&_li]:text-xs [&_li]:text-slate-700 [&_li]:leading-relaxed
                    [&_p]:mb-2 [&_p]:leading-relaxed
                    [&_strong]:font-semibold [&_strong]:text-slate-800
                    [&_hr]:border-slate-100 [&_hr]:my-3">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{draft}</ReactMarkdown>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    * AI 초안은 참고용입니다. 반드시 담당자가 검토 후 확정하세요.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
