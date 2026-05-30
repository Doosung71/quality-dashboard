"use client"

import { useState } from "react"
import { Search } from "lucide-react"
import type { KnowledgeChunk } from "@/lib/knowledge"
import { SearchCard } from "@/components/knowledge/search-card"

export default function KnowledgePage() {
  const [query, setQuery] = useState("")
  const [chunks, setChunks] = useState<KnowledgeChunk[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [searched, setSearched] = useState(false)

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    setError("")
    setSearched(true)
    try {
      const res = await fetch("/api/knowledge/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim(), limit: 10 }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "검색 실패")
      setChunks(data.chunks)
    } catch (err) {
      setError(err instanceof Error ? err.message : "검색 중 오류가 발생했습니다.")
      setChunks([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold">지식 검색</h1>
        <p className="text-sm text-slate-500 mt-1">
          IEC·CIGRE·KS 규격 지식 베이스를 자연어로 검색합니다.
        </p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="예: 초고압 케이블 PD 합격 기준"
            className="w-full pl-9 pr-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="px-4 py-2 bg-slate-900 text-white text-sm rounded-md hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "검색 중…" : "검색"}
        </button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {chunks.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-slate-400">{chunks.length}개 결과</p>
          {chunks.map((chunk, i) => (
            <SearchCard key={i} chunk={chunk} />
          ))}
        </div>
      )}

      {!loading && searched && chunks.length === 0 && !error && (
        <p className="text-sm text-slate-400 text-center py-12">검색 결과가 없습니다.</p>
      )}
    </div>
  )
}
