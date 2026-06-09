"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import type { Equipment } from "@/types/asset";
import type { Test } from "@/types/test";
import type { FacilitiesData } from "@/types/facility";
import { computeStatus, OCCUPIED_TEST_STATUSES } from "@/lib/facilities-utils";

interface ConflictInfo {
  projectName: string;
  status: string;
  plannedStart: string;
  plannedEnd: string;
  ownerName: string | null;
  managingTeam: string | null;
}

function checkConflict(
  eq: Equipment,
  tests: Test[],
  plannedStart: string,
  plannedEnd: string
): ConflictInfo | null {
  // OCCUPIED_TEST_STATUSES 공통 상수 사용 — 서버와 동일한 정의
  const activeTests = tests.filter(
    (t) =>
      t.equipmentId === eq.id &&
      (OCCUPIED_TEST_STATUSES as readonly string[]).includes(t.status) &&
      t.plannedEnd >= plannedStart &&
      t.plannedStart <= plannedEnd
  );
  if (activeTests.length === 0) return null;
  const t = activeTests[0];
  return {
    projectName:  t.projectName,
    status:       t.status,
    plannedStart: t.plannedStart,
    plannedEnd:   t.plannedEnd,
    ownerName:    t.ownerName    ?? null,
    managingTeam: t.managingTeam ?? null,
  };
}

function getSpaceName(eq: Equipment, data: FacilitiesData): string {
  const spaceId = eq.hallId ?? eq.yardId;
  if (!spaceId) return "미배정";
  const hall = data.testHalls.find((h) => h.id === spaceId);
  if (hall) return hall.name;
  const yard = data.testYards.find((y) => y.id === spaceId);
  return yard?.name ?? spaceId;
}

function formatSpec(spec: Record<string, string>): string {
  const parts: string[] = [];
  if (spec.voltage) parts.push(spec.voltage);
  if (spec.current) parts.push(spec.current);
  if (spec.energy)  parts.push(spec.energy);
  return parts.join(" / ") || "—";
}

const SITE_LABEL: Record<string, string> = {
  gumi: "구미", indon: "인동", donghae: "동해", external: "기타(사외)",
};

interface Props {
  facilitiesData: FacilitiesData;
  equipment: Equipment[];
  tests: Test[];
  selectedId: string;
  plannedStart: string;
  plannedEnd: string;
  defaultSiteId?: string;  // 시험 계획 폼에서 선택한 사이트 전달
  onSelect: (eq: Equipment, conflict: ConflictInfo | null) => void;
  onClose: () => void;
}

