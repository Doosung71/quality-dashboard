"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { NCRsData, NCR, NCRStatus, NCRSeverity, NCRDispositionType } from "@/types/ncr";
import {
  ShieldAlert, CheckCircle2, Calendar, Clock,
  MapPin, FileText, Search, SlidersHorizontal, X, Plus
} from "lucide-react";

interface NCRViewProps {
  data: NCRsData;
  canEdit?: boolean;
  userName?: string;
}

const STATUS_COLUMNS: { status: NCRStatus; label: string; color: string }[] = [
  { status: "Issued",          label: "발행",           color: "border-t-blue-500 bg-blue-50/10" },
  { status: "Disposition",     label: "처리방안 수립",   color: "border-t-purple-500 bg-purple-50/10" },
  { status: "CorrectiveAction",label: "시정조치 중",     color: "border-t-amber-500 bg-amber-50/10" },
  { status: "Verification",    label: "효과검증",        color: "border-t-indigo-500 bg-indigo-50/10" },
  { status: "Closed",          label: "종결 완료",       color: "border-t-emerald-500 bg-emerald-50/10" },
];

function getToday() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
}

function isOverdue(ncr: NCR): boolean {
  return ncr.status !== "Closed" && ncr.targetDate < getToday();
}

export function NCRView({ data, canEdit = true, userName }: NCRViewProps) {
  const router = useRouter();
  const [ncrs] = useState<NCR[]>(data.ncrs);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSeverities, setSelectedSeverities] = useState<NCRSeverity[]>([]);
  const [selectedDispositions, setSelectedDispositions] = useState<NCRDispositionType[]>([]);

  const getDefaultForm = () => {
    const d = new Date(); d.setDate(d.getDate() + 14);
    const targetDate = d.toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
    return { title: "", source: "", severity: "Major" as NCRSeverity, disposition: "TBD" as NCRDispositionType, targetDate, description: "" };
  };
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(getDefaultForm);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const TODAY = getToday();

  const handleResetFilters = () => { setSearchQuery(""); setSelectedSeverities([]); setSelectedDispositions([]); };
  const toggleSeverity = (s: NCRSeverity) => setSelectedSeverities(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);
  const toggleDisposition = (d: NCRDispositionType) => setSelectedDispositions(p => p.includes(d) ? p.filter(x => x !== d) : [...p, d]);

  const kpis = useMemo(() => {
    const total        = ncrs.length;
    const openNcrs     = ncrs.filter(n => n.status !== "Closed").length;
    const overdueNcrs  = ncrs.filter(isOverdue).length;
    const closedCount  = ncrs.filter(n => n.status === "Closed").length;
    const closedRate   = total > 0 ? ((closedCount / total) * 100).toFixed(0) : "0";
    const criticalCount = ncrs.filter(n => n.severity === "Critical").length;
    const majorCount    = ncrs.filter(n => n.severity === "Major").length;
    const minorCount    = ncrs.filter(n => n.severity === "Minor").length;
    return { total, openNcrs, overdueNcrs, closedRate, criticalCount, majorCount, minorCount };
  }, [ncrs]);

  const filteredNCRs = useMemo(() => {
    return ncrs.filter(n => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!n.title.toLowerCase().includes(q) && !n.source.toLowerCase().includes(q) &&
            !n.assignee.toLowerCase().includes(q) && !n.description.toLowerCase().includes(q)) return false;
      }
      if (selectedSeverities.length > 0 && !selectedSeverities.includes(n.severity)) return false;
      if (selectedDispositions.length > 0 && !selectedDispositions.includes(n.disposition)) return false;
      return true;
    });
  }, [ncrs, searchQuery, selectedSeverities, selectedDispositions]);

  const columnsData = useMemo(() => {
    const columns: Record<NCRStatus, NCR[]> = { Issued: [], Disposition: [], CorrectiveAction: [], Verification: [], Closed: [] };
    filteredNCRs.forEach(ncr => { columns[ncr.status].push(ncr); });
    return columns;
  }, [filteredNCRs]);

  async function handleNewNCRSubmit() {
    if (!formData.title.trim() || !formData.source.trim() || !formData.description.trim()) {
      setFormError("제목, 발생처, 상세 설명은 필수 입력항목입니다."); return;
    }
    setSubmitting(true); setFormError("");
    try {
      const res = await fetch("/api/ncr", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, assignee: userName || "등록자" }),
      });
      if (!res.ok) throw new Error("등록 실패");
      setFormData(getDefaultForm()); setShowForm(false);
      router.refresh();
    } catch {
      setFormError("등록 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  const severityBadges: Record<NCRSeverity, string> = {
    Critical: "bg-rose-100 text-rose-800 border-rose-200 animate-pulse font-extrabold",
    Major:    "bg-amber-100 text-amber-800 border-amber-200 font-bold",
    Minor:    "bg-slate-100 text-slate-700 border-slate-200",
  };
  const dispositionBadges: Record<NCRDispositionType, { label: string; style: string }> = {
    Scrap:     { label: "폐기 (Scrap)",       style: "bg-red-50 text-red-700 border-red-200" },
    Rework:    { label: "재작업 (Rework)",     style: "bg-violet-50 text-violet-700 border-violet-200" },
    Concession:{ label: "특채 (Concession)",   style: "bg-blue-50 text-blue-700 border-blue-200" },
    TBD:       { label: "방안 미정",           style: "bg-zinc-50 text-zinc-600 border-zinc-200" },
  };

  return (
    <div className="space-y-8 relative">
      {/* KPI 요약 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 tracking-wider">누적 부적합보고(NCR)</p>
            <h3 className="text-2xl font-bold text-slate-900">{kpis.total}건</h3>
            <p className="text-[10px] text-slate-400">품질 개선 파이프라인 누계</p>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 tracking-wider">진행 중 부적합(Open)</p>
            <h3 className="text-2xl font-bold text-indigo-600">{kpis.openNcrs}건</h3>
            <p className="text-[10px] text-slate-400">조치 및 유효성 검증 진행 대상</p>
          </div>
          <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-xl flex items-center justify-center">
            <Clock className="w-6 h-6 animate-spin-slow" />
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 tracking-wider">조치 기한 초과(Overdue)</p>
            <h3 className={`text-2xl font-bold ${kpis.overdueNcrs > 0 ? "text-rose-600 animate-pulse" : "text-emerald-600"}`}>{kpis.overdueNcrs}건</h3>
            <p className="text-[10px] text-slate-400">오늘({TODAY}) 기준 조치 기한 초과</p>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${kpis.overdueNcrs > 0 ? "bg-rose-50 text-rose-500 animate-pulse" : "bg-emerald-50 text-emerald-500"}`}>
            {kpis.overdueNcrs > 0 ? <ShieldAlert className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
          <p className="text-xs font-semibold text-slate-500 tracking-wider">심각도별 분포 (Critical/Major/Minor)</p>
          <div className="space-y-1.5 mt-2">
            <div className="flex justify-between items-center text-xs text-slate-600">
              <span className="font-semibold">위험도 비중</span>
              <span className="font-bold text-slate-800">{kpis.criticalCount} / {kpis.majorCount} / {kpis.minorCount}</span>
            </div>
            <div className="w-full h-2 rounded-full overflow-hidden bg-slate-100 flex">
              {kpis.total > 0 && <>
                <div style={{ width: `${(kpis.criticalCount / kpis.total) * 100}%` }} className="bg-rose-600" />
                <div style={{ width: `${(kpis.majorCount / kpis.total) * 100}%` }}    className="bg-amber-500" />
                <div style={{ width: `${(kpis.minorCount / kpis.total) * 100}%` }}    className="bg-slate-400" />
              </>}
            </div>
          </div>
        </div>
      </div>

      {/* 신규 NCR 등록 버튼 */}
      {canEdit && (
        <div className="flex justify-end">
          <button onClick={() => { setFormData(getDefaultForm()); setFormError(""); setShowForm(true); }}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-950 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-all shadow-sm">
            <Plus className="w-4 h-4" /> 신규 NCR 등록
          </button>
        </div>
      )}

      {/* 검색 및 필터 */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="부적합 제목, 공장 발생처, 담당자 이름 검색..."
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-950 text-sm transition-all" />
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-500 flex items-center gap-1"><SlidersHorizontal className="w-3.5 h-3.5" /> 위험도:</span>
              <div className="flex items-center gap-1">
                {(["Critical", "Major", "Minor"] as NCRSeverity[]).map(sev => (
                  <button key={sev} onClick={() => toggleSeverity(sev)}
                    className={`px-2.5 py-1 rounded-lg border font-bold transition-all ${selectedSeverities.includes(sev) ? "bg-slate-900 border-slate-900 text-white" : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"}`}>
                    {sev}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-500">방안:</span>
              <div className="flex items-center gap-1">
                {(["Scrap", "Rework", "Concession", "TBD"] as NCRDispositionType[]).map(disp => {
                  const label = disp === "Scrap" ? "폐기" : disp === "Rework" ? "재작업" : disp === "Concession" ? "특채" : "미정";
                  return (
                    <button key={disp} onClick={() => toggleDisposition(disp)}
                      className={`px-2.5 py-1 rounded-lg border font-medium transition-all ${selectedDispositions.includes(disp) ? "bg-slate-900 border-slate-900 text-white" : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"}`}>
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
            {(searchQuery !== "" || selectedSeverities.length > 0 || selectedDispositions.length > 0) && (
              <button onClick={handleResetFilters} className="text-slate-500 hover:text-slate-900 hover:underline flex items-center gap-0.5 ml-2">필터 초기화</button>
            )}
          </div>
        </div>
      </div>

      {/* 칸반 보드 */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start overflow-x-auto pb-4">
        {STATUS_COLUMNS.map((column) => {
          const ncrItems = columnsData[column.status] || [];
          return (
            <div key={column.status}
              className={`rounded-2xl border-t-[4px] ${column.color} border-x border-b border-slate-100 shadow-sm p-4 min-w-[220px] min-h-[500px] flex flex-col justify-start gap-4`}>
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="font-bold text-slate-800 text-xs">{column.label}</span>
                <span className="bg-slate-200/80 text-slate-600 rounded-full px-2 py-0.5 text-[10px] font-bold">{ncrItems.length}</span>
              </div>
              <div className="flex flex-col gap-3 flex-1 overflow-y-auto">
                {ncrItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center gap-1 border-2 border-dashed border-slate-100 rounded-xl flex-1">
                    <CheckCircle2 className="w-6 h-6 text-slate-200" />
                    <span className="text-[10px] font-medium text-slate-400">부적합 없음</span>
                  </div>
                ) : (
                  ncrItems.map((ncr) => {
                    const overdue  = isOverdue(ncr);
                    const dispInfo = dispositionBadges[ncr.disposition];
                    return (
                      <Link key={ncr.id} href={`/ncr/${ncr.id}`}
                        className={`block bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:-translate-y-1 hover:shadow-md hover:border-slate-300 transition-all relative space-y-3 ${overdue ? "ring-1 ring-rose-400 border-rose-200 bg-rose-50/5" : ""}`}>
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[9px] font-bold font-mono text-slate-400">{ncr.ncrNo}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[8px] border ${severityBadges[ncr.severity]}`}>{ncr.severity}</span>
                        </div>
                        <h4 className="font-bold text-slate-900 text-xs line-clamp-2 leading-snug">{ncr.title}</h4>
                        <div className="flex items-center gap-1 text-[10px] text-slate-500">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate">{ncr.source}</span>
                        </div>
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
                      </Link>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 신규 NCR 등록 모달 */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="font-extrabold text-slate-900 text-base">신규 부적합보고서(NCR) 등록</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1 text-sm">
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-xs text-indigo-700">
                <span className="font-bold">자동입력:</span> 보고일 <strong>{TODAY}</strong> · 등록자 <strong>{userName || "현재 사용자"}</strong> · 초기 상태 <strong>발행(Issued)</strong>
              </div>
              {formError && <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-700 font-medium">{formError}</div>}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">부적합 제목 <span className="text-rose-500">*</span></label>
                <input type="text" placeholder="예: 압출 3호기 피복 두께 편차 부적합" value={formData.title}
                  onChange={e => setFormData(p => ({...p, title: e.target.value}))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 text-xs" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">발생 공장/검사처 <span className="text-rose-500">*</span></label>
                <input type="text" placeholder="예: 구미 1공장, 수입검사 등" value={formData.source}
                  onChange={e => setFormData(p => ({...p, source: e.target.value}))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 text-xs" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">심각도</label>
                  <select value={formData.severity} onChange={e => setFormData(p => ({...p, severity: e.target.value as NCRSeverity}))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 text-xs bg-white">
                    <option value="Critical">Critical (위험)</option>
                    <option value="Major">Major (중요)</option>
                    <option value="Minor">Minor (경미)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">처리방안</label>
                  <select value={formData.disposition} onChange={e => setFormData(p => ({...p, disposition: e.target.value as NCRDispositionType}))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 text-xs bg-white">
                    <option value="TBD">방안 미정 (TBD)</option>
                    <option value="Rework">재작업 (Rework)</option>
                    <option value="Concession">특채 (Concession)</option>
                    <option value="Scrap">폐기 (Scrap)</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">완료 예정 기한</label>
                <input type="date" value={formData.targetDate} onChange={e => setFormData(p => ({...p, targetDate: e.target.value}))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 text-xs bg-white" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">부적합 현상 및 원인 기술 <span className="text-rose-500">*</span></label>
                <textarea rows={4} placeholder="부적합 발생 현상, 추정 원인, 발견 경위 등을 기술하세요." value={formData.description}
                  onChange={e => setFormData(p => ({...p, description: e.target.value}))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 text-xs resize-none" />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex gap-2 justify-end shrink-0">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl">취소</button>
              <button onClick={handleNewNCRSubmit} disabled={submitting}
                className="px-5 py-2 text-xs font-bold bg-slate-950 text-white hover:bg-slate-800 rounded-xl disabled:opacity-50">
                {submitting ? "등록 중..." : "등록하기"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

