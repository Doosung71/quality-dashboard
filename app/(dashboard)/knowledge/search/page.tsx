"use client";

import { useState } from "react";
import { Search, Sparkles, Globe, Link2, FileText, Loader2 } from "lucide-react";
import type { KnowledgeChunk } from "@/lib/knowledge";
import { SearchCard } from "@/components/knowledge/search-card";
import { MarkdownContent } from "@/components/ui/markdown-content";

export default function KnowledgeSearchPage() {
  // RAG 검색 상태
  const [query, setQuery] = useState("");
  const [chunks, setChunks] = useState<KnowledgeChunk[]>([]);
  const [webResults, setWebResults] = useState<{ title: string; snippet: string; url: string }[]>([]);
  const [synthesizedReport, setSynthesizedReport] = useState<string | null>(null);
  const [searchWeb, setSearchWeb] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  // 외부 웹검색 상태
  const [wsQuery, setWsQuery] = useState("");
  const [wsResults, setWsResults] = useState<{ title: string; snippet: string; url: string }[]>([]);
  const [wsLoading, setWsLoading] = useState(false);
  const [wsError, setWsError] = useState("");
  const [wsSearched, setWsSearched] = useState(false);

  const [activeTab, setActiveTab] = useState<"rag" | "websearch">("rag");

  async function handleRagSearch(e: React.FormEvent) {
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
        body: JSON.stringify({ query: query.trim(), limit: 10, searchWeb }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "검색 실패");
      setChunks(data.chunks ?? []);
      setWebResults(data.webResults ?? []);
      setSynthesizedReport(data.synthesizedReport ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "검색 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function handleWebSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!wsQuery.trim()) return;
    setWsLoading(true);
    setWsError("");
    setWsSearched(true);
    setWsResults([]);
    try {
      const res = await fetch("/api/intelligence/websearch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: wsQuery.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "검색 실패");
      setWsResults(data.results ?? []);
    } catch (err) {
      setWsError(err instanceof Error ? err.message : "검색 중 오류가 발생했습니다.");
    } finally {
      setWsLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">AI 지식 검색</h1>
        <p className="text-slate-500">
          사내 지식 DB(RAG) 및 실시간 외부 웹 정보를 통합 검색합니다.
        </p>
      </div>

      <div className="space-y-6">
        {/* 탭 */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab("rag")}
            className={`px-5 py-3 text-sm font-extrabold border-b-2 transition-all flex items-center gap-2 ${activeTab === "rag" ? "border-slate-950 text-slate-950" : "border-transparent text-slate-400 hover:text-slate-600"}`}
          >
            <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" /> AI 자연어 RAG 검색
          </button>
          <button
            onClick={() => setActiveTab("websearch")}
            className={`px-5 py-3 text-sm font-extrabold border-b-2 transition-all flex items-center gap-2 ${activeTab === "websearch" ? "border-slate-950 text-slate-950" : "border-transparent text-slate-400 hover:text-slate-600"}`}
          >
            <Globe className="w-4 h-4 text-emerald-500" /> 외부 웹검색
          </button>
        </div>

        {activeTab === "rag" ? (
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6 text-xs">
            <div className="space-y-1">
              <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" /> AI 자연어 하이브리드 RAG 검색
              </h3>
              <p className="text-[10px] text-slate-400">
                국제규격(IEC, CIGRE), 국가표준(KS) 및 외부 최신 웹 정보를 하이브리드로 검색하여 품질 요약 리포트를 작성합니다.
              </p>
            </div>

            <form onSubmit={handleRagSearch} className="space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      if (!e.target.value.trim()) {
                        setChunks([]);
                        setWebResults([]);
                        setSynthesizedReport(null);
                        setSearched(false);
                      }
                    }}
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
                  {loading ? "검색 중…" : "검색"}
                </button>
              </div>

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

            {error && <p className="text-rose-600 font-bold">{error}</p>}

            {synthesizedReport && (
              <div className="bg-linear-to-br from-indigo-50/50 to-slate-50 border border-indigo-100 p-5 rounded-2xl space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
                  <h4 className="text-xs font-black text-indigo-950 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
                    AI 하이브리드 RAG 분석 리포트
                  </h4>
                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-md text-[8px] font-extrabold uppercase">
                    Claude Synthesized
                  </span>
                </div>
                <MarkdownContent content={synthesizedReport} className="text-[11px]" />
              </div>
            )}

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
                        <a href={web.url} target="_blank" rel="noreferrer"
                          className="text-[9px] font-bold text-indigo-600 hover:underline flex items-center gap-0.5">
                          <Link2 className="w-3 h-3" /> 출처링크
                        </a>
                      </div>
                      <p className="text-[10px] text-slate-500 font-medium leading-relaxed">{web.snippet}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!loading && searched && chunks.length === 0 && webResults.length === 0 && !error && (
              <p className="text-slate-400 text-center py-12">검색 결과가 없습니다. 질의어를 좀 더 단순화해 보십시오.</p>
            )}
          </div>
        ) : (
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6 text-xs">
            <div className="space-y-1">
              <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-emerald-500" /> 실시간 외부 웹검색
              </h3>
              <p className="text-[10px] text-slate-400">
                네이버 뉴스·웹 검색으로 최신 기술동향·규격 정보·산업 뉴스를 즉시 조회합니다.
              </p>
            </div>

            <form onSubmit={handleWebSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={wsQuery}
                  onChange={(e) => setWsQuery(e.target.value)}
                  placeholder="예: IEC 62067 초고압 케이블 규격, CIGRE 해저케이블 기술동향"
                  disabled={wsLoading}
                  className="w-full pl-9 pr-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                />
              </div>
              <button
                type="submit"
                disabled={wsLoading || !wsQuery.trim()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
              >
                {wsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
                {wsLoading ? "검색 중…" : "검색"}
              </button>
            </form>

            {wsError && <p className="text-rose-600 font-bold">{wsError}</p>}

            {wsResults.length > 0 && (
              <div className="space-y-3">
                <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5" /> 검색 결과 ({wsResults.length}건)
                </p>
                <div className="grid grid-cols-1 gap-2.5">
                  {wsResults.map((item, i) => (
                    <div key={i} className="p-3.5 rounded-xl border border-slate-100 bg-white shadow-sm hover:border-emerald-200 hover:shadow-md transition-all space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <h5 className="font-extrabold text-slate-900 leading-snug">{item.title}</h5>
                        <a href={item.url} target="_blank" rel="noreferrer"
                          className="shrink-0 text-[9px] font-bold text-emerald-600 hover:underline flex items-center gap-0.5 mt-0.5">
                          <Link2 className="w-3 h-3" /> 출처
                        </a>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-relaxed">{item.snippet}</p>
                      <p className="text-[9px] text-slate-300 font-mono truncate">{item.url}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!wsLoading && wsSearched && wsResults.length === 0 && !wsError && (
              <p className="text-slate-400 text-center py-12">검색 결과가 없습니다. 다른 검색어를 시도해 보세요.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
