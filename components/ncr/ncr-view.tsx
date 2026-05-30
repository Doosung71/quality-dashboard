"use client";

import { useState, useMemo } from "react";
import type { NCRsData, NCR, NCRStatus, NCRSeverity, NCRDispositionType } from "@/types/ncr";
import { 
  ShieldAlert,
  CheckCircle2,
  Calendar,
  User,
  Clock,
  MapPin,
  TrendingUp,
  FileText,
  Search,
  SlidersHorizontal,
  X,
  ArrowRightCircle
} from "lucide-react";

interface NCRViewProps {
  data: NCRsData;
}

const STATUS_COLUMNS: { status: NCRStatus; label: string; color: string }[] = [
  { status: "Issued", label: "발행", color: "border-t-blue-500 bg-blue-50/10" },
  { status: "Disposition", label: "처리방안 수립", color: "border-t-purple-500 bg-purple-50/10" },
  { status: "CorrectiveAction", label: "시정조치 중", color: "border-t-amber-500 bg-amber-50/10" },
  { status: "Verification", label: "효과검증", color: "border-t-indigo-500 bg-indigo-50/10" },
  { status: "Closed", label: "종결 완료", color: "border-t-emerald-500 bg-emerald-50/10" },
];

export function NCRView({ data }: NCRViewProps) {
  const [ncrs, setNcrs] = useState<NCR[]>(data.ncrs);
  const [selectedNCR, setSelectedNCR] = useState<NCR | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSeverities, setSelectedSeverities] = useState<NCRSeverity[]>([]);
  const [selectedDispositions, setSelectedDispositions] = useState<NCRDispositionType[]>([]);

  // 오늘 날짜 기준 (2026-05-30)
  const TODAY = "2026-05-30";

  // 기한 경과(Overdue) 여부 체크
  const isOverdue = (ncr: NCR) => {
    return ncr.status !== "Closed" && ncr.targetDate < TODAY;
  };

  // 상세 필터 초기화
  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedSeverities([]);
    setSelectedDispositions([]);
  };

  // 심각도 필터 토글
  const toggleSeverity = (severity: NCRSeverity) => {
    setSelectedSeverities(prev => 
      prev.includes(severity) ? prev.filter(s => s !== severity) : [...prev, severity]
    );
  };

  // 처리방안 필터 토글
  const toggleDisposition = (disp: NCRDispositionType) => {
    setSelectedDispositions(prev => 
      prev.includes(disp) ? prev.filter(d => d !== disp) : [...prev, disp]
    );
  };

  // KPI 분석 통계
  const kpis = useMemo(() => {
    const total = ncrs.length;
    const openNcrs = ncrs.filter(n => n.status !== "Closed").length;
    const overdueNcrs = ncrs.filter(isOverdue).length;
    const closedCount = ncrs.filter(n => n.status === "Closed").length;
    const closedRate = total > 0 ? ((closedCount / total) * 100).toFixed(0) : "0";

    const criticalCount = ncrs.filter(n => n.severity === "Critical").length;
    const majorCount = ncrs.filter(n => n.severity === "Major").length;
    const minorCount = ncrs.filter(n => n.severity === "Minor").length;

    return {
      total,
      openNcrs,
      overdueNcrs,
      closedRate,
      criticalCount,
      majorCount,
      minorCount
    };
  }, [ncrs]);

  // 검색 및 필터 가공 데이터
  const filteredNCRs = useMemo(() => {
    return ncrs.filter(n => {
      // 1. 검색어
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        const matchesTitle = n.title.toLowerCase().includes(query);
        const matchesSource = n.source.toLowerCase().includes(query);
        const matchesAssignee = n.assignee.toLowerCase().includes(query);
        const matchesDesc = n.description.toLowerCase().includes(query);
        if (!matchesTitle && !matchesSource && !matchesAssignee && !matchesDesc) return false;
      }

      // 2. 심각도
      if (selectedSeverities.length > 0 && !selectedSeverities.includes(n.severity)) return false;

      // 3. 처리방안
      if (selectedDispositions.length > 0 && !selectedDispositions.includes(n.disposition)) return false;

      return true;
    });
  }, [ncrs, searchQuery, selectedSeverities, selectedDispositions]);

  // 칸반 컬럼별 필터링
  const columnsData = useMemo(() => {
    const columns: Record<NCRStatus, NCR[]> = {
      Issued: [],
      Disposition: [],
      CorrectiveAction: [],
      Verification: [],
      Closed: [],
    };

    filteredNCRs.forEach(ncr => {
      columns[ncr.status].push(ncr);
    });

    return columns;
  }, [filteredNCRs]);

  // 카드 클릭 처리
  const handleCardClick = (ncr: NCR) => {
    setSelectedNCR(ncr);
  };

  // 모의 단계 이동
  const handleMoveToNextStep = (ncr: NCR) => {
    const currentIndex = STATUS_COLUMNS.findIndex(c => c.status === ncr.status);
    if (currentIndex >= 0 && currentIndex < STATUS_COLUMNS.length - 1) {
      const nextStatus = STATUS_COLUMNS[currentIndex + 1].status;
      const updatedNcr: NCR = {
        ...ncr,
        status: nextStatus,
        closedDate: nextStatus === "Closed" ? TODAY : undefined,
        timeline: [
          ...(ncr.timeline || []),
          {
            date: TODAY,
            action: `부적합 상태 변경: [${STATUS_COLUMNS[currentIndex].label}] → [${STATUS_COLUMNS[currentIndex + 1].label}]`,
            user: "품질부문장 Dennis (승인)"
          }
        ]
      };

      setNcrs(prev => prev.map(item => item.id === ncr.id ? updatedNcr : item));
      setSelectedNCR(updatedNcr);
    }
  };

  // 심각도 뱃지 스타일
  const severityBadges: Record<NCRSeverity, string> = {
    Critical: "bg-rose-100 text-rose-800 border-rose-200 animate-pulse font-extrabold",
    Major: "bg-amber-100 text-amber-800 border-amber-200 font-bold",
    Minor: "bg-slate-100 text-slate-700 border-slate-200",
  };

  // 처리방안 뱃지 스타일
  const dispositionBadges: Record<NCRDispositionType, { label: string, style: string }> = {
    Scrap: { label: "폐기 (Scrap)", style: "bg-red-50 text-red-700 border-red-200" },
    Rework: { label: "재작업 (Rework)", style: "bg-violet-50 text-violet-700 border-violet-200" },
    Concession: { label: "특채 (Concession)", style: "bg-blue-50 text-blue-700 border-blue-200" },
    TBD: { label: "방안 미정", style: "bg-zinc-50 text-zinc-600 border-zinc-200" },
  };

  return (
    <div className="space-y-8 relative">
      {/* 1. KPI 요약 (Non-goals & Director's Alert) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* 누적 NCR */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between transition-all hover:shadow-md">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 tracking-wider">누적 부적합보고(NCR)</p>
            <h3 className="text-2xl font-bold text-slate-900">{kpis.total}건</h3>
            <p className="text-[10px] text-slate-400">품질 개선 파이프라인 누계</p>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        {/* 미처리 NCR */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between transition-all hover:shadow-md">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 tracking-wider">진행 중 부적합(Open)</p>
            <h3 className="text-2xl font-bold text-indigo-600">{kpis.openNcrs}건</h3>
            <p className="text-[10px] text-slate-400">조치 및 유효성 검증 진행 대상</p>
          </div>
          <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-xl flex items-center justify-center">
            <Clock className="w-6 h-6 animate-spin-slow" />
          </div>
        </div>

        {/* 기한 경과 (Director's Red Alert) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between transition-all hover:shadow-md">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 tracking-wider">조치 기한 초과(Overdue)</p>
            <h3 className={`text-2xl font-bold ${kpis.overdueNcrs > 0 ? 'text-rose-600 animate-pulse' : 'text-emerald-600'}`}>
              {kpis.overdueNcrs}건
            </h3>
            <p className="text-[10px] text-slate-400">오늘({TODAY}) 기준 조치 기한 초과</p>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${kpis.overdueNcrs > 0 ? 'bg-rose-50 text-rose-500 animate-pulse' : 'bg-emerald-50 text-emerald-500'}`}>
            {kpis.overdueNcrs > 0 ? <ShieldAlert className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
          </div>
        </div>

        {/* 심각도 분포 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between transition-all hover:shadow-md">
          <p className="text-xs font-semibold text-slate-500 tracking-wider">심각도별 분포 (Critical/Major/Minor)</p>
          <div className="space-y-1.5 mt-2">
            <div className="flex justify-between items-center text-xs text-slate-600">
              <span className="font-semibold">위험도 비중</span>
              <span className="font-bold text-slate-800">
                {kpis.criticalCount} / {kpis.majorCount} / {kpis.minorCount}
              </span>
            </div>
            <div className="w-full h-2 rounded-full overflow-hidden bg-slate-100 flex">
              <div style={{ width: `${(kpis.criticalCount / kpis.total) * 100}%` }} className="bg-rose-600" title={`Critical: ${kpis.criticalCount}건`} />
              <div style={{ width: `${(kpis.majorCount / kpis.total) * 100}%` }} className="bg-amber-500" title={`Major: ${kpis.majorCount}건`} />
              <div style={{ width: `${(kpis.minorCount / kpis.total) * 100}%` }} className="bg-slate-400" title={`Minor: ${kpis.minorCount}건`} />
            </div>
          </div>
        </div>
      </div>

      {/* 2. 검색 및 상세 필터 패널 */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="부적합 제목, 공장 발생처, 담당자 이름 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-950 text-sm transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs">
            {/* 심각도 필터 */}
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-500 flex items-center gap-1">
                <SlidersHorizontal className="w-3.5 h-3.5" /> 위험도:
              </span>
              <div className="flex items-center gap-1">
                {(["Critical", "Major", "Minor"] as NCRSeverity[]).map(sev => {
                  const isSelected = selectedSeverities.includes(sev);
                  return (
                    <button
                      key={sev}
                      onClick={() => toggleSeverity(sev)}
                      className={`px-2.5 py-1 rounded-lg border font-bold transition-all ${isSelected ? 'bg-slate-900 border-slate-900 text-white' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                    >
                      {sev === "Critical" ? "Critical" : sev === "Major" ? "Major" : "Minor"}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 처리방안 필터 */}
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-500">방안:</span>
              <div className="flex items-center gap-1">
                {(["Scrap", "Rework", "Concession", "TBD"] as NCRDispositionType[]).map(disp => {
                  const isSelected = selectedDispositions.includes(disp);
                  const label = disp === "Scrap" ? "폐기" : disp === "Rework" ? "재작업" : disp === "Concession" ? "특채" : "미정";
                  return (
                    <button
                      key={disp}
                      onClick={() => toggleDisposition(disp)}
                      className={`px-2.5 py-1 rounded-lg border font-medium transition-all ${isSelected ? 'bg-slate-900 border-slate-900 text-white' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 리셋 */}
            {(searchQuery !== "" || selectedSeverities.length > 0 || selectedDispositions.length > 0) && (
              <button
                onClick={handleResetFilters}
                className="text-slate-500 hover:text-slate-900 hover:underline flex items-center gap-0.5 ml-2"
              >
                필터 초기화
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. 5단계 칸반 보드 */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start overflow-x-auto pb-4">
        {STATUS_COLUMNS.map((column) => {
          const ncrItems = columnsData[column.status] || [];
          return (
            <div 
              key={column.status} 
              className={`rounded-2xl border-t-[4px] ${column.color} border-x border-b border-slate-100 shadow-sm p-4 min-w-[220px] min-h-[500px] flex flex-col justify-start gap-4`}
            >
              {/* 컬럼 타이틀 */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  {column.label}
                </span>
                <span className="bg-slate-200/80 text-slate-600 rounded-full px-2 py-0.5 text-[10px] font-bold">
                  {ncrItems.length}
                </span>
              </div>

              {/* 카드 리스트 */}
              <div className="flex flex-col gap-3 flex-1 overflow-y-auto">
                {ncrItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center text-slate-300 gap-1 border-2 border-dashed border-slate-100 rounded-xl flex-1">
                    <CheckCircle2 className="w-6 h-6 text-slate-200" />
                    <span className="text-[10px] font-medium text-slate-400">부적합 없음</span>
                  </div>
                ) : (
                  ncrItems.map((ncr) => {
                    const overdue = isOverdue(ncr);
                    const dispInfo = dispositionBadges[ncr.disposition];
                    
                    return (
                      <div
                        key={ncr.id}
                        onClick={() => handleCardClick(ncr)}
                        className={`bg-white p-4 rounded-xl border border-slate-100 shadow-sm cursor-pointer transition-all hover:-translate-y-1 hover:shadow-md hover:border-slate-300 relative space-y-3 ${overdue ? 'ring-1 ring-rose-400 border-rose-200 bg-rose-50/5' : ''}`}
                      >
                        {/* 카드 위쪽 정보 (ID + 위험도) */}
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[9px] font-bold font-mono text-slate-400">{ncr.id}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[8px] border ${severityBadges[ncr.severity]}`}>
                            {ncr.severity}
                          </span>
                        </div>

                        {/* 제목 */}
                        <h4 className="font-bold text-slate-900 text-xs line-clamp-2 leading-snug">{ncr.title}</h4>

                        {/* 발생 부서/설비 */}
                        <div className="flex items-center gap-1 text-[10px] text-slate-500">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate">{ncr.source}</span>
                        </div>

                        {/* 처리방안 및 기한 경과 */}
                        <div className="flex items-center justify-between pt-1 border-t border-slate-50 text-[9px]">
                          <span className="text-slate-400">방안: <strong className="text-slate-600 font-semibold">{dispInfo.label}</strong></span>
                          
                          {overdue ? (
                            <span className="text-rose-600 font-bold bg-rose-100 px-1 rounded flex items-center gap-0.5 animate-pulse">
                              <ShieldAlert className="w-2.5 h-2.5" /> 기한초과
                            </span>
                          ) : (
                            <span className="text-slate-500 flex items-center gap-0.5">
                              <Calendar className="w-2.5 h-2.5 text-slate-400" /> {ncr.targetDate}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. 부적합 상세 조회 및 조치 사이드바 (슬라이드 패널) */}
      {selectedNCR && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-50 flex justify-end transition-opacity duration-300">
          <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden animate-slide-in relative border-l border-slate-100">
            {/* 헤더 */}
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-mono font-bold text-indigo-600">{selectedNCR.id}</span>
                <h3 className="font-extrabold text-slate-900 text-base">{selectedNCR.title}</h3>
              </div>
              <button 
                onClick={() => setSelectedNCR(null)}
                className="text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 p-1.5 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 바디 내용 */}
            <div className="p-6 flex-1 overflow-y-auto space-y-6 text-sm text-slate-700">
              {/* 기본 요약 필드 */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold block">발생 공장/검사처</span>
                  <span className="font-semibold text-slate-800 flex items-center gap-1">
                    <MapPin className="w-4 h-4 text-slate-400" /> {selectedNCR.source}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold block">조치 담당 책임자</span>
                  <span className="font-semibold text-slate-800 flex items-center gap-1">
                    <User className="w-4 h-4 text-slate-400" /> {selectedNCR.assignee}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold block">부적합 위험 강도</span>
                  <span className={`inline-block px-2 py-0.5 rounded text-xs border ${severityBadges[selectedNCR.severity]}`}>
                    {selectedNCR.severity}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold block">처리방안 결정</span>
                  <span className={`inline-block px-2 py-0.5 rounded text-xs border ${dispositionBadges[selectedNCR.disposition].style}`}>
                    {dispositionBadges[selectedNCR.disposition].label}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold block">최초 보고일</span>
                  <span className="font-semibold text-slate-800">{selectedNCR.issuedDate}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold block">완료 예정 기한</span>
                  <span className={`font-semibold ${isOverdue(selectedNCR) ? 'text-rose-600 font-extrabold' : 'text-slate-800'}`}>
                    {selectedNCR.targetDate}
                    {isOverdue(selectedNCR) && " (조치기한 경과)"}
                  </span>
                </div>
              </div>

              {/* 부적합 상세 설명 */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1">
                  <SlidersHorizontal className="w-4 h-4 text-slate-400" /> 부적합 현상 및 원인 기술
                </h4>
                <div className="bg-slate-50 p-4 rounded-xl text-slate-700 leading-relaxed text-xs border border-slate-100">
                  {selectedNCR.description}
                </div>
              </div>

              {/* 조치 및 추적 타임라인 */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1">
                  <TrendingUp className="w-4 h-4 text-slate-400" /> 품질 활동 조치 이력 (Audit Trail)
                </h4>
                <div className="relative border-l border-slate-200 pl-4 ml-2 space-y-4">
                  {selectedNCR.timeline && selectedNCR.timeline.map((item, index) => (
                    <div key={index} className="relative text-xs">
                      {/* 타임라인 원점 */}
                      <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-slate-300 border border-white" />
                      <div className="flex items-center justify-between text-slate-400 text-[10px] mb-0.5">
                        <span className="font-mono">{item.date}</span>
                        <span className="font-semibold text-slate-500">{item.user}</span>
                      </div>
                      <p className="text-slate-700 font-medium">{item.action}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 하단 단계 진행 액션 버튼 (Zero Double Work) */}
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center gap-2 justify-end">
              {selectedNCR.status !== "Closed" ? (
                <button
                  onClick={() => handleMoveToNextStep(selectedNCR)}
                  className="bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow transition-all flex items-center gap-1.5"
                >
                  <ArrowRightCircle className="w-4 h-4" />
                  {selectedNCR.status === "Verification" ? "최종 종결 승인하기" : "조치 단계 승인 및 이동"}
                </button>
              ) : (
                <div className="text-emerald-700 font-bold text-xs flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> 부적합 조치 프로세스 종결 완료
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