export function EquipmentBrowserModal({
  facilitiesData, equipment, tests,
  selectedId, plannedStart, plannedEnd,
  defaultSiteId,
  onSelect, onClose,
}: Props) {
  const [filterSite, setFilterSite] = useState<string>(defaultSiteId ?? "all");
  const [filterType, setFilterType] = useState<string>("all");
  const [showUnavailable, setShowUnavailable] = useState(true);
  const [pending, setPending] = useState<{ eq: Equipment; conflict: ConflictInfo } | null>(null);

  const sites = facilitiesData.sites;
  const types = [...new Set(equipment.map((e) => e.type))].sort();

  const rows = useMemo(() => {
    return equipment
      .filter((e) => filterSite === "all" || e.siteId === filterSite)
      .filter((e) => filterType === "all" || e.type === filterType)
      .map((e) => {
        const conflict = (plannedStart && plannedEnd)
          ? checkConflict(e, tests, plannedStart, plannedEnd)
          : null;
        const eqStatus = computeStatus(e);
        const available = !conflict && eqStatus !== "planned";
        return { eq: e, conflict, available, eqStatus };
      })
      .filter((r) => showUnavailable || r.available)
      .sort((a, b) => {
        if (a.available && !b.available) return -1;
        if (!a.available && b.available) return 1;
        if (a.eq.siteId < b.eq.siteId) return -1;
        if (a.eq.siteId > b.eq.siteId) return 1;
        return a.eq.name.localeCompare(b.eq.name, "ko");
      });
  }, [equipment, tests, filterSite, filterType, showUnavailable, plannedStart, plannedEnd]);

  const handleRow = (eq: Equipment, conflict: ConflictInfo | null) => {
    if (conflict) {
      setPending({ eq, conflict });
    } else {
      onSelect(eq, null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* 헤더 */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-base font-semibold text-slate-800">시험 설비 선택</h2>
            {plannedStart && plannedEnd && (
              <p className="text-xs text-slate-400 mt-0.5">
                기간: {plannedStart} ~ {plannedEnd} 기준 가용 여부 표시
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* 필터 바 */}
        <div className="px-6 py-3 border-b border-slate-100 flex flex-wrap gap-3 items-center shrink-0 bg-slate-50">
          <div className="flex rounded-lg border border-slate-200 overflow-hidden bg-white text-xs">
            <button onClick={() => setFilterSite("all")} className={cn("px-3 py-1.5 font-medium", filterSite === "all" ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-50")}>전체</button>
            {sites.map((s) => (
              <button key={s.id} onClick={() => setFilterSite(s.id)} className={cn("px-3 py-1.5 font-medium border-l border-slate-200", filterSite === s.id ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-50")}>
                {s.name}
              </button>
            ))}
          </div>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs">
            <option value="all">유형 전체</option>
            {types.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer ml-auto">
            <input type="checkbox" checked={showUnavailable} onChange={(e) => setShowUnavailable(e.target.checked)} className="rounded" />
            사용불가 포함
          </label>
        </div>

        {/* 테이블 */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 w-8" />
                <th className="text-left px-3 py-2.5 text-xs font-medium text-slate-500">설비명</th>
                <th className="text-left px-3 py-2.5 text-xs font-medium text-slate-500 hidden sm:table-cell">시험장</th>
                <th className="text-left px-3 py-2.5 text-xs font-medium text-slate-500 hidden md:table-cell">규격</th>
                <th className="text-left px-3 py-2.5 text-xs font-medium text-slate-500">가용 여부</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={5} className="text-center py-12 text-sm text-slate-400">조건에 맞는 설비가 없습니다.</td></tr>
              )}
              {rows.map(({ eq, conflict, available, eqStatus }) => {
                const isSelected = eq.id === selectedId;
                return (
                  <tr
                    key={eq.id}
                    onClick={() => handleRow(eq, conflict)}
                    className={cn(
                      "border-b border-slate-100 last:border-0 cursor-pointer transition-colors",
                      isSelected ? "bg-blue-50" : available ? "hover:bg-slate-50" : "bg-slate-50/60 opacity-80 hover:opacity-100"
                    )}
                  >
                    {/* 라디오 */}
                    <td className="px-4 py-3">
                      <span className={cn(
                        "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                        isSelected ? "border-blue-600 bg-blue-600" : "border-slate-300"
                      )}>
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </span>
                    </td>
                    {/* 설비명 */}
                    <td className="px-3 py-3">
                      <p className="text-sm font-medium text-slate-800">{eq.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-slate-400">{SITE_LABEL[eq.siteId] ?? eq.siteId}</span>
                        <span className="text-slate-200">·</span>
                        <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-600">{eq.type}</span>
                        {eqStatus === "planned" && <span className="text-[10px] text-slate-400">도입예정</span>}
                      </div>
                    </td>
                    {/* 시험장 */}
                    <td className="px-3 py-3 hidden sm:table-cell">
                      <p className="text-xs text-slate-600 max-w-[160px] truncate">{getSpaceName(eq, facilitiesData)}</p>
                    </td>
                    {/* 규격 */}
                    <td className="px-3 py-3 hidden md:table-cell">
                      <p className="text-xs font-mono text-slate-500">{formatSpec(eq.spec)}</p>
                    </td>
                    {/* 가용 여부 */}
                    <td className="px-3 py-3">
                      {eqStatus === "planned" ? (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />도입예정
                        </span>
                      ) : conflict ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 text-xs text-red-600 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />{conflict.status}
                          </span>
                          <p className="text-[10px] text-slate-400 truncate max-w-[140px]" title={conflict.projectName}>{conflict.projectName}</p>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />가용
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 충돌 경고 다이얼로그 */}
        {pending && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-2xl">
            <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm mx-4 space-y-3">
              <div className="flex items-center gap-2 text-red-600">
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                <p className="font-semibold text-sm">설비 사용 충돌</p>
              </div>
              <div className="bg-red-50 rounded-lg px-4 py-3 text-xs space-y-1.5">
                <p className="font-medium text-red-700">{pending.eq.name}</p>
                <p className="text-slate-600">진행 중: <span className="font-medium">{pending.conflict.projectName}</span></p>
                <p className="text-slate-500">{pending.conflict.plannedStart} ~ {pending.conflict.plannedEnd}</p>
                <p className="text-slate-500">상태: <span className={cn("font-medium", pending.conflict.status === "시험중" ? "text-blue-600" : "text-slate-600")}>{pending.conflict.status}</span></p>
                {(pending.conflict.managingTeam || pending.conflict.ownerName) && (
                  <p className="text-slate-500 pt-1 border-t border-red-100">
                    담당: {pending.conflict.managingTeam && <span>{pending.conflict.managingTeam}</span>}
                    {pending.conflict.ownerName && <span className="font-medium"> · {pending.conflict.ownerName}</span>}
                  </p>
                )}
              </div>
              <p className="text-xs text-slate-500">담당자와 조율 후 진행하세요. 그래도 선택하시겠습니까?</p>
              <div className="flex gap-2 justify-end pt-1">
                <button onClick={() => setPending(null)} className="px-3 py-1.5 text-xs text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">취소</button>
                <button
                  onClick={() => { onSelect(pending.eq, pending.conflict); setPending(null); }}
                  className="px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700"
                >강제 선택</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
