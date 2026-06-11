"use client"

import { useState } from "react"
import TenderCard from "./TenderCard"
import { type HistoryEntry, type CommentEntry } from "./TenderThread"
import { Search, FolderGit } from "lucide-react"

export type TenderRow = {
  id: string
  title: string
  createdAt: string
  statusLabel: string
  statusClass: string
  canEdit: boolean
  canDelete: boolean
  analysisId?: string
  threadHistory: HistoryEntry[]
  threadComments: CommentEntry[]
  riskCount?: number
  nonComplyCount?: number
  creatorName?: string
}

export default function TenderList({ tenders }: { tenders: TenderRow[] }) {
  const [query, setQuery] = useState("")

  const filtered = query.trim()
    ? tenders.filter((t) =>
        t.title.toLowerCase().includes(query.trim().toLowerCase())
      )
    : tenders

  return (
    <section className="space-y-4">
      
      {/* 리스트 헤더 및 실시간 검색 입력창 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-3">
        <h2 className="text-xs font-extrabold text-slate-400 tracking-wider uppercase flex items-center gap-1.5 shrink-0">
          <FolderGit className="w-4 h-4 text-slate-400" />
          입찰 관리 리스트 {query.trim() && filtered.length !== tenders.length
            ? `(${filtered.length} / ${tenders.length}건)`
            : `(${tenders.length}건)`}
        </h2>
        
        {/* 모던 검색바 */}
        <div className="relative text-xs">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="입찰명 실시간 필터..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full md:w-56 pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-950 bg-white transition-all text-xs"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-xs text-slate-400 italic py-8 text-center bg-slate-50/50 rounded-2xl border border-dashed">
          {query.trim() ? `"${query.trim()}"에 해당하는 입찰을 찾지 못했습니다.` : "등록된 입찰 프로젝트가 없습니다."}
        </p>
      ) : (
        <ul className="space-y-3.5">
          {filtered.map((t) => (
            <TenderCard key={t.id} {...t} />
          ))}
        </ul>
      )}
    </section>
  )
}
