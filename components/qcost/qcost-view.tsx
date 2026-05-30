"use client";

import { useState, useMemo } from "react";
import type { QCostData, QCostDetailItem } from "@/types/qcost";
import { 
  TrendingUp, 
  CircleAlert, 
  Coins, 
  ShieldCheck, 
  Search, 
  RotateCcw,
  Calendar,
  Building,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
  ListFilter
} from "lucide-react";

interface QCostViewProps {
  data: QCostData;
}

type CostCategory = QCostDetailItem["category"];

const CATEGORY_MAP: Record<CostCategory, { label: string, color: string, bg: string, text: string }> = {
  externalFailure: { label: "외부실패(클레임)", color: "#f43f5e", bg: "bg-rose-50", text: "text-rose-600" },
  internalFailure: { label: "내부실패", color: "#a855f7", bg: "bg-purple-50", text: "text-purple-600" },
  executionLoss: { label: "실행로스", color: "#f59e0b", bg: "bg-amber-50", text: "text-amber-600" },
  appraisal: { label: "평가비용", color: "#6366f1", bg: "bg-indigo-50", text: "text-indigo-600" },
  prevention: { label: "예방비용", color: "#10b981", bg: "bg-emerald-50", text: "text-emerald-600" },
};

export function QCostView({ data }: QCostViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"ALL" | CostCategory>("ALL");
  const [hoveredMonth, setHoveredMonth] = useState<string | null>(null);

  // 필터 초기화
  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("ALL");
  };

  // 5월 기준 총 집계 계산 (가장 최신 데이터)
  const currentMonthData = data.monthlyCosts[data.monthlyCosts.length - 1];
  const previousMonthData = data.monthlyCosts[data.monthlyCosts.length - 2];

  const currentTotal = useMemo(() => {
    return currentMonthData.externalFailure + 
           currentMonthData.internalFailure + 
           currentMonthData.executionLoss + 
           currentMonthData.appraisal + 
           currentMonthData.prevention;
  }, [currentMonthData]);

  const previousTotal = useMemo(() => {
    return previousMonthData.externalFailure + 
           previousMonthData.internalFailure + 
           previousMonthData.executionLoss + 
           previousMonthData.appraisal + 
           previousMonthData.prevention;
  }, [previousMonthData]);

  // 전월 대비 증감률
  const trendPercent = useMemo(() => {
    const diff = currentTotal - previousTotal;
    return ((diff / previousTotal) * 100).toFixed(1);
  }, [currentTotal, previousTotal]);

  // 5대 코스트 구성비 및 누적 통계
  const stats = useMemo(() => {
    const failureTotal = currentMonthData.externalFailure + currentMonthData.internalFailure;
    const failureRate = ((failureTotal / currentTotal) * 100).toFixed(1);
    
    const investTotal = currentMonthData.appraisal + currentMonthData.prevention;
    const investRate = ((investTotal / currentTotal) * 100).toFixed(1);

    return {
      failureTotal: failureTotal.toFixed(1),
      failureRate,
      investTotal: investTotal.toFixed(1),
      investRate
    };
  }, [currentMonthData, currentTotal]);

  // 카테고리별 비중 목록 계산 (도넛 차트 및 도표용)
  const categoryShare = useMemo(() => {
    const c = currentMonthData;
    return [
      { key: "externalFailure" as CostCategory, val: c.externalFailure, share: ((c.externalFailure / currentTotal) * 100).toFixed(1) },
      { key: "internalFailure" as CostCategory, val: c.internalFailure, share: ((c.internalFailure / currentTotal) * 100).toFixed(1) },
      { key: "executionLoss" as CostCategory, val: c.executionLoss, share: ((c.executionLoss / currentTotal) * 100).toFixed(1) },
      { key: "appraisal" as CostCategory, val: c.appraisal, share: ((c.appraisal / currentTotal) * 100).toFixed(1) },
      { key: "prevention" as CostCategory, val: c.prevention, share: ((c.prevention / currentTotal) * 100).toFixed(1) },
    ].sort((a, b) => b.val - a.val); // 높은 비용 순 정렬
  }, [currentMonthData, currentTotal]);

  // 필터링된 지출 내역 목록
  const filteredDetails = useMemo(() => {
    return data.details.filter(item => {
      // 1. 카테고리 필터
      if (selectedCategory !== "ALL" && item.category !== selectedCategory) return false;

      // 2. 검색어 필터
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(query);
        const matchesDesc = item.description.toLowerCase().includes(query);
        const matchesSource = item.source.toLowerCase().includes(query);
        if (!matchesTitle && !matchesDesc && !matchesSource) return false;
      }

      return true;
    });
  }, [data.details, selectedCategory, searchQuery]);

  // 월별 누적 스택 차트 계산에 필요한 스케일값 구하기
  const maxMonthTotal = useMemo(() => {
    return Math.max(...data.monthlyCosts.map(m => 
      m.externalFailure + m.internalFailure + m.executionLoss + m.appraisal + m.prevention
    ));
  }, [data.monthlyCosts]);

  return (
    <div className="space-y-8">
      {/* 1. Q-Cost 핵심 지표 KPI 카드 (Director's View) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* 5월 총 품질비용 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between transition-all hover:shadow-md">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 tracking-wider">5월 총 품질비용(Q-Cost)</p>
            <h3 className="text-2xl font-bold text-slate-900">{currentTotal.toFixed(1)}백만원</h3>
            <div className="flex items-center gap-1 text-[10px]">
              {currentTotal > previousTotal ? (
                <span className="text-rose-500 font-bold flex items-center">
                  <ArrowUpRight className="w-3 h-3" /> {trendPercent}% 증가
                </span>
              ) : (
                <span className="text-emerald-500 font-bold flex items-center">
                  <ArrowDownRight className="w-3 h-3" /> {Math.abs(Number(trendPercent))}% 감소
                </span>
              )}
              <span className="text-slate-400">전월 대비 ({previousTotal.toFixed(1)}M)</span>
            </div>
          </div>
          <div className="w-12 h-12 bg-slate-50 text-slate-500 rounded-xl flex items-center justify-center">
            <Coins className="w-6 h-6" />
          </div>
        </div>

        {/* 손실 비용 비중 (적색 경고 연동) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between transition-all hover:shadow-md">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 tracking-wider">실패(클레임+내부) 손실비율</p>
            <h3 className="text-2xl font-bold text-rose-600">{stats.failureRate}%</h3>
            <div className="text-[10px] text-slate-400">
              실패 비용액: <strong>{stats.failureTotal}백만원</strong>
            </div>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${Number(stats.failureRate) > 50 ? 'bg-rose-50 text-rose-500 animate-pulse' : 'bg-slate-50 text-slate-500'}`}>
            <CircleAlert className="w-6 h-6" />
          </div>
        </div>

        {/* 예방/평가 투자 비율 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between transition-all hover:shadow-md">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 tracking-wider">품질 투자 비율(예방+평가)</p>
            <h3 className="text-2xl font-bold text-emerald-600">{stats.investRate}%</h3>
            <div className="text-[10px] text-slate-400">
              투자 비용액: <strong>{stats.investTotal}백만원</strong>
            </div>
          </div>
          <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>

        {/* 실행로스 비용 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between transition-all hover:shadow-md">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 tracking-wider">5월 추가 실행로스</p>
            <h3 className="text-2xl font-bold text-amber-500">{currentMonthData.executionLoss}백만원</h3>
            <p className="text-[10px] text-slate-400">자재지연, 설계오류 등 생산 로스</p>
          </div>
          <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 2. 트렌드 그래프 & 구성비 시각화 영역 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 최근 5개월 추이 (Stacked Bar Chart 커스텀 구현) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-800 tracking-wide flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-indigo-500" /> 최근 5개월 품질비용 추이
            </h4>
            <div className="flex gap-3 text-[10px] text-slate-400">
              <span className="flex items-center gap-0.5"><span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />외부실패</span>
              <span className="flex items-center gap-0.5"><span className="w-2 h-2 rounded-full bg-purple-500 inline-block" />내부실패</span>
              <span className="flex items-center gap-0.5"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />실행로스</span>
              <span className="flex items-center gap-0.5"><span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />평가</span>
              <span className="flex items-center gap-0.5"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />예방</span>
            </div>
          </div>

          {/* 스택 바 컨테이너 */}
          <div className="h-64 flex items-end justify-between px-4 pt-4 border-b border-slate-100">
            {data.monthlyCosts.map(m => {
              const total = m.externalFailure + m.internalFailure + m.executionLoss + m.appraisal + m.prevention;
              const heightPercent = (total / maxMonthTotal) * 100;
              
              const extHeight = (m.externalFailure / total) * 100;
              const intHeight = (m.internalFailure / total) * 100;
              const exeHeight = (m.executionLoss / total) * 100;
              const appHeight = (m.appraisal / total) * 100;
              const preHeight = (m.prevention / total) * 100;

              const isHovered = hoveredMonth === m.month;

              return (
                <div 
                  key={m.month} 
                  className="flex flex-col items-center gap-2 w-1/5 relative group"
                  onMouseEnter={() => setHoveredMonth(m.month)}
                  onMouseLeave={() => setHoveredMonth(null)}
                >
                  {/* 호버 시 세부 수치 툴팁 */}
                  {isHovered && (
                    <div className="absolute bottom-[280px] bg-slate-900/95 text-white p-3 rounded-xl shadow-xl text-[10px] w-44 z-30 space-y-1.5 transition-all">
                      <p className="font-bold text-center border-b border-slate-700 pb-1 text-slate-200">{m.month} 세부코스트</p>
                      <div className="flex justify-between"><span>외부실패:</span><span className="font-bold text-rose-400">{m.externalFailure}M</span></div>
                      <div className="flex justify-between"><span>내부실패:</span><span className="font-bold text-purple-400">{m.internalFailure}M</span></div>
                      <div className="flex justify-between"><span>실행로스:</span><span className="font-bold text-amber-400">{m.executionLoss}M</span></div>
                      <div className="flex justify-between"><span>평가비용:</span><span className="font-bold text-indigo-400">{m.appraisal}M</span></div>
                      <div className="flex justify-between"><span>예방비용:</span><span className="font-bold text-emerald-400">{m.prevention}M</span></div>
                      <div className="flex justify-between border-t border-slate-700 pt-1 font-bold"><span>합계:</span><span className="text-white">{total.toFixed(1)}M</span></div>
                    </div>
                  )}

                  {/* 수치 라벨 */}
                  <span className="text-[10px] font-bold text-slate-500 mb-1 group-hover:text-slate-900">
                    {total.toFixed(0)}M
                  </span>

                  {/* 누적 바 */}
                  <div 
                    style={{ height: `${heightPercent * 1.8}px` }} 
                    className="w-12 rounded-t-md overflow-hidden bg-slate-100 flex flex-col justify-end transition-all group-hover:ring-2 group-hover:ring-slate-900 group-hover:ring-offset-2"
                  >
                    <div style={{ height: `${extHeight}%` }} className="bg-rose-500" title={`외부실패: ${m.externalFailure}M`} />
                    <div style={{ height: `${intHeight}%` }} className="bg-purple-500" title={`내부실패: ${m.internalFailure}M`} />
                    <div style={{ height: `${exeHeight}%` }} className="bg-amber-500" title={`실행로스: ${m.executionLoss}M`} />
                    <div style={{ height: `${appHeight}%` }} className="bg-indigo-500" title={`평가: ${m.appraisal}M`} />
                    <div style={{ height: `${preHeight}%` }} className="bg-emerald-500" title={`예방: ${m.prevention}M`} />
                  </div>

                  {/* 월 축 이름 */}
                  <span className="text-[10px] text-slate-400 mt-2 font-mono group-hover:text-slate-800">
                    {m.month}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 5월 Q-Cost 구성비 (도넛 & 차트 리스트) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between space-y-4">
          <h4 className="text-sm font-bold text-slate-800 tracking-wide flex items-center gap-1.5">
            <PieChart className="w-4 h-4 text-indigo-500" /> 5월 품질비용 구성비 (%)
          </h4>

          {/* 아름다운 구성비 리스트 바 */}
          <div className="space-y-4 flex-1 flex flex-col justify-center">
            {categoryShare.map(item => {
              const info = CATEGORY_MAP[item.key];
              return (
                <div key={item.key} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: info.color }} />
                      {info.label}
                    </span>
                    <span className="text-slate-500">
                      <strong className="text-slate-800 font-bold">{item.val.toFixed(1)}M</strong> ({item.share}%)
                    </span>
                  </div>
                  {/* 단일 프로그레스 게이지 */}
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div 
                      style={{ width: `${item.share}%`, backgroundColor: info.color }} 
                      className="h-full rounded-full transition-all duration-500"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. 상세 지출 내역 리스트 패널 */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
        {/* 검색 및 필터 헤더 */}
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          <h4 className="text-sm font-bold text-slate-800 tracking-wide flex items-center gap-1.5">
            <ListFilter className="w-4 h-4 text-indigo-500" /> 5월 세부 지출 항목 명세
          </h4>

          {/* 카테고리 필터 탭 */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl shrink-0 gap-1 overflow-x-auto">
            <button
              onClick={() => setSelectedCategory("ALL")}
              className={`px-3 py-1 rounded-lg text-[10px] font-semibold transition-all whitespace-nowrap ${selectedCategory === "ALL" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
            >
              전체
            </button>
            {Object.entries(CATEGORY_MAP).map(([key, info]) => (
              <button
                key={key}
                onClick={() => setSelectedCategory(key as CostCategory)}
                className={`px-3 py-1 rounded-lg text-[10px] font-semibold transition-all whitespace-nowrap ${selectedCategory === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
              >
                {info.label.split("(")[0]}
              </button>
            ))}
          </div>
        </div>

        {/* 내역 검색창 */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="내역 제목, 상세 내역 설명, 집행 부서 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-950 text-xs transition-all"
            />
          </div>

          {(searchQuery !== "" || selectedCategory !== "ALL") && (
            <button
              onClick={handleResetFilters}
              className="text-[10px] font-semibold text-slate-500 hover:text-slate-950 bg-slate-50 px-2.5 py-2 rounded-xl border border-slate-200 flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" /> 필터 초기화
            </button>
          )}
        </div>

        {/* 결과 내역 테이블형 카드 리스트 */}
        <div className="space-y-3">
          {filteredDetails.length === 0 ? (
            <div className="py-12 border-2 border-dashed border-slate-100 rounded-xl text-center text-slate-300 space-y-1">
              <Coins className="w-8 h-8 mx-auto text-slate-200" />
              <p className="text-xs font-semibold text-slate-500">부합하는 상세 지출 내역이 없습니다.</p>
            </div>
          ) : (
            filteredDetails.map(item => {
              const info = CATEGORY_MAP[item.category];
              return (
                <div 
                  key={item.id} 
                  className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 transition-all hover:border-slate-300 hover:shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-2 flex-1">
                    {/* 카테고리 배지 + 발생일 + 관리부서 */}
                    <div className="flex flex-wrap items-center gap-2 text-[10px]">
                      <span className={`px-2 py-0.5 rounded-full font-bold border ${info.bg} ${info.text}`}>
                        {info.label}
                      </span>
                      <span className="text-slate-400 font-mono flex items-center gap-0.5">
                        <Calendar className="w-3 h-3 text-slate-300" /> {item.date}
                      </span>
                      <span className="text-slate-400 flex items-center gap-0.5">
                        <Building className="w-3 h-3 text-slate-300" /> {item.source}
                      </span>
                    </div>

                    {/* 제목 */}
                    <h5 className="font-extrabold text-slate-900 text-sm">{item.title}</h5>

                    {/* 설명 */}
                    <p className="text-slate-600 text-xs leading-relaxed max-w-2xl">{item.description}</p>
                  </div>

                  {/* 금액 비용 표시 */}
                  <div className="text-right shrink-0">
                    <p className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">지출비용</p>
                    <p className="text-lg font-black text-slate-900 mt-0.5">
                      {item.cost.toFixed(1)} <span className="text-xs font-bold text-slate-500">백만원</span>
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
