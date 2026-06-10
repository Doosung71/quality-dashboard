"use client";

import { useMemo } from "react";
import { ShieldAlert, CheckCircle2, Clock, FileText } from "lucide-react";
import type { NCR } from "@/types/ncr";

function getToday() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
}

function isOverdue(ncr: NCR): boolean {
  const target = new Date(ncr.targetDate).toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
  return ncr.status !== "Closed" && target < getToday();
}

export function NcrKpi({ ncrs }: { ncrs: NCR[] }) {
  const today = getToday();

  const kpis = useMemo(() => {
    const total         = ncrs.length;
    const openNcrs      = ncrs.filter(n => n.status !== "Closed").length;
    const overdueNcrs   = ncrs.filter(isOverdue).length;
    const criticalCount = ncrs.filter(n => n.severity === "Critical").length;
    const majorCount    = ncrs.filter(n => n.severity === "Major").length;
    const minorCount    = ncrs.filter(n => n.severity === "Minor").length;
    return { total, openNcrs, overdueNcrs, criticalCount, majorCount, minorCount };
  }, [ncrs]);

  return (
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
          <Clock className="w-6 h-6" />
        </div>
      </div>
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-slate-500 tracking-wider">조치 기한 초과(Overdue)</p>
          <h3 className={`text-2xl font-bold ${kpis.overdueNcrs > 0 ? "text-rose-600 animate-pulse" : "text-emerald-600"}`}>{kpis.overdueNcrs}건</h3>
          <p className="text-[10px] text-slate-400">오늘({today}) 기준 조치 기한 초과</p>
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
  );
}
