"use client"

import { useState } from "react"
import TenderCard from "./TenderCard"
import { type HistoryEntry, type CommentEntry } from "./TenderThread"

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
}

export default function TenderList({ tenders }: { tenders: TenderRow[] }) {
  const [query, setQuery] = useState("")

  const filtered = query.trim()
    ? tenders.filter((t) =>
        t.title.toLowerCase().includes(query.trim().toLowerCase())
      )
    : tenders

  return (
    <section>
      <div className="flex items-center justify-between mb-3 gap-3">
        <h2 className="text-sm font-semibold text-zinc-700 shrink-0">
          입찰 목록 {query.trim() && filtered.length !== tenders.length
            ? `(${filtered.length} / ${tenders.length}건)`
            : `(${tenders.length}건)`}
        </h2>
        <input
          type="search"
          placeholder="입찰명 검색…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="text-sm border rounded-md px-3 py-1.5 w-52 bg-white"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-zinc-400">
          {query.trim() ? `"${query.trim()}"에 해당하는 입찰이 없습니다.` : "등록된 입찰이 없습니다."}
        </p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((t) => (
            <TenderCard key={t.id} {...t} />
          ))}
        </ul>
      )}
    </section>
  )
}
