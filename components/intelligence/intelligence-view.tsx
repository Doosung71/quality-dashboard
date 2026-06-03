"use client";

import { useState, useMemo } from "react";
import type { 
  IntelligenceData, 
  IntelligenceItem, 
  IntelligenceCategory, 
  ImpactLevel 
} from "@/types/intelligence";
import {
  Globe,
  Search,
  TrendingUp,
  Users,
  AlertTriangle,
  Lightbulb,
  Plus,
  X,
  PlusCircle,
  Calendar,
  ArrowRight,
  Layers,
  Zap,
  Bookmark,
  Loader2,
  ExternalLink,
} from "lucide-react";

interface IntelligenceViewProps {
  data: IntelligenceData;
}

const CATEGORY_STYLES: Record<IntelligenceCategory, { label: string; bg: string; text: string; border: string; dot: string }> = {
  "시장/기술 동향": { label: "시장/기술 동향", bg: "bg-blue-50/70", text: "text-blue-700", border: "border-blue-100", dot: "bg-blue-500" },
  "고객 동향": { label: "고객 동향", bg: "bg-amber-50/70", text: "text-amber-700", border: "border-amber-100", dot: "bg-amber-500" },
  "경쟁사 동향": { label: "경쟁사 동향", bg: "bg-purple-50/70", text: "text-purple-700", border: "border-purple-100", dot: "bg-purple-500" },
  "기타": { label: "기타", bg: "bg-slate-50/70", text: "text-slate-700", border: "border-slate-100", dot: "bg-slate-500" }
};

