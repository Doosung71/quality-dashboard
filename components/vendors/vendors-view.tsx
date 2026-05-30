"use client";

import { useState, useMemo } from "react";
import type { VendorsData, VendorCategory, VendorGrade, VendorStatus } from "@/types/vendor";
import { 
  Building2, 
  Search, 
  MapPin, 
  TrendingUp, 
  Calendar, 
  Award, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle,
  RotateCcw,
  SlidersHorizontal,
  LucideIcon
} from "lucide-react";

interface VendorsViewProps {
  data: VendorsData;
}

export function VendorsView({ data }: VendorsViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"ALL" | VendorCategory>("ALL");
  const [selectedGrades, setSelectedGrades] = useState<VendorGrade[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<VendorStatus[]>([]);

  // 필터 초기화
  const handleResetFilters = () => {
    setSearchQuery("");
    setActiveTab("ALL");
    setSelectedGrades([]);
    setSelectedStatuses([]);
  };

  // 등급 토글
  const toggleGrade = (grade: VendorGrade) => {
    setSelectedGrades(prev => 
      prev.includes(grade) ? prev.filter(g => g !== grade) : [...prev, grade]
    );
  };

  // 상태 토글
  const toggleStatus = (status: VendorStatus) => {
    setSelectedStatuses(prev => 
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  // 18개 협력업체 데이터에 대한 계산 (KPI 요약)
  const stats = useMemo(() => {
    const list = data.vendors;
    const total = list.length;
    const avgDefect = list.reduce((acc, v) => acc + v.defectRate, 0) / total;
    const criticalCount = list.filter(v => v.status === "CRITICAL" || v.grade === "D").length;
    const warningCount = list.filter(v => v.status === "WARNING" || v.grade === "C").length;
    
    // 등급 분포
    const gradeCount = list.reduce((acc, v) => {
      acc[v.grade] = (acc[v.grade] || 0) + 1;
      return acc;
    }, {} as Record<VendorGrade, number>);

    return {
      total,
      avgDefect: avgDefect.toFixed(2),
      criticalCount,
      warningCount,
      gradeA: gradeCount["A"] || 0,
      gradeB: gradeCount["B"] || 0,
      gradeC: gradeCount["C"] || 0,
      gradeD: gradeCount["D"] || 0,
    };
  }, [data]);

  // 필터링 적용된 업체 목록
  const filteredVendors = useMemo(() => {
    return data.vendors.filter(vendor => {
      // 1. 카테고리 탭 필터링
      if (activeTab !== "ALL" && vendor.category !== activeTab) return false;

      // 2. 검색어 필터링 (업체명 또는 주요 품목)
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        const matchesName = vendor.name.toLowerCase().includes(query);
        const matchesItem = vendor.mainItem.toLowerCase().includes(query);
        const matchesLocation = vendor.location.toLowerCase().includes(query);
        if (!matchesName && !matchesItem && !matchesLocation) return false;
      }

      // 3. 등급 필터링
      if (selectedGrades.length > 0 && !selectedGrades.includes(vendor.grade)) return false;

      // 4. 상태 필터링
      if (selectedStatuses.length > 0 && !selectedStatuses.includes(vendor.status)) return false;

      return true;
    });
  }, [data, activeTab, searchQuery, selectedGrades, selectedStatuses]);

  // 등급별 스타일 설정
  const gradeStyles: Record<VendorGrade, { bg: string, text: string, border: string, dot: string }> = {
    A: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-500", dot: "bg-emerald-500" },
    B: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-400", dot: "bg-amber-400" },
    C: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-400", dot: "bg-rose-500" },
    D: { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-400", dot: "bg-slate-500" },
  };

  // 상태별 뱃지 스타일
  const statusBadges: Record<VendorStatus, { label: string, style: string, icon: LucideIcon }> = {
    NORMAL: { label: "정상", style: "bg-emerald-100 text-emerald-800", icon: CheckCircle2 },
    WARNING: { label: "경고", style: "bg-amber-100 text-amber-800", icon: AlertTriangle },
    CRITICAL: { label: "위험", style: "bg-rose-100 text-rose-800", icon: ShieldAlert },
  };

  return (
    <div className="space-y-8">
      {/* 1. KPI 대시보드 요약 (Director's View) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* 총 협력업체 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between transition-transform duration-300 hover:-translate-y-1">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 tracking-wider">총 협력업체</p>
            <h3 className="text-2xl font-bold text-slate-900">{stats.total}개사</h3>
            <p className="text-[10px] text-slate-400">품질 대시보드 등록 기준</p>
          </div>
          <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-500">
            <Building2 className="w-6 h-6" />
          </div>
        </div>

        {/* 종합 품질 건전성 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between transition-transform duration-300 hover:-translate-y-1">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 tracking-wider">조치 필요 요망</p>
            <h3 className="text-2xl font-bold text-rose-600 flex items-baseline gap-1">
              {stats.criticalCount} <span className="text-sm font-semibold text-slate-500">위험</span>
              <span className="text-lg text-slate-300 mx-1">/</span>
              <span className="text-amber-500 font-bold">{stats.warningCount}</span> <span className="text-sm font-semibold text-slate-500">경고</span>
            </h3>
            <p className="text-[10px] text-slate-400">등급 C·D 및 관리 위험 대상</p>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stats.criticalCount > 0 ? 'bg-rose-50 text-rose-500 animate-pulse' : 'bg-emerald-50 text-emerald-500'}`}>
            {stats.criticalCount > 0 ? <ShieldAlert className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
          </div>
        </div>

        {/* 평균 불량률 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between transition-transform duration-300 hover:-translate-y-1">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 tracking-wider">평균 불량률</p>
            <h3 className="text-2xl font-bold text-slate-900">{stats.avgDefect}%</h3>
            <p className="text-[10px] text-slate-400">수입검사 합격률 기준 역산</p>
          </div>
          <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-500">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* 등급 분포 미니 시각화 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between transition-transform duration-300 hover:-translate-y-1">
          <p className="text-xs font-semibold text-slate-500 tracking-wider">등급별 분포</p>
          <div className="space-y-1.5 mt-2">
            <div className="flex justify-between items-center text-xs text-slate-600">
              <span className="font-semibold">A / B / C / D</span>
              <span className="font-bold">
                {stats.gradeA} / {stats.gradeB} / {stats.gradeC} / {stats.gradeD}
              </span>
            </div>
            {/* 누적 바 그래프 */}
            <div className="w-full h-2 rounded-full overflow-hidden bg-slate-100 flex">
              <div style={{ width: `${(stats.gradeA / stats.total) * 100}%` }} className="bg-emerald-500" title={`A등급: ${stats.gradeA}개`} />
              <div style={{ width: `${(stats.gradeB / stats.total) * 100}%` }} className="bg-amber-400" title={`B등급: ${stats.gradeB}개`} />
              <div style={{ width: `${(stats.gradeC / stats.total) * 100}%` }} className="bg-rose-500" title={`C등급: ${stats.gradeC}개`} />
              <div style={{ width: `${(stats.gradeD / stats.total) * 100}%` }} className="bg-slate-500" title={`D등급: ${stats.gradeD}개`} />
            </div>
          </div>
        </div>
      </div>

      {/* 2. 검색 및 상세 필터 패널 */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          {/* 검색창 */}
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="업체명, 주요 납품 품목, 위치 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm transition-all"
            />
          </div>

          {/* 탭 컨트롤 */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl shrink-0 gap-1 overflow-x-auto">
            <button
              onClick={() => setActiveTab("ALL")}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${activeTab === "ALL" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
            >
              전체
            </button>
            <button
              onClick={() => setActiveTab("RawMaterial")}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${activeTab === "RawMaterial" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
            >
              원자재
            </button>
            <button
              onClick={() => setActiveTab("Subcontract")}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${activeTab === "Subcontract" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
            >
              반제품 외주
            </button>
            <button
              onClick={() => setActiveTab("ProductOuter")}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${activeTab === "ProductOuter" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
            >
              상품 외주
            </button>
          </div>
        </div>

        {/* 상세 필터 (등급 / 상태) */}
        <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-6 text-xs">
            {/* 등급 필터 */}
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-500 flex items-center gap-1">
                <SlidersHorizontal className="w-3.5 h-3.5" /> 등급 필터:
              </span>
              <div className="flex items-center gap-1">
                {(["A", "B", "C", "D"] as VendorGrade[]).map(grade => {
                  const isSelected = selectedGrades.includes(grade);
                  return (
                    <button
                      key={grade}
                      onClick={() => toggleGrade(grade)}
                      className={`w-8 h-8 rounded-lg font-bold border transition-all ${isSelected ? 'bg-slate-900 border-slate-900 text-white' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                    >
                      {grade}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 관리 상태 필터 */}
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-500">관리 상태:</span>
              <div className="flex items-center gap-1">
                {(["NORMAL", "WARNING", "CRITICAL"] as VendorStatus[]).map(status => {
                  const isSelected = selectedStatuses.includes(status);
                  const label = status === "NORMAL" ? "정상" : status === "WARNING" ? "경고" : "위험";
                  return (
                    <button
                      key={status}
                      onClick={() => toggleStatus(status)}
                      className={`px-3 py-1.5 rounded-lg font-medium border transition-all ${isSelected ? 'bg-slate-900 border-slate-900 text-white' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 초기화 버튼 */}
          {(searchQuery !== "" || activeTab !== "ALL" || selectedGrades.length > 0 || selectedStatuses.length > 0) && (
            <button
              onClick={handleResetFilters}
              className="text-xs font-semibold text-slate-500 hover:text-slate-900 flex items-center gap-1 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" /> 필터 초기화
            </button>
          )}
        </div>
      </div>

      {/* 3. 협력업체 카드 그리드 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <span>검색 및 필터 결과: <strong className="text-slate-900">{filteredVendors.length}</strong>개사</span>
        </div>

        {filteredVendors.length === 0 ? (
          <div className="bg-white py-16 rounded-2xl border border-slate-100 shadow-sm text-center space-y-2">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto" />
            <h4 className="text-sm font-semibold text-slate-900">검색 조건에 부합하는 협력업체가 없습니다.</h4>
            <p className="text-xs text-slate-400">검색어를 변경하거나 필터를 초기화해 보세요.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {filteredVendors.map((vendor) => {
              const style = gradeStyles[vendor.grade];
              const statusInfo = statusBadges[vendor.status];
              const StatusIcon = statusInfo.icon;
              
              return (
                <div 
                  key={vendor.id} 
                  className={`bg-white rounded-2xl border-l-[6px] ${style.border} border-y border-r border-slate-100 shadow-sm overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:shadow-md flex flex-col justify-between`}
                >
                  <div className="p-5 space-y-4">
                    {/* 카드 헤더 (업체명 + 관리상태) */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                          {vendor.category === "RawMaterial" ? "원자재" : vendor.category === "Subcontract" ? "반제품 외주" : "상품 외주"}
                        </span>
                        <h4 className="font-bold text-slate-950 text-base">{vendor.name}</h4>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        {/* 등급 배지 */}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${style.bg} ${style.text}`}>
                          {vendor.grade}
                        </div>
                      </div>
                    </div>

                    {/* 핵심 정보 목록 */}
                    <div className="space-y-2 text-xs pt-1">
                      {/* 주요 품목 */}
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">주요 품목</span>
                        <span className="font-semibold text-slate-800 text-right max-w-[150px] truncate" title={vendor.mainItem}>
                          {vendor.mainItem}
                        </span>
                      </div>

                      {/* 납품 불량률 */}
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">수입검사 불량률</span>
                        <span className={`font-semibold ${vendor.defectRate > 1.0 ? 'text-rose-600 font-bold' : 'text-slate-800'}`}>
                          {vendor.defectRate}%
                        </span>
                      </div>

                      {/* 최근 심사일 */}
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">최근 품질심사일</span>
                        <span className="font-medium text-slate-700 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" /> {vendor.lastAuditDate}
                        </span>
                      </div>

                      {/* 위치 */}
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">공장 소재지</span>
                        <span className="font-medium text-slate-700 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" /> {vendor.location}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 카드 푸터 (상태 정보 및 평가 점수) */}
                  <div className="bg-slate-50/70 border-t border-slate-100 px-5 py-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-0.5 ${statusInfo.style}`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusInfo.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-500">
                      <Award className="w-4 h-4 text-slate-400" /> 
                      평가 점수: <strong className="text-slate-800 font-bold">{vendor.score}점</strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
