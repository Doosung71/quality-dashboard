"use client";

import { useState, useMemo, useEffect } from "react";
import type {
  KnowledgeAsset,
  KnowledgeCategory,
  KnowledgeSubCategory
} from "@/types/knowledge";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { 
  Folder, 
  FolderOpen, 
  FileText, 
  Search, 
  Plus, 
  X, 
  PlusCircle, 
  Eye,
  Calendar,
  BookOpen,
  Layers,
  Sparkles,
  Award,
  BookMarked
} from "lucide-react";

interface KnowledgeRepositoryProps {
  data: { assets: KnowledgeAsset[] };
  repoLoading?: boolean;
  ragSearchElement: React.ReactNode;
}

const CATEGORY_MAP: Record<KnowledgeCategory, { label: string; bg: string; text: string; border: string }> = {
  "Standards": { label: "규격 (Standards)", bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-100" },
  "TechnicalDocs": { label: "기술자료 (Docs)", bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-100" },
  "Reports": { label: "보고서 (Reports)", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-100" },
  "Others": { label: "기타 (Others)", bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200" }
};

const SUB_CATEGORIES_BY_MAIN: Record<KnowledgeCategory, KnowledgeSubCategory[]> = {
  "Standards": ["국제규격", "국가규격", "단체규격", "고객규격", "Tender"],
  "TechnicalDocs": ["논문", "특허"],
  "Reports": ["시험성적서", "분석보고서"],
  "Others": ["가이드라인", "매뉴얼", "기타"]
};

export function KnowledgeRepository({ data, repoLoading = false, ragSearchElement }: KnowledgeRepositoryProps) {
  const [activeTab, setActiveTab] = useState<"browser" | "rag">("browser");
  const [assets, setAssets] = useState<KnowledgeAsset[]>(data.assets);
  const [selectedAssetId, setSelectedAssetId] = useState<string>(data.assets[0]?.id || "");

  useEffect(() => {
    setAssets(data.assets);
    setSelectedAssetId(data.assets[0]?.id || "");
    setContentText(null);
  }, [data]);

  // 자산 변경 시 이전 내용 즉시 초기화
  useEffect(() => {
    setContentText(null);
    setContentLoading(false);
  }, [selectedAssetId]);
  
  // 트리 구조 네비게이션 상태
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    "Standards": true,
    "TechnicalDocs": true,
    "Reports": true,
    "Others": true
  });
  const [selectedTreeCategory, setSelectedTreeCategory] = useState<KnowledgeCategory | "ALL">("ALL");
  const [selectedTreeSubCategory, setSelectedTreeSubCategory] = useState<KnowledgeSubCategory | "ALL">("ALL");

  // 검색어 필터
  const [searchQuery, setSearchQuery] = useState("");

  // 모의 신규 자산 등록 폼 상태
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<KnowledgeCategory>("Standards");
  const [newSubCategory, setNewSubCategory] = useState<KnowledgeSubCategory>("국제규격");
  const [newCode, setNewCode] = useState("");
  const [newPublisher, setNewPublisher] = useState("");
  const [newPublishYear, setNewPublishYear] = useState("2026");
  const [newSummary, setNewSummary] = useState("");
  const [newKeywords, setNewKeywords] = useState("");
  const [newFileSize, setNewFileSize] = useState("1.5 MB");

  // 대분류 선택 시 하위 분류 초기값 설정 방지용 헬퍼
  const handleCategoryChange = (cat: KnowledgeCategory) => {
    setNewCategory(cat);
    const subCats = SUB_CATEGORIES_BY_MAIN[cat];
    if (subCats && subCats.length > 0) {
      setNewSubCategory(subCats[0]);
    }
  };

  // 선택된 자산 상세
  const selectedAsset = useMemo(() => {
    return assets.find(a => a.id === selectedAssetId) || null;
  }, [assets, selectedAssetId]);

  // 카테고리 토글
  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [cat]: !prev[cat]
    }));
  };

  // 트리 메뉴 클릭
  const handleTreeClick = (category: KnowledgeCategory | "ALL", subCategory: KnowledgeSubCategory | "ALL") => {
    setSelectedTreeCategory(category);
    setSelectedTreeSubCategory(subCategory);
  };

  // KPI 요약 분석
  const kpis = useMemo(() => {
    const total = assets.length;
    const standardsCount = assets.filter(a => a.category === "Standards").length;
    const docsCount = assets.filter(a => a.category === "TechnicalDocs").length;
    const reportsCount = assets.filter(a => a.category === "Reports").length;

    return {
      total,
      standardsCount,
      docsCount,
      reportsCount
    };
  }, [assets]);

  // 필터링된 자산 목록
  const filteredAssets = useMemo(() => {
    return assets.filter(a => {
      // 1. 대분류 필터
      if (selectedTreeCategory !== "ALL" && a.category !== selectedTreeCategory) return false;
      
      // 2. 소분류 필터
      if (selectedTreeSubCategory !== "ALL" && a.subCategory !== selectedTreeSubCategory) return false;

      // 3. 검색어 필터
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        const matchesTitle = a.title.toLowerCase().includes(query);
        const matchesSummary = a.summary.toLowerCase().includes(query);
        const matchesCode = a.code?.toLowerCase().includes(query) ?? false;
        const matchesPublisher = a.publisher.toLowerCase().includes(query);
        const matchesKeywords = a.keywords.some(k => k.toLowerCase().includes(query));
        
        if (!matchesTitle && !matchesSummary && !matchesCode && !matchesPublisher && !matchesKeywords) return false;
      }

      return true;
    }).sort((a, b) => b.publishYear.localeCompare(a.publishYear)); // 최신 연도순
  }, [assets, selectedTreeCategory, selectedTreeSubCategory, searchQuery]);

  // 모의 신규 자산 저장
  const handleAddAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newPublisher.trim() || !newSummary.trim()) return;

    const keywordsArray = newKeywords
      .split(",")
      .map(k => k.trim())
      .filter(k => k.length > 0);

    const newAsset: KnowledgeAsset = {
      id: `KB-2026-0${assets.length + 1}`,
      category: newCategory,
      subCategory: newSubCategory,
      title: newTitle.trim(),
      code: newCode.trim() || undefined,
      publisher: newPublisher.trim(),
      publishYear: newPublishYear,
      summary: newSummary.trim(),
      fileSize: newFileSize,
      keywords: keywordsArray.length > 0 ? keywordsArray : ["QMS 보강"],
      linkUrl: `/references/uploaded_${newCode || "doc"}.pdf`
    };

    setAssets(prev => [newAsset, ...prev]);
    setSelectedAssetId(newAsset.id);

    // 폼 클리어
    setNewTitle("");
    setNewCode("");
    setNewPublisher("");
    setNewPublishYear("2026");
    setNewSummary("");
    setNewKeywords("");
    setShowAddForm(false);
  };

  const [contentText, setContentText] = useState<string | null>(null);
  const [contentLoading, setContentLoading] = useState(false);

  const handleViewContent = async (asset: KnowledgeAsset) => {
    if (!asset.sourcePath) return;
    setContentText(null);
    setContentLoading(true);
    try {
      const res = await fetch(`/api/knowledge/content?path=${encodeURIComponent(asset.sourcePath)}`);
      const data = await res.json();
      setContentText(data.text || "내용 없음");
    } catch {
      setContentText("내용을 불러오는 데 실패했습니다.");
    } finally {
      setContentLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 상단 탭 메뉴 */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab("browser")}
          className={`px-5 py-3 text-sm font-extrabold border-b-2 transition-all flex items-center gap-2 ${activeTab === "browser" ? "border-slate-950 text-slate-950" : "border-transparent text-slate-400 hover:text-slate-600"}`}
        >
          <BookMarked className="w-4 h-4" /> 지식저장소 분류 브라우저
        </button>
        <button
          onClick={() => setActiveTab("rag")}
          className={`px-5 py-3 text-sm font-extrabold border-b-2 transition-all flex items-center gap-2 ${activeTab === "rag" ? "border-slate-950 text-slate-950" : "border-transparent text-slate-400 hover:text-slate-600"}`}
        >
          <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" /> AI 자연어 RAG 검색
        </button>
      </div>

      {activeTab === "rag" ? (
        // RAG 검색 화면 (기존 콤포넌트 이식)
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          {ragSearchElement}
        </div>
      ) : (
        // 지식저장소 분류 브라우저 메인 화면
        <div className="space-y-6">
          {/* 1. 지식자산 요약 KPI */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

          {/* 2. 트리 브라우징 & 메인 패널 */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
            
            {/* 좌측: 카테고리 트리 네비게이션 */}
            <div className="lg:col-span-1 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase">지식 분류 트리</span>
                <button 
                  onClick={() => handleTreeClick("ALL", "ALL")}
                  className={`text-[9px] font-bold px-2 py-0.5 rounded ${selectedTreeCategory === "ALL" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                >
                  전체보기
                </button>
              </div>

              {/* 카테고리 목록 아코디언 */}
              <div className="space-y-2 text-xs">
                {(["Standards", "TechnicalDocs", "Reports", "Others"] as KnowledgeCategory[]).map(catKey => {
                  const label = catKey === "Standards" ? "규격 (Standards)" :
                                catKey === "TechnicalDocs" ? "기술자료 (Docs)" :
                                catKey === "Reports" ? "보고서 (Reports)" : "기타 (Others)";
                  
                  const isExpanded = expandedCategories[catKey];
                  const subCats = SUB_CATEGORIES_BY_MAIN[catKey];
                  
                  return (
                    <div key={catKey} className="space-y-1">
                      {/* 대분류 헤더 */}
                      <div 
                        onClick={() => toggleCategory(catKey)}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
                          {isExpanded ? <FolderOpen className="w-4 h-4 text-slate-400 shrink-0" /> : <Folder className="w-4 h-4 text-slate-400 shrink-0" />}
                          {label}
                        </span>
                        <span className="text-[9px] bg-slate-100 text-slate-500 font-bold px-1.5 py-0.5 rounded-full">
                          {assets.filter(a => a.category === catKey).length}
                        </span>
                      </div>

                      {/* 소분류 목록 (확장 시) */}
                      {isExpanded && (
                        <div className="pl-6 space-y-0.5 border-l border-slate-100 ml-3.5">
                          {/* 대분류 자체 필터용 선택 버튼 */}
                          <div
                            onClick={() => handleTreeClick(catKey, "ALL")}
                            className={`p-1.5 rounded cursor-pointer font-bold ${selectedTreeCategory === catKey && selectedTreeSubCategory === "ALL" ? "bg-slate-100 text-slate-950 font-extrabold" : "text-slate-500 hover:text-slate-800"}`}
                          >
                            ↳ 전체 {catKey === "Standards" ? "규격" : catKey === "TechnicalDocs" ? "기술자료" : catKey === "Reports" ? "보고서" : "기타"}
                          </div>

                          {/* 하위 소분류 */}
                          {subCats.map(subCat => {
                            const isSelected = selectedTreeCategory === catKey && selectedTreeSubCategory === subCat;
                            const count = assets.filter(a => a.category === catKey && a.subCategory === subCat).length;
                            
                            return (
                              <div
                                key={subCat}
                                onClick={() => handleTreeClick(catKey, subCat)}
                                className={`p-1.5 rounded cursor-pointer flex justify-between items-center transition-all ${isSelected ? "bg-slate-900 text-white font-bold" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50/50"}`}
                              >
                                <span>{subCat}</span>
                                <span className={`text-[8px] font-mono font-bold px-1 rounded-full ${isSelected ? "bg-white/20 text-white" : "bg-slate-50 text-slate-400"}`}>
                                  {count}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 우측 메인 패널: 리스트 및 세부사항 */}
            <div className="lg:col-span-3 space-y-6">
              
              {/* 상단 검색 및 필터 설명 & 추가 버튼 */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                      {selectedTreeCategory === "ALL" ? "전체 지식자산 리스트" : `${CATEGORY_MAP[selectedTreeCategory].label} > ${selectedTreeSubCategory === "ALL" ? "전체" : selectedTreeSubCategory}`}
                    </h4>
                    <p className="text-[10px] text-slate-400">
                      총 {filteredAssets.length}개의 매칭 문서가 발견되었습니다.
                    </p>
                  </div>

                  {/* 새 지식 추가 버튼 */}
                  <button
                    onClick={() => setShowAddForm(prev => !prev)}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 bg-indigo-50 px-2.5 py-1.5 rounded-lg border border-indigo-100 transition-all self-start md:self-auto"
                  >
                    {showAddForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                    {showAddForm ? "취소" : "신규 규격/지식 등록"}
                  </button>
                </div>

                {/* 통합 검색창 */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="규격명, 번호(예: IEC), 키워드 실시간 검색..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-950 text-xs transition-all"
                  />
                </div>
              </div>

              {/* 신규 지식 등록 폼 */}
              {showAddForm && (
                <form onSubmit={handleAddAsset} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-md animate-slide-in space-y-4 text-xs">
                  <h4 className="text-sm font-bold text-slate-950 flex items-center gap-1.5 pb-2 border-b">
                    <PlusCircle className="w-4 h-4 text-indigo-500" /> 신규 지식 자산(규격/기술자료) 정보 입력
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-600">대분류 카테고리</label>
                      <select
                        value={newCategory}
                        onChange={(e) => handleCategoryChange(e.target.value as KnowledgeCategory)}
                        className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-slate-950"
                      >
                        <option value="Standards">규격 (Standards)</option>
                        <option value="TechnicalDocs">기술자료 (Docs)</option>
                        <option value="Reports">보고서 (Reports)</option>
                        <option value="Others">기타 (Others)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-600">세부 분류</label>
                      <select
                        value={newSubCategory}
                        onChange={(e) => setNewSubCategory(e.target.value as KnowledgeSubCategory)}
                        className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-slate-950"
                      >
                        {SUB_CATEGORIES_BY_MAIN[newCategory].map(sc => (
                          <option key={sc} value={sc}>{sc}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-600">규격 번호 / 문서 코드 (선택)</label>
                      <input
                        type="text"
                        placeholder="예: IEC 60840, KS C 3002"
                        value={newCode}
                        onChange={(e) => setNewCode(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-slate-950"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-600">발행처 / 출처</label>
                      <input
                        type="text"
                        required
                        placeholder="예: CIGRE, KEMA, 특허청"
                        value={newPublisher}
                        onChange={(e) => setNewPublisher(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-slate-950"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-600">발행 연도</label>
                      <input
                        type="text"
                        required
                        placeholder="예: 2026"
                        value={newPublishYear}
                        onChange={(e) => setNewPublishYear(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-slate-950"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-600">파일 크기</label>
                      <input
                        type="text"
                        value={newFileSize}
                        onChange={(e) => setNewFileSize(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-slate-950"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">지식 명칭 / 규격 제목</label>
                    <input
                      type="text"
                      required
                      placeholder="문서의 공식 제목을 적어주세요..."
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-slate-950"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">내용 요약 및 합격기준 설명</label>
                    <textarea
                      required
                      rows={3}
                      placeholder="규격 핵심 합격기준이나 기술 논문 요약 등을 정리해 주세요..."
                      value={newSummary}
                      onChange={(e) => setNewSummary(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-slate-950"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">핵심 검색어 / 키워드 (쉼표구분)</label>
                    <input
                      type="text"
                      placeholder="예: PD측정, 가교폴리에틸렌, 시험규격"
                      value={newKeywords}
                      onChange={(e) => setNewKeywords(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-slate-950"
                    />
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      className="bg-slate-950 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow"
                    >
                      <PlusCircle className="w-4 h-4" /> 지식자산 저장
                    </button>
                  </div>
                </form>
              )}

              {/* 지식 리스트 Split layout: 좌측 리스트 / 우측 세부사항 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                
                {/* 1) 매칭 문서 카드 목록 */}
                <div className="space-y-3 overflow-y-auto max-h-[580px] pr-1">
                  {filteredAssets.length === 0 ? (
                    <div className="bg-white py-12 rounded-2xl border text-center text-slate-400 text-xs">
                      매칭되는 지식 자산이 없습니다.
                    </div>
                  ) : (
                    filteredAssets.map(asset => {
                      const isSelected = asset.id === selectedAssetId;
                      const catStyle = CATEGORY_MAP[asset.category];
                      
                      return (
                        <div
                          key={asset.id}
                          onClick={() => setSelectedAssetId(asset.id)}
                          className={`p-4 rounded-2xl border cursor-pointer transition-all space-y-2 text-xs ${isSelected ? "bg-slate-950 border-slate-950 text-white shadow-md" : "bg-white border-slate-100 hover:border-slate-300"}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <span className={`px-2 py-0.5 rounded text-[8px] font-bold border tracking-wide uppercase ${isSelected ? "bg-white/10 text-white border-white/20" : `${catStyle.bg} ${catStyle.text} ${catStyle.border}`}`}>
                                {asset.subCategory}
                              </span>
                              {asset.code && (
                                <span className={`font-bold font-mono text-[9px] ${isSelected ? "text-indigo-300" : "text-indigo-600"}`}>
                                  {asset.code}
                                </span>
                              )}
                            </div>
                            <span className="text-[8px] font-mono opacity-65 flex items-center gap-1">
                              <Calendar className="w-2.5 h-2.5" /> {asset.publishYear}
                            </span>
                          </div>

                          <h5 className="font-extrabold leading-snug line-clamp-2">
                            {asset.title}
                          </h5>

                          <div className="flex items-center justify-between pt-1 opacity-75 text-[9px]">
                            <span>발행/출처: {asset.publisher}</span>
                            {asset.fileSize && <span>크기: {asset.fileSize}</span>}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* 2) 선택된 지식 자산의 정밀 요약 및 행동 유효성 검사 */}
                <div className="space-y-4">
                  {!selectedAsset ? (
                    <div className="bg-white py-24 rounded-2xl border text-center text-slate-400 text-xs">
                      선택된 지식이 없습니다. 좌측 목록에서 카드를 선택해 주세요.
                    </div>
                  ) : (
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-5 text-xs">
                      <div className="border-b pb-4 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${CATEGORY_MAP[selectedAsset.category].bg} ${CATEGORY_MAP[selectedAsset.category].text} ${CATEGORY_MAP[selectedAsset.category].border}`}>
                            {selectedAsset.subCategory}
                          </span>
                          {selectedAsset.fileSize && (
                            <span className="text-[9px] font-mono text-slate-400">PDF ({selectedAsset.fileSize})</span>
                          )}
                        </div>

                        {selectedAsset.code && (
                          <h4 className="text-xs font-black text-indigo-700 font-mono tracking-wide uppercase">
                            문서코드: {selectedAsset.code}
                          </h4>
                        )}

                        <h3 className="text-sm font-black text-slate-950 leading-relaxed">
                          {selectedAsset.title}
                        </h3>

                        <div className="flex items-center gap-4 text-[10px] text-slate-400 font-mono">
                          <span>발행: <strong className="text-slate-600 font-bold">{selectedAsset.publisher}</strong></span>
                          <span>발행연도: {selectedAsset.publishYear}년</span>
                        </div>
                      </div>

                      {/* 요약 */}
                      <div className="space-y-1.5">
                        <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block">규격 합격기준 및 기술 핵심요약</span>
                        <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-100 leading-relaxed text-slate-700 font-medium">
                          {selectedAsset.summary}
                        </div>
                      </div>

                      {/* 태그 */}
                      <div className="space-y-1.5">
                        <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block">태그 / 색인 키워드</span>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedAsset.keywords.map(k => (
                            <span key={k} className="bg-slate-100 text-slate-700 rounded-md px-2 py-0.5 text-[9px] font-bold">
                              #{k}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* 내용 보기 */}
                      {selectedAsset.sourcePath && (
                        <div className="pt-3 border-t space-y-2">
                          <button
                            onClick={() => {
                              if (contentText) { setContentText(null); return; }
                              handleViewContent(selectedAsset);
                            }}
                            disabled={contentLoading}
                            className="w-full py-2 bg-slate-950 hover:bg-slate-800 text-white font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            {contentLoading ? "불러오는 중…" : contentText ? "내용 접기" : "내용 보기"}
                          </button>
                          {contentText && (
                            <div className="max-h-96 overflow-y-auto rounded-lg border border-slate-100 bg-slate-50 p-4 space-y-2">
                              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">PDF 원문 텍스트</p>
                              <div className="text-[11px] text-slate-700 leading-6 whitespace-pre-line break-words">
                                {contentText}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

              </div>

            </div>

          </div>
        </div>
      )}
    </div>
  );
}
