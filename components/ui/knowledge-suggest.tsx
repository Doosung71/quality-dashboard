"use client"

import { useState } from "react"
import useSWR from "swr"
import { BookOpen, ChevronDown, ChevronUp, Sparkles, FileText, Library } from "lucide-react"

interface SuggestResult {
  title: string | null
  content: string
  source_type: string
  source_path: string
  similarity: number
  rrf_score: number
}

interface Props {
  query: string
  /** 섹션 제목. 기본값: "관련 지식" */
  label?: string
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function SourceBadge({ type }: { type: string }) {
  if (type === "standards") {
    return (
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-50 text-blue-600 border border-blue-100">
        <Library className="w-2.5 h-2.5" />
        표준
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-violet-50 text-violet-600 border border-violet-100">
      <FileText className="w-2.5 h-2.5" />
      노트
    </span>
  )
}

function Skeleton() {
  return (
    <div className="space-y-2">
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-lg border border-slate-100 p-3 space-y-1.5 animate-pulse">
          <div className="flex items-center gap-2">
            <div className="h-3.5 w-10 bg-slate-100 rounded" />
            <div className="h-3 w-24 bg-slate-100 rounded" />
          </div>
          <div className="h-2.5 w-full bg-slate-100 rounded" />
          <div className="h-2.5 w-3/4 bg-slate-100 rounded" />
        </div>
      ))}
    </div>
  )
}

export function KnowledgeSuggest({ query, label = "관련 지식" }: Props) {
  const [open, setOpen] = useState(true)

  // 쿼리가 너무 짧으면 호출 안 함
  const safeQuery = query.trim().length >= 4 ? query.trim().slice(0, 300) : null
  const url = safeQuery ? `/api/knowledge/suggest?q=${encodeURIComponent(safeQuery)}` : null

  const { data, isLoading } = useSWR<{ results: SuggestResult[] }>(url, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  })

  const results = data?.results ?? []

  // 로딩 완료 후 결과 없으면 숨김
  if (!isLoading && results.length === 0) return null

  return (
    <div className="rounded-xl border border-violet-100 bg-violet-50/40 overflow-hidden">
      {/* 헤더 */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-violet-50/70 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-violet-100 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-violet-500" />
          </div>
          <span className="text-xs font-bold text-violet-700">{label}</span>
          {!isLoading && results.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-violet-200 text-violet-700 text-[10px] font-bold">
              {results.length}
            </span>
          )}
        </div>
        {open ? (
          <ChevronUp className="w-3.5 h-3.5 text-violet-400" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-violet-400" />
        )}
      </button>

      {/* 결과 영역 */}
      {open && (
        <div className="px-4 pb-4 space-y-2">
          {isLoading ? (
            <Skeleton />
          ) : (
            results.map((r, i) => (
              <div
                key={i}
                className="rounded-lg border border-slate-100 bg-white px-3 py-2.5 space-y-1.5 hover:border-violet-200 hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-2">
                  <SourceBadge type={r.source_type} />
                  {r.title && (
                    <p className="text-[11px] font-semibold text-slate-700 truncate">{r.title}</p>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-3">
                  {r.content}
                </p>
              </div>
            ))
          )}
          {!isLoading && (
            <p className="text-[10px] text-violet-400 flex items-center gap-1 pt-0.5">
              <BookOpen className="w-3 h-3" />
              PKM 지식 베이스에서 자동 추천
            </p>
          )}
        </div>
      )}
    </div>
  )
}