const IMPACT_STYLES: Record<ImpactLevel, { label: string; badge: string; dot: string }> = {
  High: { label: "High (경보)", badge: "bg-rose-50 text-rose-700 border-rose-200 font-extrabold animate-pulse", dot: "bg-rose-500" },
  Medium: { label: "Medium (주시)", badge: "bg-amber-50 text-amber-700 border-amber-200 font-bold", dot: "bg-amber-500" },
  Low: { label: "Low (참고)", badge: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" }
};

export function IntelligenceView({ data }: IntelligenceViewProps) {
  const [items, setItems] = useState<IntelligenceItem[]>(data.items);
  const [selectedItemId, setSelectedItemId] = useState<string>(data.items[0]?.id || "");
  
  // 필터들
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"ALL" | IntelligenceCategory>("ALL");
  const [selectedImpact, setSelectedImpact] = useState<"ALL" | ImpactLevel>("ALL");

  // 모의 신규 외부 동향 등록 폼 상태
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<IntelligenceCategory>("시장/기술 동향");
  const [newSource, setNewSource] = useState("");
  const [newSummary, setNewSummary] = useState("");
  const [newImpact, setNewImpact] = useState<ImpactLevel>("Medium");
  const [newKeywords, setNewKeywords] = useState("");
  const [newActionItem, setNewActionItem] = useState("");

  // 탭: feed | websearch
  const [activeTab, setActiveTab] = useState<"feed" | "websearch">("feed");
  // 웹 검색
  const [webQuery, setWebQuery] = useState("");
  const [webResults, setWebResults] = useState<{ title: string; snippet: string; url: string }[]>([]);
  const [webSearching, setWebSearching] = useState(false);
  const [webSearchError, setWebSearchError] = useState("");

  // 선택된 동향 상세 정보
  const selectedItem = useMemo(() => {
    return items.find(item => item.id === selectedItemId) || null;
  }, [items, selectedItemId]);

  // KPI 요약 분석
  const kpis = useMemo(() => {
    const total = items.length;
    const highImpactCount = items.filter(i => i.impact === "High").length;
    const marketTechCount = items.filter(i => i.category === "시장/기술 동향").length;
    const competitorCount = items.filter(i => i.category === "경쟁사 동향").length;
    const customerCount = items.filter(i => i.category === "고객 동향").length;
    
    return {
      total,
      highImpactCount,
      marketTechCount,
      competitorCount,
      customerCount
    };
  }, [items]);

  // 필터링 적용된 동향 목록
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // 1. 카테고리 필터
      if (selectedCategory !== "ALL" && item.category !== selectedCategory) return false;

      // 2. 영향도 필터
      if (selectedImpact !== "ALL" && item.impact !== selectedImpact) return false;

      // 3. 검색어 필터 (제목, 요약, 출처, 키워드)
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(query);
        const matchesSummary = item.summary.toLowerCase().includes(query);
        const matchesSource = item.source.toLowerCase().includes(query);
        const matchesKeywords = item.keywords.some(k => k.toLowerCase().includes(query));
        
        if (!matchesTitle && !matchesSummary && !matchesSource && !matchesKeywords) return false;
      }

      return true;
    }).sort((a, b) => b.date.localeCompare(a.date)); // 최근 작성일 순
  }, [items, selectedCategory, selectedImpact, searchQuery]);

  // 모의 신규 동향 등록 처리 (Zero Double Work)
  const handleAddIntelligence = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newSummary.trim() || !newSource.trim()) return;

    const keywordsArray = newKeywords
      .split(",")
      .map(k => k.trim())
      .filter(k => k.length > 0);

    const newItem: IntelligenceItem = {
      id: `INTEL-2026-0${items.length + 17}`, // 고유 번호 부여
      category: newCategory,
      title: newTitle.trim(),
      source: newSource.trim(),
      date: new Date().toISOString().split("T")[0],
      summary: newSummary.trim(),
      impact: newImpact,
      keywords: keywordsArray.length > 0 ? keywordsArray : ["기타 동향"],
      actionItem: newActionItem.trim() || undefined
    };

    setItems(prev => [newItem, ...prev]);
    setSelectedItemId(newItem.id);

    // 폼 클리어
    setNewTitle("");
    setNewCategory("시장/기술 동향");
    setNewSource("");
    setNewSummary("");
    setNewImpact("Medium");
    setNewKeywords("");
    setNewActionItem("");
    setShowAddForm(false);
  };

  const handleWebSearch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!webQuery.trim() || webSearching) return;
    setWebSearching(true);
    setWebSearchError("");
    setWebResults([]);
    try {
      const res = await fetch("/api/intelligence/websearch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: webQuery }),
      });
      const data = await res.json();
      if (res.ok) setWebResults(data.results ?? []);
      else setWebSearchError(data.error ?? "검색 중 오류가 발생했습니다.");
    } catch {
      setWebSearchError("네트워크 오류가 발생했습니다.");
    } finally {
      setWebSearching(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* 1. 외부정보 요약 KPI */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* 전체 수집 동향 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between transition-all hover:shadow-md">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 tracking-wider">수집된 외부동향</p>
            <h3 className="text-2xl font-bold text-slate-900">{kpis.total}건</h3>
            <p className="text-[10px] text-slate-400">시장/고객/경쟁사/기타</p>
          </div>
          <div className="w-12 h-12 bg-slate-50 text-slate-500 rounded-xl flex items-center justify-center">
            <Globe className="w-6 h-6" />
          </div>
        </div>

        {/* 즉시 대응 필요 (High Impact) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between transition-all hover:shadow-md">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 tracking-wider">High 영향도 건수</p>
            <h3 className={`text-2xl font-bold ${kpis.highImpactCount > 0 ? 'text-rose-600 animate-pulse' : 'text-slate-900'}`}>
              {kpis.highImpactCount}건
            </h3>
            <p className="text-[10px] text-slate-400">즉시 품질 검토가 필요한 항목</p>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${kpis.highImpactCount > 0 ? 'bg-rose-50 text-rose-500 animate-pulse' : 'bg-slate-50 text-slate-500'}`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        {/* 시장/기술 & 고객 동향 비율 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between transition-all hover:shadow-md">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 tracking-wider">시장/기술 & 고객 동향</p>
            <h3 className="text-2xl font-bold text-blue-600">{kpis.marketTechCount + kpis.customerCount}건</h3>
            <p className="text-[10px] text-slate-400">기술 규격 변화 및 고객 요건</p>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* 경쟁사 동향 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between transition-all hover:shadow-md">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 tracking-wider">경쟁사 품질 동향</p>
            <h3 className="text-2xl font-bold text-purple-600">{kpis.competitorCount}건</h3>
            <p className="text-[10px] text-slate-400">경쟁사 특허, 인증, 클레임 정보</p>
          </div>
          <div className="w-12 h-12 bg-purple-50 text-purple-500 rounded-xl flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 탭 전환 */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab("feed")}
          className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === "feed" ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
        >
          수집 동향
        </button>
        <button
          onClick={() => setActiveTab("websearch")}
          className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === "websearch" ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
        >
          <Globe className="w-3.5 h-3.5" />
          외부 웹 검색
          <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 leading-none">β</span>
        </button>
      </div>

      {/* 2. 수집 동향 */}
      {activeTab === "feed" && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* 좌측 열: 동향 필터 및 카드 리스트 */}
        <div className="lg:col-span-1 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div className="space-y-2">
            <h4 className="text-xs font-extrabold text-slate-400 tracking-wider uppercase">글로벌 외부정보 피드</h4>
            
            {/* 검색창 */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="제목, 요약, 태그 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-950 text-xs transition-all"
              />
            </div>
          </div>

          {/* 필터 셀렉트 */}
          <div className="space-y-3 pt-2 border-t border-slate-100 text-[10px]">
            {/* 카테고리 필터 */}
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-500 flex items-center gap-1"><Layers className="w-3 h-3" /> 카테고리:</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as "ALL" | IntelligenceCategory)}
                className="bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-slate-950"
              >
                <option value="ALL">전체 카테고리</option>
                <option value="시장/기술 동향">시장/기술 동향</option>
                <option value="고객 동향">고객 동향</option>
                <option value="경쟁사 동향">경쟁사 동향</option>
                <option value="기타">기타</option>
              </select>
            </div>

            {/* 영향도 필터 */}
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-500 flex items-center gap-1"><Zap className="w-3 h-3" /> 영향도:</span>
              <select
                value={selectedImpact}
                onChange={(e) => setSelectedImpact(e.target.value as "ALL" | ImpactLevel)}
                className="bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-slate-950"
              >
                <option value="ALL">전체 영향도</option>
                <option value="High">High (경보)</option>
                <option value="Medium">Medium (주시)</option>
                <option value="Low">Low (참고)</option>
              </select>
            </div>
          </div>

          {/* 동향 카드 리스트 */}
          <div className="space-y-2.5 overflow-y-auto max-h-[460px] pt-2 border-t border-slate-100">
            {filteredItems.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                조건에 일치하는 외부정보가 없습니다.
              </div>
            ) : (
              filteredItems.map(item => {
                const isSelected = item.id === selectedItemId;
                const catStyle = CATEGORY_STYLES[item.category];
                const impStyle = IMPACT_STYLES[item.impact];
                
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItemId(item.id)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all space-y-2 ${isSelected ? 'bg-slate-950 border-slate-950 text-white shadow' : 'bg-white border-slate-100 hover:border-slate-300 hover:bg-slate-50/50'}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-bold border tracking-wide ${isSelected ? 'bg-white/10 text-white border-white/20' : `${catStyle.bg} ${catStyle.text} ${catStyle.border}`}`}>
                        {item.category}
                      </span>
                      <span className="text-[8px] font-mono opacity-65 flex items-center gap-1">
                        <Calendar className="w-2.5 h-2.5" /> {item.date}
                      </span>
                    </div>

                    <h5 className="text-xs font-bold leading-snug line-clamp-2">
                      {item.title}
                    </h5>

                    <div className="flex items-center justify-between pt-1 text-[9px]">
                      <span className="opacity-75 truncate max-w-[120px]" title={item.source}>
                        출처: {item.source}
                      </span>
                      <span className={`flex items-center gap-1 font-bold ${isSelected ? 'text-white' : impStyle.badge.includes('text-rose-700') ? 'text-rose-600' : 'text-slate-500'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${impStyle.dot}`} />
                        {item.impact}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 우측 열: 선택한 외부 동향 정보 상세 및 조치방안 */}
        <div className="lg:col-span-2 space-y-6">
          {!selectedItem ? (
            <div className="bg-white py-24 rounded-2xl border border-slate-100 shadow-sm text-center text-slate-400 text-xs">
              선택된 외부 동향 정보가 없습니다. 좌측 목록에서 카드를 선택해 주세요.
            </div>
          ) : (
            <>
              {/* 상세 내용 카드 */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
                
                {/* 헤더 (카테고리/제목/출처) */}
                <div className="flex flex-col gap-3 border-b border-slate-100 pb-5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${CATEGORY_STYLES[selectedItem.category].bg} ${CATEGORY_STYLES[selectedItem.category].text} ${CATEGORY_STYLES[selectedItem.category].border}`}>
                        {selectedItem.category}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1.5 ${IMPACT_STYLES[selectedItem.impact].badge}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${IMPACT_STYLES[selectedItem.impact].dot}`} />
                        영향도: {selectedItem.impact}
                      </span>
                    </div>
                    
                    {/* 새 동향 등록 버튼 */}
                    <button
                      onClick={() => setShowAddForm(prev => !prev)}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 bg-indigo-50 px-2.5 py-1.5 rounded-lg border border-indigo-100 transition-all"
                    >
                      {showAddForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                      {showAddForm ? "취소" : "신규 동향 등록"}
                    </button>
                  </div>

                  <h3 className="text-lg font-black text-slate-950 leading-relaxed">
                    {selectedItem.title}
                  </h3>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500">
                    <span className="flex items-center gap-1 font-medium">
                      <Bookmark className="w-3.5 h-3.5 text-slate-400" /> 정보출처: <strong className="text-slate-700">{selectedItem.source}</strong>
                    </span>
                    <span className="flex items-center gap-1 font-mono">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" /> 등록일자: {selectedItem.date}
                    </span>
                  </div>
                </div>

                {/* 모의 새 외부 동향 등록 양식 */}
                {showAddForm && (
                  <form onSubmit={handleAddIntelligence} className="bg-slate-50/70 p-5 rounded-xl border border-slate-200 animate-slide-in space-y-4 text-xs">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="font-bold text-slate-600">동향 카테고리</label>
                        <select
                          value={newCategory}
                          onChange={(e) => setNewCategory(e.target.value as IntelligenceCategory)}
                          className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-slate-950"
                        >
                          <option value="시장/기술 동향">시장/기술 동향</option>
                          <option value="고객 동향">고객 동향</option>
                          <option value="경쟁사 동향">경쟁사 동향</option>
                          <option value="기타">기타</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="font-bold text-slate-600">품질 영향도</label>
                        <select
                          value={newImpact}
                          onChange={(e) => setNewImpact(e.target.value as ImpactLevel)}
                          className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-slate-950"
                        >
                          <option value="High">High (즉시 검토)</option>
                          <option value="Medium">Medium (일반 모니터링)</option>
                          <option value="Low">Low (단순 보관)</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="font-bold text-slate-600">정보 출처</label>
                        <input
                          type="text"
                          required
                          placeholder="예: CIGRE SC B1, KEPCO 공지"
                          value={newSource}
                          onChange={(e) => setNewSource(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-slate-950"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-600">동향 제목</label>
                      <input
                        type="text"
                        required
                        placeholder="요약 제목을 입력하세요..."
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-slate-950"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-600">내용 요약</label>
                      <textarea
                        required
                        rows={4}
                        placeholder="시장, 경쟁사, 고객 등의 기술/품질 규격 변동 핵심 내용을 육하원칙에 맞게 작성해 주세요..."
                        value={newSummary}
                        onChange={(e) => setNewSummary(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-slate-950"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="font-bold text-slate-600">키워드 / 태그 (쉼표구분)</label>
                        <input
                          type="text"
                          placeholder="예: HVDC 525kV, 규격강화, Prysmian"
                          value={newKeywords}
                          onChange={(e) => setNewKeywords(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-slate-950"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-bold text-slate-600">당사 품질 부문 대응방향 (선택)</label>
                        <input
                          type="text"
                          placeholder="예: 수입검사 절차 보강, 기술 비교서 배포"
                          value={newActionItem}
                          onChange={(e) => setNewActionItem(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-slate-950"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="submit"
                        className="bg-slate-950 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow"
                      >
                        <PlusCircle className="w-4 h-4" /> 외부동향 저장
                      </button>
                    </div>
                  </form>
                )}

                {/* 요약 상세 — 잡지형 리딩 뷰 */}
                <div className="space-y-3">
                  <h4 className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">주요 수집 내용 요약</h4>
                  <div className="flex gap-4">
                    <div className={`w-1 rounded-full shrink-0 ${CATEGORY_STYLES[selectedItem.category].dot}`} />
                    <p className="text-sm text-slate-700 leading-loose font-normal tracking-tight">
                      {selectedItem.summary}
                    </p>
                  </div>
                </div>

                {/* 키워드 태그 */}
                <div className="space-y-2">
                  <h4 className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">연관 지식 키워드</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedItem.keywords.map(k => (
                      <span key={k} className="bg-slate-100 text-slate-700 rounded-md px-2 py-0.5 text-[10px] font-bold">
                        #{k}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 품질부문 대응 조치사항 */}
                <div className="space-y-3 pt-6 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-slate-800 tracking-wide flex items-center gap-1.5">
                    <Lightbulb className="w-4 h-4 text-amber-500" /> 품질부문 의사결정 및 대응 방향
                  </h4>
                  
                  {selectedItem.actionItem ? (
                    <div className="bg-linear-to-br from-amber-500/6 to-orange-400/4 text-amber-950 p-4 rounded-2xl border border-amber-300/50 flex items-start gap-3 text-xs leading-relaxed shadow-sm shadow-amber-100/50">
                      <span className="px-2.5 py-1 bg-linear-to-r from-amber-500 to-orange-400 text-white font-extrabold rounded-lg text-[9px] uppercase tracking-wider shrink-0 mt-0.5 shadow-sm">
                        Action Plan
                      </span>
                      <div className="font-semibold flex items-start gap-1.5 text-amber-900">
                        <ArrowRight className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{selectedItem.actionItem}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-50 text-slate-400 p-4 rounded-2xl border border-slate-100 text-xs italic">
                      현재 해당 동향에 등록된 당사 대응방향(Action Item)이 없습니다. 필요 시 신규 조치를 수립하십시오.
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      )}

      {/* 외부 웹 검색 패널 */}
      {activeTab === "websearch" && (
        <div className="space-y-5">
          <form onSubmit={handleWebSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={webQuery}
                onChange={(e) => setWebQuery(e.target.value)}
                placeholder="검색어 입력 (예: HVDC 해저 케이블 IEC 규격 최신 동향)"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-950 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={webSearching}
              className="px-5 py-2.5 bg-slate-950 text-white text-sm font-bold rounded-xl hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
            >
              {webSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {webSearching ? "검색 중..." : "검색"}
            </button>
          </form>

          {webSearchError && (
            <div className="text-rose-600 text-sm font-medium">{webSearchError}</div>
          )}

          {/* 웹 검색 대기 Skeleton UI */}
          {webSearching && (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white p-5 rounded-2xl border border-slate-100 overflow-hidden">
                  <div className="skeleton-wave h-4 rounded-lg w-3/4 mb-3" />
                  <div className="skeleton-wave h-3 rounded-md w-full mb-1.5" />
                  <div className="skeleton-wave h-3 rounded-md w-5/6 mb-1.5" />
                  <div className="skeleton-wave h-3 rounded-md w-2/3" />
                </div>
              ))}
            </div>
          )}

          {!webSearching && webResults.length === 0 && !webSearchError && !webQuery && (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Globe className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm font-medium">검색어를 입력하고 외부 웹에서 최신 정보를 검색하세요.</p>
              <p className="text-xs mt-1.5 text-slate-300">예: HVDC 525kV 해저케이블 IEC 규격 · Prysmian 경쟁사 동향</p>
            </div>
          )}

          {!webSearching && webResults.length === 0 && !webSearchError && !!webQuery && (
            <div className="text-center py-12 text-slate-400 text-sm">검색 결과가 없습니다.</div>
          )}

          <div className="space-y-3">
            {webResults.map((r, i) => (
              <div key={i} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-slate-900 leading-snug">{r.title}</h4>
                    {r.snippet && <p className="text-xs text-slate-500 leading-relaxed">{r.snippet}</p>}
                    {r.url && <p className="text-[10px] text-indigo-500 truncate font-mono mt-1">{r.url}</p>}
                  </div>
                  {r.url && (
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 p-2 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-900 hover:border-slate-400 transition-all"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
