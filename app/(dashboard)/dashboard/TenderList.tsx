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
  spg?: string
  marketRegion?: string
}

const ALL = "__all__"

export default function TenderList({ tenders }: { tenders: TenderRow[] }) {
  const [query, setQuery] = useState("")
  const [spgFilter, setSpgFilter] = useState(ALL)
  const [regionFilter, setRegionFilter] = useState(ALL)
  const [creatorFilter, setCreatorFilter] = useState(ALL)

  // 필터 옵션은 실제 등록된 값에서만 자동 구성 — 고정 목록 없음(자유입력 필드, 데이터 축적 후 고정화 예정)
  const spgOptions = [...new Set(tenders.map((t) => t.spg).filter((v): v is string => !!v))].sort()
  const regionOptions = [...new Set(tenders.map((t) => t.marketRegion).filter((v): v is string => !!v))].sort()
  const creatorOptions = [...new Set(tenders.map((t) => t.creatorName).filter((v): v is string => !!v))].sort()

  const filtered = tenders.filter((t) => {
    if (query.trim() && !t.title.toLowerCase().includes(query.trim().toLowerCase())) return false
    if (spgFilter !== ALL && t.spg !== spgFilter) return false
    if (regionFilter !== ALL && t.marketRegion !== regionFilter) return false
    if (creatorFilter !== ALL && t.creatorName !== creatorFilter) return false
    return true
  })

  const hasActiveFilter = query.trim() || spgFilter !== ALL || regionFilter !== ALL || creatorFilter !== ALL
  const filterSelectClass = "text-xs border border-slate-200 rounded-xl px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-slate-950 max-w-[9rem]"

  return (
    <section className="space-y-4">

      {/* 리스트 헤더 및 실시간 검색 입력창 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-3">
        <h2 className="text-xs font-extrabold text-slate-400 tracking-wider uppercase flex items-center gap-1.5 shrink-0">
          <FolderGit className="w-4 h-4 text-slate-400" />
          입찰 관리 리스트 {hasActiveFilter && filtered.length !== tenders.length
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

      {/* SPG·시장 권역·작성자 필터 — 값이 하나라도 존재할 때만 표시 */}
      {(spgOptions.length > 0 || regionOptions.length > 0 || creatorOptions.length > 0) && (
        <div className="flex flex-wrap items-center gap-2">
          {spgOptions.length > 0 && (
            <select value={spgFilter} onChange={(e) => setSpgFilter(e.target.value)} className={filterSelectClass}>
              <option value={ALL}>SPG 전체</option>
              {spgOptions.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          )}
          {regionOptions.length > 0 && (
            <select value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)} className={filterSelectClass}>
              <option value={ALL}>권역 전체</option>
              {regionOptions.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          )}
          {creatorOptions.length > 0 && (
            <select value={creatorFilter} onChange={(e) => setCreatorFilter(e.target.value)} className={filterSelectClass}>
              <option value={ALL}>작성자 전체</option>
              {creatorOptions.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          )}
          {hasActiveFilter && (
            <button
              onClick={() => { setQuery(""); setSpgFilter(ALL); setRegionFilter(ALL); setCreatorFilter(ALL) }}
              className="text-[10px] text-slate-400 hover:text-slate-700 underline"
            >
              필터 초기화
            </button>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-xs text-slate-400 italic py-8 text-center bg-slate-50/50 rounded-2xl border border-dashed">
          {hasActiveFilter ? "조건에 해당하는 입찰을 찾지 못했습니다." : "등록된 입찰 프로젝트가 없습니다."}
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
