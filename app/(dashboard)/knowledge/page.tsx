"use client";

import { useState } from "react";
import { Search, Sparkles } from "lucide-react";
import type { KnowledgeChunk } from "@/lib/knowledge";
import { SearchCard } from "@/components/knowledge/search-card";
import { knowledgeRepositoryData } from "@/data/knowledge.data";
import { KnowledgeRepository } from "@/components/knowledge/knowledge-repository";

export default function KnowledgePage() {
  const [query, setQuery] = useState("");
  const [chunks, setChunks] = useState<KnowledgeChunk[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError("");
    setSearched(true);
    try {
      const res = await fetch("/api/knowledge/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim(), limit: 10 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "검색 실패");
      setChunks(data.chunks);
    } catch (err) {
      setError(err instanceof Error ? err.message : "검색 중 오류가 발생했습니다.");
      setChunks([]);
    } finally {
      setLoading(false);
    }
  }

  // 탭 내부 RAG 검색용 엘리먼트 정의
  const ragSearchElement = (
    <div className="space-y-6">
      <div className="space-y-1">
        <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" /> AI 자연어 RAG 검색 어시스턴트
        </h3>
        <p className="text-[10px] text-slate-400">
          국제규격(IEC, CIGRE), 국가표준(KS), 사내 절약 레슨런 데이터베이스를 기반으로 검색 의도에 최적화된 결과 묶음을 도출합니다.
        </p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2 text-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="예: 초고압 케이블 PD 측정 방법, 합격 기준"
            className="w-full pl-9 pr-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "검색 중…" : "검색"}
        </button>
      </form>

      {error && <p className="text-xs text-rose-600 font-bold">{error}</p>}

      {chunks.length > 0 && (
        <div className="space-y-3">
          <p className="text-[10px] text-slate-400 font-bold">{chunks.length}개의 관련 지식 데이터 매칭됨</p>
          {chunks.map((chunk, i) => (
            <SearchCard key={i} chunk={chunk} />
          ))}
        </div>
      )}

      {!loading && searched && chunks.length === 0 && !error && (
        <p className="text-xs text-slate-400 text-center py-12">검색 결과가 없습니다. 질의어를 좀 더 단순화해 보십시오.</p>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">품질 지식저장소 (Knowledge Base)</h1>
        <p className="text-slate-500">
          초고압/해저 케이블 관련 국제·국가 규격, 고객 요구 사양서, 입찰(Tender) 문서 및 기술 연구자료를 분류하여 저장하고 RAG 임베딩 검색 엔진과 연동합니다.
        </p>
      </div>

      <KnowledgeRepository 
        data={knowledgeRepositoryData} 
        ragSearchElement={ragSearchElement} 
      />
    </div>
  );
}
