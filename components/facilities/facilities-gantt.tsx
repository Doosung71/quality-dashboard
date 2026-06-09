"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, ChevronRight as ChevronRightIcon, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Equipment } from "@/types/asset";
import type { Test, TestLog } from "@/types/test";
import type { FacilitiesData } from "@/types/facility";

const LEFT_W   = 260;  // px — 좌측 레이블 패널 폭
const MONTH_W  = 195;  // px — 월당 너비
const MONTHS   = 4;    // 표시 월 수
const RIGHT_W  = MONTH_W * MONTHS;
const ROW_H    = 36;   // px — 시험 계획 행
const SITE_H   = 30;   // px — 사이트 헤더 행
const HALL_H   = 28;   // px — 시험장 헤더 행

const STATUS_BAR: Record<string, string> = {
  "시험중": "bg-blue-500",
  "완료":   "bg-emerald-500",
  "지연":   "bg-red-400",
  "준비중": "bg-slate-300",
};
const STATUS_TEXT: Record<string, string> = {
  "시험중": "text-white",
  "완료":   "text-white",
  "지연":   "text-white",
  "준비중": "text-slate-500",
};

const SITE_LABEL: Record<string, string> = {
  gumi: "구미", indon: "인동", donghae: "동해", external: "사외",
};
const MONTH_KO = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];
const SEVERITY_COLOR: Record<string, string> = {
  high: "text-red-500", medium: "text-amber-500", low: "text-slate-400",
};

// ── 날짜 유틸 ────────────────────────────────────────────────────────────────

function parseDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function monthStart(d: Date, offset = 0): Date {
  return new Date(d.getFullYear(), d.getMonth() + offset, 1);
}
function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

// ── 이슈 유틸 ─────────────────────────────────────────────────────────────────

function unresolvedIssueCount(logs: TestLog[]): number {
  const resolvedIds = new Set(
    logs.filter(l => l.logType === "action" && l.issueId).map(l => l.issueId!)
  );
  return logs.filter(l => l.logType === "issue" && l.issueId && !resolvedIds.has(l.issueId!)).length;
}

// ── 행 타입 ───────────────────────────────────────────────────────────────────

type Row =
  | { kind: "site";  siteId: string; label: string; count: number }
  | { kind: "hall";  hallKey: string; label: string; status: string; count: number }
  | { kind: "test";  test: Test; eq: Equipment | undefined };

// ── 간트 막대 계산 ────────────────────────────────────────────────────────────

function calcBar(
  test: Test,
  wStart: Date,
  totalDays: number,
): { left: number; width: number } | null {
  const s = parseDate(test.plannedStart);
  const e = parseDate(test.plannedEnd);
  const wEnd = new Date(wStart.getTime() + totalDays * 864e5);
  if (e < wStart || s > wEnd) return null;
  const cs = s < wStart ? wStart : s;
  const ce = e > wEnd ? wEnd : e;
  const left  = Math.round(daysBetween(wStart, cs) / totalDays * RIGHT_W);
  const width = Math.max(6, Math.round(daysBetween(cs, ce) / totalDays * RIGHT_W));
  return { left, width };
}

// ─────────────────────────────────────────────────────────────────────────────

