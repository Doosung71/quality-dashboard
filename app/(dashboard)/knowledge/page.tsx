"use client";

import { useState, useEffect } from "react";
import { Search, Sparkles, Globe, Link2, FileText } from "lucide-react";
import type { KnowledgeChunk } from "@/lib/knowledge";
import { SearchCard } from "@/components/knowledge/search-card";
import { knowledgeRepositoryData } from "@/data/knowledge.data";
import type { KnowledgeRepositoryData } from "@/types/knowledge";
import { KnowledgeRepository } from "@/components/knowledge/knowledge-repository";
import { MarkdownContent } from "@/components/ui/markdown-content";

export default function KnowledgePage() {
  const [repoData, setRepoData] = useState<KnowledgeRepositoryData>(knowledgeRepositoryData);
  const [repoLoading, setRepoLoading] = useState(true);

  useEffect(() => {
    fetch("/api/knowledge/assets")
      .then((r) => r.json())
      .then((d) => {
        if (d.assets?.length > 0) setRepoData(d);
      })
      .catch(() => {/* fallback: 정적 JSON 유지 */})
      .finally(() => setRepoLoading(false));
  }, []);

  const [query, setQuery] = useState("");
  const [chunks, setChunks] = useState<KnowledgeChunk[]>([]);
  const [webResults, setWebResults] = useState<{ title: string; snippet: string; url: string }[]>([]);
  const [synthesizedReport, setSynthesizedReport] = useState<string | null>(null);
  const [searchWeb, setSearchWeb] = useState(false); // 외부 웹 검색 플래그
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError("");
    setSearched(true);
    setSynthesizedReport(null);
    setWebResults([]);
    setChunks([]);
    
    try {
      const res = await fetch("/api/knowledge/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          query: query.trim(), 
          limit: 10,
          searchWeb: searchWeb // 플래그 상신
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "검색 실패");
      
      setChunks(data.chunks ?? []);
      setWebResults(data.webResults ?? []);
      setSynthesizedReport(data.synthesizedReport ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "검색 중 오류가 발생했습니다.");
      setChunks([]);
      setWebResults([]);
      setSynthesizedReport(null);
    } finally {
      setLoading(false);
    }
  }

  // 탭 내부 RAG 검색용 엘리먼트 정의
  const ragSearchElement = (
    <div className="space-y-6 text-xs">
      <div className="space-y-1">
        <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" /> AI 자연어 하이브리드 RAG 검색 어시스턴트
        </h3>
        <p className="text-[10px] text-slate-400">
          국제규격(IEC, CIGRE), 국가표준(KS) 및 외부 최신 웹 정보를 하이브리드로 크롤링하여 품질 요약 리포트를 작성합니다.
        </p>
      </div>

      <form onSubmit={handleSearch} className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="예: 초고압 케이블 PD 측정 방법, 합격 기준"
              disabled={loading}
              className="w-full pl-9 pr-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-4 py-2 bg-slate-950 hover:bg-slate-800 text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "동합 검색 중…" : "검색"}
          </button>
        </div>

        {/* 웹 검색 동시 활성화 체크박스 */}
        <div className="flex items-center gap-2 select-none">
          <input
            type="checkbox"
            id="search-web-checkbox"
            checked={searchWeb}
            onChange={(e) => setSearchWeb(e.target.checked)}
            disabled={loading}
            className="w-3.5 h-3.5 accent-slate-950 rounded cursor-pointer"
          />
          <label htmlFor="search-web-checkbox" className="font-bold text-slate-600 cursor-pointer flex items-center gap-1">
            <Globe className="w-3.5 h-3.5 text-slate-400" />
            실시간 외부 웹 검색 동시 결합 (하이브리드 AI 분석)
          </label>
        </div>
      </form>

      {error && <p className="text-xs text-rose-600 font-bold">{error}</p>}

      {/* RAG 종합 분석 리포트 카드 (마크다운 기반 시뮬레이션) */}
      {synthesizedReport && (
        <div className="bg-gradient-to-br from-indigo-50/50 to-slate-50 border border-indigo-100 p-5 rounded-2xl space-y-4 shadow-sm animate-slide-in">
          <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
            <h4 className="text-xs font-black text-indigo-950 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
              🔮 AI 하이브리드 RAG 분석 리포트
            </h4>
            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-md text-[8px] font-extrabold uppercase">
              Claude Synthesized
            </span>
          </div>

          <MarkdownContent
            content={synthesizedReport}
            className="text-[11px]"
          />
        </div>
      )}

      {/* 내부 RAG 지식 검색 결과 */}
      {chunks.length > 0 && (
        <div className="space-y-3">
          <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide flex items-center gap-1">
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            사내 지식 DB 검색 결과 ({chunks.length}건)
          </p>
          {chunks.map((chunk, i) => (
            <SearchCard key={i} chunk={chunk} />
          ))}
        </div>
      )}

      {/* 외부 웹 실시간 검색 결과 */}
      {webResults.length > 0 && (
        <div className="space-y-3 pt-2">
          <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide flex items-center gap-1">
            <Globe className="w-3.5 h-3.5 text-slate-400" />
            실시간 외부 웹 검색 결과 ({webResults.length}건)
          </p>
          
          <div className="grid grid-cols-1 gap-2.5">
            {webResults.map((web, i) => (
              <div key={i} className="p-3.5 rounded-xl border border-slate-100 bg-white shadow-sm hover:border-slate-300 transition-all space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <h5 className="font-extrabold text-slate-900 truncate max-w-[80%]" title={web.title}>
                    {web.title}
                  </h5>
                  
                  <a 
                    href={web.url} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-[9px] font-bold text-indigo-600 hover:underline flex items-center gap-0.5"
                  >
                    <Link2 className="w-3 h-3" /> 출처링크
                  </a>
                </div>
                <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                  {web.snippet}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && searched && chunks.length === 0 && webResults.length === 0 && !error && (
        <p className="text-xs text-slate-400 text-center py-12">검색 결과가 없습니다. 질의어를 좀 더 단순화해 보십시오.</p>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">지식저장소 — QKM (Quality Knowledge Management)</h1>
        <p className="text-slate-500">
          초고압·해저 케이블 관련 국제·국가 규격, 입찰 문서, 기술 연구자료를 AI RAG 검색으로 즉시 조회합니다.
        </p>
      </div>

      <KnowledgeRepository
        data={repoData}
        repoLoading={repoLoading}
        ragSearchElement={ragSearchElement}
      />
    </div>
  );
}
