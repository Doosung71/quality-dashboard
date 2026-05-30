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
  Filter,
  Layers,
  Zap,
  Bookmark
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

      {/* 2. Split View (좌측: 외부 동향 목록 / 우측: 상세 내용 및 대응 조치사항) */}
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

                {/* 요약 상세 */}
                <div className="space-y-3">
                  <h4 className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">주요 수집 내용 요약</h4>
                  <div className="bg-slate-50/70 p-4.5 rounded-2xl border border-slate-100 text-xs text-slate-700 leading-relaxed font-medium">
                    {selectedItem.summary}
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
                    <div className="bg-indigo-50/30 text-indigo-950 p-4 rounded-2xl border border-indigo-100/50 flex items-start gap-3 text-xs leading-relaxed">
                      <span className="px-2.5 py-1 bg-indigo-100 text-indigo-800 font-extrabold rounded-lg text-[9px] uppercase tracking-wider shrink-0 mt-0.5">
                        Action Plan
                      </span>
                      <div className="font-bold flex items-center gap-1.5">
                        <ArrowRight className="w-4 h-4 text-indigo-400 shrink-0 self-start mt-0.5" />
                        <span>{selectedItem.actionItem}</span>
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
    </div>
  );
}
