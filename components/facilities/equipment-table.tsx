"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Equipment } from "@/types/facility";
import type { Test } from "@/types/test";
import { computeStatus, CURRENT_YEAR } from "@/lib/facilities-utils";
import { TypeChip, EquipStatusBadge, TestStatusBadge, TestCategoryChip } from "./badges";

function formatSpec(spec: Record<string, string>): string {
  const parts: string[] = [];
  if (spec.voltage) parts.push(spec.voltage);
  if (spec.current) parts.push(spec.current);
  if (spec.energy) parts.push(spec.energy);
  return parts.join(" / ");
}

function getEquipmentTests(tests: Test[], equipmentId: string): Test[] {
  return tests.filter((t) => t.equipmentId === equipmentId);
}

type ColKey = "maker" | "quantity" | "notes";

const TOGGLEABLE_COLS: { key: ColKey; label: string }[] = [
  { key: "maker",    label: "제조사" },
  { key: "quantity", label: "대수" },
  { key: "notes",    label: "비고" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function EquipmentTable({ equipment, tests }: { equipment: Equipment[]; tests: Test[] }) {
  const [hiddenCols, setHiddenCols] = useState<Set<ColKey>>(
    new Set<ColKey>(["maker", "quantity", "notes"])
  );
  const [showColMenu, setShowColMenu] = useState(false);

  const toggleCol = (key: ColKey) => {
    setHiddenCols((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const shown = (key: ColKey) => !hiddenCols.has(key);

  return (
    <div>
      {/* 모바일 카드 뷰 (md 미만) */}
      <div className="block md:hidden space-y-2 p-3">
        {equipment.map((eq) => {
          const eqTests = getEquipmentTests(tests, eq.id);
          const status = computeStatus(eq);
          const isAging = status === "aging";
          return (
            <div
              key={eq.id}
              className={cn(
                "rounded-xl border p-4 space-y-3 transition-all",
                isAging
                  ? "border-l-2 bg-linear-to-r from-rose-500/5 via-rose-50/20 to-transparent animate-neon-alert"
                  : "border-slate-100 bg-white"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1.5">
                  <p className="text-sm font-semibold text-slate-800">{eq.name}</p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <TypeChip type={eq.type} />
                    <EquipStatusBadge status={status} />
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono">{formatSpec(eq.spec)}</p>
                </div>
                <div className="text-right shrink-0">
                  {status === "planned" ? (
                    <span className="text-slate-300 text-sm">—</span>
                  ) : (
                    <>
                      <p className={cn("text-sm font-bold", {
                        "text-blue-600":    status === "new",
                        "text-emerald-600": status === "normal",
                        "text-red-600":     status === "aging",
                      })}>
                        {CURRENT_YEAR - eq.yearIntroduced}년
                      </p>
                      <p className="text-[10px] text-slate-400">{eq.yearIntroduced}년 도입</p>
                    </>
                  )}
                </div>
              </div>
              {/* R-04: 보조 정보 (제조사·대수·비고) */}
              {(eq.maker || eq.quantity || eq.notes) && (
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-2 border-t border-slate-100 text-[10px]">
                  {eq.maker && (
                    <div>
                      <span className="text-slate-400">제조사 </span>
                      <span className="font-medium text-slate-600">
                        {eq.maker}{eq.makerCountry ? ` (${eq.makerCountry})` : ""}
                      </span>
                    </div>
                  )}
                  {eq.quantity != null && (
                    <div>
                      <span className="text-slate-400">대수 </span>
                      <span className="font-medium text-slate-600">{eq.quantity}대</span>
                    </div>
                  )}
                  {eq.notes && (
                    <div className="col-span-2">
                      <span className="text-slate-400">비고 </span>
                      <span className="font-medium text-slate-500">{eq.notes}</span>
                    </div>
                  )}
                </div>
              )}
              {eqTests.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  {eqTests.map((t) => (
                    <div key={t.id} className="flex items-center gap-1.5 flex-wrap">
                      <TestStatusBadge status={t.status} />
                      <TestCategoryChip category={t.testCategory} />
                      <div
                        className="w-10 h-1.5 rounded-full bg-slate-100 overflow-hidden shrink-0"
                        role="img"
                        aria-label={`진행률 ${t.progress}%`}
                      >
                        <div
                          className={cn("h-full rounded-full", {
                            "bg-blue-400":    t.status === "시험중",
                            "bg-emerald-400": t.status === "완료",
                            "bg-red-400":     t.status === "지연",
                            "bg-slate-300":   t.status === "준비중",
                          })}
                          style={{ width: `${t.progress}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 truncate max-w-[140px]" title={t.projectName}>
                        {t.projectName}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 데스크톱 테이블 뷰 (md 이상) */}
      {/* 컬럼 가시성 토글 */}
      <div className="hidden md:flex justify-end px-4 pt-3 pb-1 relative">
        <button
          onClick={() => setShowColMenu((v) => !v)}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 border border-slate-200 rounded-md px-2.5 py-1.5 bg-white hover:bg-slate-50 transition-colors"
          aria-label="표시할 컬럼 선택"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
          </svg>
          컬럼
        </button>
        {showColMenu && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowColMenu(false)} />
            <div className="absolute right-4 top-10 z-20 bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-[120px]">
              {TOGGLEABLE_COLS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => toggleCol(key)}
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                >
                  <span className={cn(
                    "w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0",
                    shown(key) ? "bg-blue-600 border-blue-600" : "border-slate-300"
                  )}>
                    {shown(key) && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 12 12" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                      </svg>
                    )}
                  </span>
                  {label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="sticky left-0 z-20 bg-slate-50 text-left px-4 py-2.5 text-xs font-medium text-slate-500 whitespace-nowrap">설비명</th>
              <th className="text-left px-3 py-2.5 text-xs font-medium text-slate-500 whitespace-nowrap">유형</th>
              <th className="text-left px-3 py-2.5 text-xs font-medium text-slate-500 whitespace-nowrap">규격</th>
              {shown("maker") && <th className="text-left px-3 py-2.5 text-xs font-medium text-slate-500 whitespace-nowrap">제조사</th>}
              <th className="text-right px-3 py-2.5 text-xs font-medium text-slate-500 whitespace-nowrap">도입</th>
              <th className="text-right px-3 py-2.5 text-xs font-medium text-slate-500 whitespace-nowrap">사용연수</th>
              {shown("quantity") && <th className="text-right px-3 py-2.5 text-xs font-medium text-slate-500 whitespace-nowrap">대수</th>}
              <th className="text-left px-3 py-2.5 text-xs font-medium text-slate-500 whitespace-nowrap">상태</th>
              <th className="text-left px-3 py-2.5 text-xs font-medium text-slate-500 whitespace-nowrap">시험 현황</th>
              {shown("notes") && <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500">비고</th>}
            </tr>
          </thead>
          <tbody>
            {equipment.map((eq) => {
              const eqTests = getEquipmentTests(tests, eq.id);
              const status = computeStatus(eq);
              const isAging = status === "aging";
              const rowBg = isAging
                ? "bg-linear-to-r from-rose-500/5 via-rose-50/20 to-transparent border-l-2 animate-neon-alert"
                : "hover:bg-slate-50/70";
              const stickyBg = isAging ? "bg-rose-50/60" : "bg-white";
              return (
                <tr key={eq.id} className={cn("border-b border-slate-100 last:border-0 transition-all", rowBg)}>
                  <td className={cn("sticky left-0 z-10 px-4 py-2.5 font-medium text-slate-700 whitespace-nowrap transition-colors", stickyBg)}>
                    {eq.name}
                  </td>
                  <td className="px-3 py-2.5">
                    <TypeChip type={eq.type} />
                  </td>
                  <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap font-mono text-xs">
                    {formatSpec(eq.spec)}
                  </td>
                  {shown("maker") && (
                    <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">
                      {eq.maker}
                      {eq.makerCountry && (
                        <span className="ml-1 text-slate-400 text-xs">({eq.makerCountry})</span>
                      )}
                    </td>
                  )}
                  <td className="px-3 py-2.5 text-slate-500 text-right whitespace-nowrap">{eq.yearIntroduced}</td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                    {(() => {
                      if (status === "planned") return <span className="text-slate-300">—</span>;
                      const colorMap: Record<string, string> = {
                        new:    "text-blue-600",
                        normal: "text-emerald-600",
                        aging:  "text-red-600",
                      };
                      return <span className={cn("font-medium", colorMap[status])}>{CURRENT_YEAR - eq.yearIntroduced}년</span>;
                    })()}
                  </td>
                  {shown("quantity") && (
                    <td className="px-3 py-2.5 text-slate-700 text-right font-medium">{eq.quantity}</td>
                  )}
                  <td className="px-3 py-2.5">
                    <EquipStatusBadge status={status} />
                  </td>
                  <td className="px-3 py-2.5">
                    {eqTests.length === 0 ? (
                      <span className="text-slate-300 text-xs">—</span>
                    ) : (
                      <div className="space-y-1.5">
                        {eqTests.map((t) => (
                          <div key={t.id} className="flex items-center gap-1.5 min-w-[240px]">
                            <TestStatusBadge status={t.status} />
                            <TestCategoryChip category={t.testCategory} />
                            <div
                              className="w-14 h-1.5 rounded-full bg-slate-100 overflow-hidden shrink-0"
                              role="img"
                              aria-label={`진행률 ${t.progress}%`}
                            >
                              <div
                                className={cn("h-full rounded-full", {
                                  "bg-blue-400":    t.status === "시험중",
                                  "bg-emerald-400": t.status === "완료",
                                  "bg-red-400":     t.status === "지연",
                                  "bg-slate-300":   t.status === "준비중",
                                })}
                                style={{ width: `${t.progress}%` }}
                              />
                            </div>
                            <span className="text-xs text-slate-500 truncate max-w-[110px]" title={t.projectName}>
                              {t.projectName}
                            </span>
                          </div>
                        ))}
                        {eqTests.length > 1 && (
                          <span className="text-xs text-slate-400">병렬 {eqTests.length}건</span>
                        )}
                      </div>
                    )}
                  </td>
                  {shown("notes") && (
                    <td className="px-4 py-2.5 text-slate-400 text-xs max-w-[200px] truncate" title={eq.notes}>
                      {eq.notes || "—"}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
