"use client";

import { useState, useMemo } from "react";
import type {
  KnowledgeAsset,
  KnowledgeCategory,
  KnowledgeSubCategory
} from "@/types/knowledge";
import {
  Search,
  Calendar,
  BookOpen,
  Layers,
  Award,
  FileText,
} from "lucide-react";

interface KnowledgeRepositoryProps {
  data: { assets: KnowledgeAsset[] };
  repoLoading?: boolean;
  onCardClick?: (asset: KnowledgeAsset) => void;
}

const CATEGORY_MAP: Record<KnowledgeCategory, { label: string; short: string; bg: string; text: string; border: string }> = {
  "Standards": { label: "규격 (Standards)", short: "규격", bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-100" },
  "TechnicalDocs": { label: "기술자료 (Docs)", short: "기술자료", bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-100" },
  "Reports": { label: "보고서 (Reports)", short: "보고서", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-100" },
  "Others": { label: "기타 (Others)", short: "기타", bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200" }
};

const SUB_CATEGORIES_BY_MAIN: Record<KnowledgeCategory, KnowledgeSubCategory[]> = {
  "Standards": ["사내규격", "국제규격", "국가규격", "단체규격", "고객규격", "Tender"],
  "TechnicalDocs": ["논문", "특허"],
  "Reports": ["시험성적서", "분석보고서"],
  "Others": ["가이드라인", "매뉴얼", "기타"]
};

const CATEGORY_KEYS = ["Standards", "TechnicalDocs", "Reports", "Others"] as const;

export function KnowledgeRepository({ data, repoLoading = false, onCardClick }: KnowledgeRepositoryProps) {
  const assets = data.assets;

  const [selectedCategory, setSelectedCategory] = useState<KnowledgeCategory | "ALL">("ALL");
  const [selectedSubCategory, setSelectedSubCategory] = useState<KnowledgeSubCategory | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const handleChipClick = (category: KnowledgeCategory | "ALL", subCategory: KnowledgeSubCategory | "ALL") => {
    setSelectedCategory(category);
    setSelectedSubCategory(subCategory);
  };

  // KPI 요약 분석
  const kpis = useMemo(() => ({
    total: assets.length,
    standardsCount: assets.filter(a => a.category === "Standards").length,
    docsCount: assets.filter(a => a.category === "TechnicalDocs").length,
    reportsCount: assets.filter(a => a.category === "Reports").length,
  }), [assets]);

  // 필터링된 자산 목록
  const filteredAssets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = assets.filter(a => {
      if (selectedCategory !== "ALL" && a.category !== selectedCategory) return false;
      if (selectedSubCategory !== "ALL" && a.subCategory !== selectedSubCategory) return false;
      if (q) {
        const matchesTitle = a.title.toLowerCase().includes(q);
        const matchesCode = a.code?.toLowerCase().includes(q) ?? false;
        const matchesPublisher = a.publisher.toLowerCase().includes(q);
        const matchesKeywords = a.keywords.some(k => k.toLowerCase().includes(q));
        const matchesSummary = a.summary.toLowerCase().includes(q);
        if (!matchesTitle && !matchesCode && !matchesPublisher && !matchesKeywords && !matchesSummary) return false;
      }
      return true;
    });

    // 검색어 있으면 제목·코드 직접 매칭 우선, 없으면 연도 내림차순
    if (q) {
      filtered.sort((a, b) => {
        const aExact = (a.title.toLowerCase().includes(q) || (a.code?.toLowerCase().includes(q) ?? false)) ? 0 : 1;
        const bExact = (b.title.toLowerCase().includes(q) || (b.code?.toLowerCase().includes(q) ?? false)) ? 0 : 1;
        return aExact - bExact;
      });
    } else {
      filtered.sort((a, b) => b.publishYear.localeCompare(a.publishYear));
    }
    return filtered;
  }, [assets, selectedCategory, selectedSubCategory, searchQuery]);

  return (
    <div className="space-y-6">
      {/* 1. 지식자산 요약 KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-[10px] font-semibold text-slate-500 tracking-wider">등록 지식자산</p>
            <h3 className="text-xl font-bold text-slate-900">
              {repoLoading ? <span className="text-slate-300 animate-pulse">…</span> : `${kpis.total}건`}
            </h3>
          </div>
          <div className="w-10 h-10 bg-slate-50 text-slate-500 rounded-xl flex items-center justify-center">
            <BookOpen className="w-5.5 h-5.5" />
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-[10px] font-semibold text-slate-500 tracking-wider">규격 (Standards)</p>
            <h3 className="text-xl font-bold text-indigo-600">{kpis.standardsCount}건</h3>
          </div>
          <div className="w-10 h-10 bg-indigo-50 text-indigo-500 rounded-xl flex items-center justify-center">
            <Award className="w-5.5 h-5.5" />
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-[10px] font-semibold text-slate-500 tracking-wider">기술자료 (Docs)</p>
            <h3 className="text-xl font-bold text-teal-600">{kpis.docsCount}건</h3>
          </div>
          <div className="w-10 h-10 bg-teal-50 text-teal-500 rounded-xl flex items-center justify-center">
            <FileText className="w-5.5 h-5.5" />
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-[10px] font-semibold text-slate-500 tracking-wider">검사/원인 보고서</p>
            <h3 className="text-xl font-bold text-amber-600">{kpis.reportsCount}건</h3>
          </div>
          <div className="w-10 h-10 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center">
            <Layers className="w-5.5 h-5.5" />
          </div>
        </div>
      </div>

      {/* 2. 분류 칩 필터 + 검색 — 모바일·데스크탑 공통 패턴 (#52: 트리 패널 제거, 페이지 단일 스크롤) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3">
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-slate-800">
            {selectedCategory === "ALL" ? "전체 지식자산 리스트" : `${CATEGORY_MAP[selectedCategory].label} > ${selectedSubCategory === "ALL" ? "전체" : selectedSubCategory}`}
          </h4>
          <p className="text-[10px] text-slate-400">
            총 {filteredAssets.length}개의 매칭 문서가 발견되었습니다.
          </p>
        </div>

        {/* 대분류 칩 */}
        <div className="flex gap-2 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible">
          <button
            onClick={() => handleChipClick("ALL", "ALL")}
            className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ${selectedCategory === "ALL" ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"}`}
          >
            전체
            <span className={`ml-1 text-[9px] font-mono ${selectedCategory === "ALL" ? "text-white/70" : "text-slate-400"}`}>{assets.length}</span>
          </button>
          {CATEGORY_KEYS.map(catKey => {
            const active = selectedCategory === catKey;
            return (
              <button
                key={catKey}
                onClick={() => handleChipClick(catKey, "ALL")}
                className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ${active ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"}`}
              >
                {CATEGORY_MAP[catKey].short}
                <span className={`ml-1 text-[9px] font-mono ${active ? "text-white/70" : "text-slate-400"}`}>
                  {assets.filter(a => a.category === catKey).length}
                </span>
              </button>
            );
          })}
        </div>

        {/* 소분류 칩 (대분류 선택 시) */}
        {selectedCategory !== "ALL" && (
          <div className="flex gap-2 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible">
            <button
              onClick={() => handleChipClick(selectedCategory, "ALL")}
              className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ${selectedSubCategory === "ALL" ? "bg-slate-900 text-white border-slate-900" : "bg-slate-100 text-slate-600 border-transparent hover:bg-slate-200"}`}
            >
              전체
            </button>
            {SUB_CATEGORIES_BY_MAIN[selectedCategory].map(subCat => {
              const isSelected = selectedSubCategory === subCat;
              const count = assets.filter(a => a.category === selectedCategory && a.subCategory === subCat).length;
              return (
                <button
                  key={subCat}
                  onClick={() => handleChipClick(selectedCategory, subCat)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ${isSelected ? "bg-slate-900 text-white border-slate-900" : "bg-slate-100 text-slate-600 border-transparent hover:bg-slate-200"}`}
                >
                  {subCat}
                  <span className={`ml-1 text-[9px] font-mono ${isSelected ? "text-white/70" : "text-slate-400"}`}>{count}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* 통합 검색창 */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="규격명, 번호(예: IEC 60840), 키워드 입력 후 Enter..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const first = filteredAssets[0];
                if (first) onCardClick?.(first);
              }
            }}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-950 text-xs transition-all"
          />
        </div>
      </div>

      {/* 3. 매칭 문서 카드 그리드 — 페이지 스크롤에 흐름 */}
      {filteredAssets.length === 0 ? (
        <div className="bg-white py-12 rounded-2xl border text-center text-slate-400 text-xs">
          매칭되는 지식 자산이 없습니다.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filteredAssets.map(asset => {
            const catStyle = CATEGORY_MAP[asset.category];
            return (
              <div
                key={asset.id}
                onClick={() => onCardClick?.(asset)}
                className="p-4 rounded-2xl border cursor-pointer transition-all space-y-2 text-xs bg-white border-slate-100 hover:border-slate-300 hover:shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`px-2 py-0.5 rounded text-[8px] font-bold border tracking-wide uppercase shrink-0 ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}>
                      {asset.subCategory}
                    </span>
                    {asset.code && (
                      <span className="font-bold font-mono text-[9px] text-indigo-600 truncate">
                        {asset.code}
                      </span>
                    )}
                  </div>
                  <span className="text-[8px] font-mono opacity-65 flex items-center gap-1 shrink-0">
                    <Calendar className="w-2.5 h-2.5" /> {asset.publishYear}
                  </span>
                </div>

                <h5 className="font-extrabold leading-snug line-clamp-2">
                  {asset.title}
                </h5>

                <div className="flex items-center justify-between pt-1 opacity-75 text-[9px]">
                  <span className="truncate">발행/출처: {asset.publisher}</span>
                  {asset.fileSize && <span className="shrink-0">크기: {asset.fileSize}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