export function FacilitiesGantt({
  data,
  assets,
  tests,
}: {
  data: FacilitiesData;
  assets: Equipment[];
  tests: Test[];
}) {
  const today = useMemo(() => new Date(), []);
  const [wStart, setWStart] = useState<Date>(() => monthStart(today, -1));
  const [collSites, setCollSites] = useState<Set<string>>(new Set());
  const [collHalls, setCollHalls] = useState<Set<string>>(new Set());
  const [hoverId,   setHoverId]   = useState<string | null>(null);

  const totalDays = useMemo(() => {
    const wEnd = monthStart(wStart, MONTHS);
    return daysBetween(wStart, wEnd);
  }, [wStart]);

  const months = useMemo(() =>
    Array.from({ length: MONTHS }, (_, i) => monthStart(wStart, i)),
    [wStart]
  );

  // 오늘 선 위치
  const todayPx = useMemo(() => {
    const d = daysBetween(wStart, today);
    if (d < 0 || d > totalDays) return null;
    return Math.round(d / totalDays * RIGHT_W);
  }, [wStart, totalDays, today]);

  // 주 격자선 (월요일마다)
  const weekLines = useMemo(() => {
    const lines: number[] = [];
    const wEnd = new Date(wStart.getTime() + totalDays * 864e5);
    const cur = new Date(wStart);
    while (cur.getDay() !== 1) cur.setDate(cur.getDate() + 1);
    while (cur < wEnd) {
      lines.push(Math.round(daysBetween(wStart, cur) / totalDays * RIGHT_W));
      cur.setDate(cur.getDate() + 7);
    }
    return lines;
  }, [wStart, totalDays]);

  // 행 구성 (site → hall → test)
  const rows = useMemo((): Row[] => {
    const siteMap = new Map<string, Map<string, Test[]>>();
    for (const test of tests) {
      const eq     = assets.find(a => a.id === test.equipmentId);
      const siteId = eq?.siteId ?? "unknown";
      const hallId = eq?.hallId ?? eq?.yardId ?? "__none__";
      if (!siteMap.has(siteId)) siteMap.set(siteId, new Map());
      const hm = siteMap.get(siteId)!;
      if (!hm.has(hallId)) hm.set(hallId, []);
      hm.get(hallId)!.push(test);
    }

    const siteOrder = ["gumi", "donghae", "indon", "external"];
    const sortedSites = [...siteMap.keys()].sort(
      (a, b) => (siteOrder.indexOf(a) < 0 ? 99 : siteOrder.indexOf(a))
               - (siteOrder.indexOf(b) < 0 ? 99 : siteOrder.indexOf(b))
    );

    const allSpaces = [
      ...data.testHalls.map(h => ({ id: h.id, name: h.name, status: h.status ?? "가동중" })),
      ...data.testYards.map(y => ({ id: y.id, name: y.name, status: y.status ?? "가동중" })),
    ];

    const result: Row[] = [];
    for (const siteId of sortedSites) {
      const hm = siteMap.get(siteId)!;
      const allTests = [...hm.values()].flat();
      result.push({ kind: "site", siteId, label: SITE_LABEL[siteId] ?? siteId, count: allTests.length });
      if (collSites.has(siteId)) continue;

      const hallIds = [...hm.keys()].sort((a, b) => {
        if (a === "__none__") return 1;
        if (b === "__none__") return -1;
        return (allSpaces.findIndex(s => s.id === a)) - (allSpaces.findIndex(s => s.id === b));
      });

      for (const hallId of hallIds) {
        const hallTests = hm.get(hallId)!;
        const space = allSpaces.find(s => s.id === hallId);
        const hallKey = `${siteId}::${hallId}`;
        result.push({
          kind:    "hall",
          hallKey,
          label:   space?.name ?? (hallId === "__none__" ? "미배정" : hallId),
          status:  space?.status ?? "가동중",
          count:   hallTests.length,
        });
        if (collHalls.has(hallKey)) continue;

        const sorted = [...hallTests].sort((a, b) => a.plannedStart.localeCompare(b.plannedStart));
        for (const test of sorted) {
          result.push({ kind: "test", test, eq: assets.find(a => a.id === test.equipmentId) });
        }
      }
    }
    return result;
  }, [tests, assets, data, collSites, collHalls]);

  function toggleSite(siteId: string) {
    setCollSites(prev => { const n = new Set(prev); n.has(siteId) ? n.delete(siteId) : n.add(siteId); return n; });
  }
  function toggleHall(hallKey: string) {
    setCollHalls(prev => { const n = new Set(prev); n.has(hallKey) ? n.delete(hallKey) : n.add(hallKey); return n; });
  }

  // 공통 — 격자 + 오늘선
  function GridOverlay() {
    return (
      <>
        {weekLines.map((x, i) => (
          <div key={i} className="absolute inset-y-0 w-px bg-slate-100" style={{ left: x }} />
        ))}
        {todayPx !== null && (
          <div className="absolute inset-y-0 w-0.5 bg-red-400/50 z-10" style={{ left: todayPx }} />
        )}
      </>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">

      {/* ── 네비게이션 바 ────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50 flex-wrap gap-2">
        <div className="flex items-center gap-1.5">
          <button onClick={() => setWStart(s => monthStart(s, -1))}
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold text-slate-700 min-w-[200px] text-center">
            {months[0].getFullYear()}년 {MONTH_KO[months[0].getMonth()]} – {MONTH_KO[months[MONTHS - 1].getMonth()]}
          </span>
          <button onClick={() => setWStart(s => monthStart(s, 1))}
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
          <button onClick={() => setWStart(monthStart(today, -1))}
            className="ml-1 px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600">
            오늘
          </button>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-slate-500">
          {(["시험중","준비중","지연","완료"] as const).map(s => (
            <span key={s} className="flex items-center gap-1">
              <span className={cn("w-3 h-2.5 rounded-sm inline-block", STATUS_BAR[s])} />
              {s}
            </span>
          ))}
          <span className="flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-amber-400" /> 미해결 이슈
          </span>
        </div>
      </div>

      {/* ── 간트 본문 ─────────────────────────────────── */}
      <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 280px)" }}>
        <div style={{ minWidth: LEFT_W + RIGHT_W }}>

          {/* 월 헤더 */}
          <div className="flex sticky top-0 z-20 bg-white border-b border-slate-200">
            <div style={{ width: LEFT_W, minWidth: LEFT_W }}
              className="shrink-0 sticky left-0 z-30 bg-slate-50 border-r border-slate-200 px-4 py-2 flex items-end">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">시험 계획</span>
            </div>
            <div className="flex" style={{ width: RIGHT_W }}>
              {months.map((m) => (
                <div key={m.toISOString()} style={{ width: MONTH_W }}
                  className="border-r border-slate-200 px-3 py-2 last:border-r-0">
                  <span className="text-xs font-semibold text-slate-500">
                    {m.getFullYear()}년 {MONTH_KO[m.getMonth()]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 행 목록 */}
          {rows.length === 0 && (
            <div className="flex items-center justify-center py-16 text-sm text-slate-400">
              등록된 시험 계획이 없습니다.
            </div>
          )}

          {rows.map((row, i) => {

            /* 사이트 헤더 */
            if (row.kind === "site") {
              const collapsed = collSites.has(row.siteId);
              return (
                <div key={`site-${row.siteId}`} style={{ height: SITE_H }}
                  className="flex items-center border-b border-slate-200 bg-slate-100">
                  <div style={{ width: LEFT_W, minWidth: LEFT_W }}
                    className="shrink-0 sticky left-0 z-10 h-full flex items-center bg-slate-100 border-r border-slate-200 px-3 cursor-pointer hover:bg-slate-200 transition-colors"
                    onClick={() => toggleSite(row.siteId)}>
                    <ChevronRightIcon className={cn("w-3.5 h-3.5 text-slate-500 mr-1.5 shrink-0 transition-transform", !collapsed && "rotate-90")} />
                    <span className="text-xs font-bold text-slate-600">{row.label}</span>
                    <span className="ml-auto text-[10px] text-slate-400 shrink-0">{row.count}건</span>
                  </div>
                  <div className="relative h-full" style={{ width: RIGHT_W }}>
                    <GridOverlay />
                  </div>
                </div>
              );
            }

            /* 시험장 헤더 */
            if (row.kind === "hall") {
              const collapsed = collHalls.has(row.hallKey);
              return (
                <div key={`hall-${row.hallKey}`} style={{ height: HALL_H }}
                  className="flex items-center border-b border-slate-100 bg-slate-50">
                  <div style={{ width: LEFT_W, minWidth: LEFT_W }}
                    className="shrink-0 sticky left-0 z-10 h-full flex items-center bg-slate-50 border-r border-slate-200 pl-7 pr-3 cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => toggleHall(row.hallKey)}>
                    <ChevronRightIcon className={cn("w-3 h-3 text-slate-400 mr-1.5 shrink-0 transition-transform", !collapsed && "rotate-90")} />
                    <span className="text-[11px] font-semibold text-slate-500 truncate min-w-0">{row.label}</span>
                    <span className={cn(
                      "ml-auto shrink-0 text-[9px] px-1.5 rounded font-semibold",
                      row.status === "가동중" ? "text-emerald-600 bg-emerald-50" : "text-amber-600 bg-amber-50"
                    )}>{row.status}</span>
                  </div>
                  <div className="relative h-full" style={{ width: RIGHT_W }}>
                    <GridOverlay />
                  </div>
                </div>
              );
            }

            /* 시험 계획 행 */
            if (row.kind === "test") {
              const bar = calcBar(row.test, wStart, totalDays);
              const issues = unresolvedIssueCount(row.test.logs);
              const isHovered = hoverId === row.test.id;

              return (
                <div key={`test-${row.test.id}`} style={{ height: ROW_H }}
                  className="flex items-center border-b border-slate-50 hover:bg-violet-50/40 transition-colors group">
                  {/* 레이블 */}
                  <div style={{ width: LEFT_W, minWidth: LEFT_W }}
                    className="shrink-0 sticky left-0 z-10 h-full flex items-center bg-white group-hover:bg-violet-50/40 border-r border-slate-100 pl-11 pr-2">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-slate-700 truncate leading-tight" title={row.test.projectName}>
                        {row.test.projectName}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate leading-tight">
                        {row.eq?.name ?? "설비 미지정"}
                      </p>
                    </div>
                  </div>

                  {/* 막대 영역 */}
                  <div style={{ width: RIGHT_W }} className="relative h-full flex items-center"
                    onMouseEnter={() => setHoverId(row.test.id)}
                    onMouseLeave={() => setHoverId(null)}>
                    <GridOverlay />

                    {bar && (
                      <div
                        className={cn(
                          "absolute h-5 rounded-md flex items-center overflow-hidden z-10 select-none",
                          STATUS_BAR[row.test.status] ?? "bg-slate-300"
                        )}
                        style={{ left: bar.left + 2, width: Math.max(6, bar.width - 4) }}
                      >
                        {/* 진행률 오버레이 */}
                        {row.test.progress > 0 && (
                          <div className="absolute inset-0 bg-white/20 origin-left"
                            style={{ width: `${row.test.progress}%` }} />
                        )}
                        {/* 카테고리 레이블 */}
                        {bar.width > 36 && (
                          <span className={cn(
                            "relative z-10 text-[10px] font-bold px-1.5 truncate",
                            STATUS_TEXT[row.test.status] ?? "text-slate-600"
                          )}>
                            {row.test.testCategory}
                          </span>
                        )}
                        {/* 이슈 경고 */}
                        {issues > 0 && (
                          <div className="absolute right-1 flex items-center">
                            <AlertTriangle className="w-3 h-3 text-yellow-300 drop-shadow" />
                          </div>
                        )}
                      </div>
                    )}

                    {/* 호버 툴팁 */}
                    {isHovered && (
                      <div
                        className="absolute bottom-full mb-2 z-50 bg-slate-800 text-white rounded-xl px-3 py-2.5 text-xs shadow-2xl pointer-events-none whitespace-nowrap"
                        style={{ left: bar ? Math.min(bar.left + bar.width / 2, RIGHT_W - 160) : 20, transform: "translateX(-40%)" }}
                      >
                        <p className="font-bold truncate max-w-[220px]">{row.test.projectName}</p>
                        <p className="text-slate-300 mt-0.5 text-[10px]">
                          {row.test.testCategory} · {row.test.status} · {row.test.progress}%
                        </p>
                        <p className="text-slate-400 text-[10px]">{row.test.plannedStart} ~ {row.test.plannedEnd}</p>
                        {row.eq && <p className="text-slate-400 text-[10px]">{row.eq.name}</p>}
                        {issues > 0 && (
                          <p className="text-yellow-300 text-[10px] mt-1">⚠ 미해결 이슈 {issues}건</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            return null;
          })}

        </div>
      </div>
    </div>
  );
}
