"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import type { KnowledgeChunk } from "@/lib/knowledge"
import { ChevronDown, ChevronUp } from "lucide-react"

interface SearchCardProps {
  chunk: KnowledgeChunk
}

export function SearchCard({ chunk }: SearchCardProps) {
  const filename = chunk.source_path.split(/[\\/]/).pop() ?? chunk.source_path
  const similarityPct = Math.round(chunk.similarity * 100)
  const [expanded, setExpanded] = useState(false)
  const [fullText, setFullText] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleExpand() {
    if (expanded) { setExpanded(false); return; }
    setExpanded(true)
    if (fullText !== null) return
    setLoading(true)
    try {
      const res = await fetch(`/api/knowledge/content?path=${encodeURIComponent(chunk.source_path)}`)
      const data = await res.json()
      setFullText(data.text || chunk.content)
    } catch {
      setFullText(chunk.content)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="border rounded-lg p-4 space-y-2 hover:border-slate-400 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-medium text-sm leading-snug">{chunk.title ?? filename}</h3>
        <span className={cn(
          "text-xs px-2 py-0.5 rounded-full shrink-0 font-medium",
          similarityPct >= 80 ? "bg-green-100 text-green-800" :
          similarityPct >= 60 ? "bg-yellow-100 text-yellow-800" :
          "bg-slate-100 text-slate-600"
        )}>
          {similarityPct}%
        </span>
      </div>
      <p className="text-xs text-slate-400 truncate">{filename}</p>

      {!expanded ? (
        <div className="max-h-20 overflow-hidden relative">
          <p className="text-xs text-slate-600 leading-5 whitespace-pre-line break-words">{chunk.content}</p>
          <div className="absolute bottom-0 left-0 right-0 h-6 bg-linear-to-t from-white to-transparent pointer-events-none" />
        </div>
      ) : (
        <div className="max-h-96 overflow-y-auto rounded-lg border border-slate-100 bg-slate-50 p-3 space-y-1">
          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">PDF 원문 텍스트</p>
          {loading
            ? <p className="text-xs text-slate-400 animate-pulse">불러오는 중…</p>
            : <div className="text-xs text-slate-700 leading-6 whitespace-pre-line break-words">{fullText ?? chunk.content}</div>
          }
        </div>
      )}

      <button
        onClick={handleExpand}
        className="flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-slate-900 transition-colors"
      >
        {expanded
          ? <><ChevronUp className="w-3 h-3" /> 접기</>
          : <><ChevronDown className="w-3 h-3" /> 내용 보기</>
        }
      </button>
    </div>
  )
}
