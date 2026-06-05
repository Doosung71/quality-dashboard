"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { FacilitiesData, SiteId, TestHall, TestYard } from "@/types/facility";
import type { Equipment } from "@/types/asset";
import type { Test, TestsData, TestStatus, TestCategory } from "@/types/test";
import { computeStatus, getTodayLocalStr, OCCUPIED_TEST_STATUSES } from "@/lib/facilities-utils";
import { HallStatusBadge, TypeChip, TestStatusBadge, TestCategoryChip } from "./badges";
import { TestPlanForm } from "@/components/assets/test-plan-form";

type AnySpace = TestHall | TestYard;

function getSpaceEquipment(assets: Equipment[], spaceId: string): Equipment[] {
  return assets.filter((e) => e.hallId === spaceId || e.yardId === spaceId);
}

// 2026년 기준 날짜 → 가로 위치 % (간트 차트용)
const GANTT_START = new Date("2026-01-01").getTime();
const GANTT_END   = new Date("2026-12-31").getTime();
const GANTT_TOTAL = GANTT_END - GANTT_START;

function dateToPct(dateStr: string): number {
  const t = new Date(dateStr).getTime();
  return Math.max(0, Math.min(100, ((t - GANTT_START) / GANTT_TOTAL) * 100));
}

function getSpaceTests(tests: Test[], assets: Equipment[], spaceId: string): Test[] {
  const spaceEqIds = new Set(
    assets.filter((e) => e.hallId === spaceId || e.yardId === spaceId).map((e) => e.id)
  );
  return tests.filter((t) => spaceEqIds.has(t.equipmentId));
}

const CERT_DURATION: Partial<Record<TestCategory, string>> = {
  Type: "~3개월",
  EQ:   "~6개월",
  PQ:   "~14개월",
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiItem { label: string; value: number; color: string }
interface KpiBarSegment { color: string; pct: number; label: string }

function KpiCard({
  title, main, mainColor = "text-slate-800", items, bar,
}: {
  title: string; main: string; mainColor?: string;
  items: KpiItem[]; bar?: KpiBarSegment[];
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 px-5 py-4">
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{title}</p>
      <p className={cn("text-3xl font-bold mt-1 mb-3", mainColor)}>{main}</p>
      <div className="flex gap-4 flex-wrap">
        {items.map((it) => (
          <div key={it.label}>
            <p className="text-xs text-slate-400">{it.label}</p>
            <p className={cn("text-lg font-semibold", it.color)}>{it.value}</p>
          </div>
        ))}
      </div>
      {bar && bar.length > 0 && (
        <div className="flex h-1.5 w-full overflow-hidden rounded-full mt-3">
          {bar.map((s) => (
            <div key={s.label} className={s.color} style={{ width: `${s.pct}%` }} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Space row ────────────────────────────────────────────────────────────────

interface SpaceStatusCounts { new: number; normal: number; aging: number; planned: number }

function SpaceRow({
  space, equipCount, agingCount, statusCounts,
  activeTestCount, selected, checked, isOutdoor, onCheck, onClick,
}: {
  space: AnySpace; equipCount: number; agingCount: number;
  statusCounts: SpaceStatusCounts; activeTestCount: number;
  selected: boolean; checked: boolean; isOutdoor: boolean;
  onCheck: () => void; onClick: () => void;
}) {
  return (
    <div className={cn(
      "flex items-start border-b border-slate-100 last:border-0 transition-colors",
      selected ? "bg-blue-50" : "hover:bg-slate-50"
    )}>
      <button
        onClick={(e) => { e.stopPropagation(); onCheck(); }}
        className="pl-3 pr-1 py-3 shrink-0 flex items-start"
        aria-label="시험 현황 필터"
      >
        <span className={cn(
          "mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-colors",
          checked ? "bg-blue-600 border-blue-600" : "border-slate-300 bg-white"
        )}>
          {checked && (
            <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 12 12">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
            </svg>
          )}
        </span>
      </button>
      <button onClick={onClick} className="flex-1 text-left px-2 py-3 pr-4">
        <div className="flex items-start justify-between gap-2">
          <p className={cn("text-sm leading-snug", selected ? "font-medium text-blue-700" : "text-slate-700")}>
            {space.name}
          </p>
          <HallStatusBadge status={space.status} />
        </div>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <TypeChip type={space.type} />
          {isOutdoor && (
            <span className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium bg-amber-50 text-amber-700">옥외</span>
          )}
          {space.purpose === "인증시험/양산시험" && (
            <span className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium bg-violet-50 text-violet-700">복합</span>
          )}
          <span className="ml-auto text-xs text-slate-400">
            설비 {equipCount}개
            {agingCount > 0 && <span className="ml-1 text-red-500">· 노후 {agingCount}</span>}
          </span>
        </div>
        {activeTestCount > 0 && (
          <div className="mt-1.5 flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
            <span className="text-xs text-blue-600 font-medium">시험 진행 {activeTestCount}건</span>
          </div>
        )}
        {equipCount > 0 && (
          <div className="flex h-1 w-full overflow-hidden rounded-full mt-2">
            {statusCounts.new > 0     && <div className="bg-blue-400"    style={{ width: `${(statusCounts.new     / equipCount) * 100}%` }} />}
            {statusCounts.normal > 0  && <div className="bg-emerald-400" style={{ width: `${(statusCounts.normal  / equipCount) * 100}%` }} />}
            {statusCounts.aging > 0   && <div className="bg-red-400"     style={{ width: `${(statusCounts.aging   / equipCount) * 100}%` }} />}
            {statusCounts.planned > 0 && <div className="bg-slate-200"   style={{ width: `${(statusCounts.planned / equipCount) * 100}%` }} />}
          </div>
        )}
      </button>
    </div>
  );
}

// ─── Active Tests Panel ───────────────────────────────────────────────────────

const STATUS_BADGE_COLOR: Record<TestStatus, string> = {
  "준비중": "bg-slate-100 text-slate-600",
  "시험중": "bg-blue-50 text-blue-700 border border-blue-200",
  "완료":   "bg-emerald-50 text-emerald-700 border border-emerald-200",
  "지연":   "bg-red-50 text-red-700 border border-red-200",
};

function ActiveTestsPanel({
  space, tests, assets,
}: {
  space: AnySpace; tests: Test[]; assets: Equipment[];
}) {
  const spaceTests = getSpaceTests(tests, assets, space.id);
  const spaceEquipment = getSpaceEquipment(assets, space.id);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* 헤더 */}
      <div className="px-6 py-4 border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-base font-semibold text-slate-800">{space.name}</h2>
          <HallStatusBadge status={space.status} />
          <TypeChip type={space.type} />
          <span className="text-xs text-slate-400 ml-1">목적: {space.purpose}</span>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          설비 {spaceEquipment.length}개
          {spaceEquipment.filter((e) => computeStatus(e) === "aging").length > 0 && (
            <span className="text-red-500 ml-2">
              · 노후 {spaceEquipment.filter((e) => computeStatus(e) === "aging").length}건
            </span>
          )}
          {spaceTests.length > 0 && (
            <span className="text-blue-500 ml-2">· 시험 {spaceTests.length}건</span>
          )}
        </p>
        {space.purpose.includes("인증") && (
          <p className="text-xs text-purple-500 mt-1">
            인증시험 소요기간 (준비 포함): Type ~3개월 · EQ ~6개월 · PQ ~14개월
          </p>
        )}
      </div>

      {/* 시험 목록 */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {spaceTests.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-400">
            <svg className="w-10 h-10 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-sm">진행 중인 시험 없음</p>
            <p className="text-xs text-slate-300">설비 상세 내역은 자산관리에서 확인하세요</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              시험 현황 ({spaceTests.length}건)
            </p>
            {spaceTests.map((t) => {
              const eq = assets.find((e) => e.id === t.equipmentId);
              const plannedStartPct = dateToPct(t.plannedStart);
              const plannedEndPct   = dateToPct(t.plannedEnd);
              const plannedWidthPct = Math.max(2, plannedEndPct - plannedStartPct);
              const duration = CERT_DURATION[t.testCategory];

              return (
                <div key={t.id} className="bg-white rounded-xl border border-slate-100 p-4 space-y-3 hover:border-slate-200 transition-colors">
                  {/* 상단: 제품명 + 상태 */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-800">{t.projectName}</p>
                      <p className="text-xs text-slate-500">{t.sampleDescription}</p>
                    </div>
                    <span className={cn("shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold", STATUS_BADGE_COLOR[t.status])}>
                      {t.status}
                    </span>
                  </div>

                  {/* 중간: 메타 */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <TestCategoryChip category={t.testCategory} />
                    {duration && <span className="text-[10px] text-slate-400 font-medium">{duration}</span>}
                    {eq && <span className="text-[10px] text-slate-400">설비: {eq.name}</span>}
                  </div>

                  {/* 하단: 진행률 바 */}
                  {t.progress > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>{t.plannedStart.slice(0, 7)} ~ {t.plannedEnd.slice(0, 7)}</span>
                        <span className="font-semibold text-blue-600">{t.progress}%</span>
                      </div>
                      <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="absolute top-0 left-0 h-full bg-slate-100 rounded-full overflow-hidden"
                          style={{ left: `${plannedStartPct}%`, width: `${plannedWidthPct}%` }}
                        >
                          <div
                            className={cn("h-full rounded-full transition-all", {
                              "bg-blue-400":    t.status === "시험중",
                              "bg-emerald-400": t.status === "완료",
                              "bg-red-400":     t.status === "지연",
                              "bg-slate-300":   t.status === "준비중",
                            })}
                            style={{ width: `${t.progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Gantt Chart ─────────────────────────────────────────────────────────────

const MONTHS = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];

const MONTH_GRID_PCTS = [
  "2026-02-01","2026-03-01","2026-04-01","2026-05-01","2026-06-01",
  "2026-07-01","2026-08-01","2026-09-01","2026-10-01","2026-11-01","2026-12-01",
].map(dateToPct);

const STATUS_BAR_COLOR: Record<TestStatus, string> = {
  "준비중": "bg-slate-300",
  "시험중": "bg-blue-400",
  "완료":   "bg-emerald-400",
  "지연":   "bg-red-400",
};

function GanttChart({ tests, assets, filteredCount }: { tests: Test[]; assets: Equipment[]; filteredCount: number }) {
  const testsWithEq = tests.filter((t) => assets.some((e) => e.id === t.equipmentId));
  if (testsWithEq.length === 0) return null;

  const todayStr = getTodayLocalStr();
  const todayPct = dateToPct(todayStr);
  const todayLabel = todayStr.slice(5).replace("-", "/");

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-200">
        <h3 className="text-sm font-semibold text-slate-700">인증시험 일정 현황 (2026)</h3>
        <p className="text-xs text-slate-400 mt-0.5">
          계획 기간 대비 실제 진행률.{" "}
          {filteredCount > 0
            ? <span className="text-blue-500 font-medium">{filteredCount}개 시험장 필터 중</span>
            : "전체 시험장 기준."}
          <span className="ml-3 text-purple-500">Type ~3개월 · EQ ~6개월 · PQ ~14개월</span>
        </p>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          <div className="flex border-b border-slate-100">
            <div className="w-72 shrink-0 px-4 py-2 text-xs text-slate-400">시험 제품 / 종류</div>
            <div className="flex-1 flex relative">
              {MONTHS.map((m) => (
                <div key={m} className="flex-1 text-center text-xs text-slate-400 py-2 border-l border-slate-100 first:border-0">{m}</div>
              ))}
              <span
                className="absolute bottom-0.5 text-[9px] font-semibold text-red-500 leading-none pointer-events-none whitespace-nowrap -translate-x-1/2"
                style={{ left: `${todayPct}%` }}
              >{todayLabel}</span>
            </div>
          </div>

          {testsWithEq.map((t) => {
            const eq = assets.find((e) => e.id === t.equipmentId);
            const plannedStartPct = dateToPct(t.plannedStart);
            const plannedEndPct   = dateToPct(t.plannedEnd);
            const plannedWidthPct = Math.max(0.5, plannedEndPct - plannedStartPct);
            const duration = CERT_DURATION[t.testCategory];

            return (
              <div key={t.id} className="flex items-center border-b border-slate-50 last:border-0 hover:bg-slate-50">
                <div className="w-72 shrink-0 px-4 py-2.5">
                  <p className="text-xs font-medium text-slate-700 truncate">{t.projectName}</p>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <TestStatusBadge status={t.status} />
                    <TestCategoryChip category={t.testCategory} />
                    {duration && <span className="text-[10px] text-slate-400 font-medium">{duration}</span>}
                  </div>
                  {eq && <p className="text-[10px] text-slate-400 truncate mt-0.5">{eq.name}</p>}
                  <p className="text-xs text-slate-400 truncate">{t.sampleDescription}</p>
                </div>
                <div className="flex-1 relative h-14 py-4 px-1">
                  {MONTH_GRID_PCTS.map((pct, i) => (
                    <div key={i} className="absolute top-0 bottom-0 w-px bg-slate-100 pointer-events-none" style={{ left: `${pct}%` }} />
                  ))}
                  <div
                    className="absolute top-3.5 h-5 rounded bg-slate-100 border border-slate-200 overflow-hidden"
                    style={{ left: `${plannedStartPct}%`, width: `${plannedWidthPct}%` }}
                  >
                    <div
                      className={cn("h-full rounded", STATUS_BAR_COLOR[t.status])}
                      style={{ width: `${t.progress}%`, opacity: t.status === "준비중" ? 0 : 1 }}
                    />
                  </div>
                  {t.progress > 0 && (
                    <span
                      className="absolute top-4 text-[10px] font-medium text-white leading-none pointer-events-none"
                      style={{ left: `calc(${plannedStartPct}% + 4px)` }}
                    >{t.progress}%</span>
                  )}
                  <div className="absolute top-0 bottom-0 w-0.5 bg-red-400" style={{ left: `${todayPct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

export function FacilitiesView({
  data, assets, testsData,
}: {
  data: FacilitiesData; assets: Equipment[]; testsData: TestsData;
}) {
  const router = useRouter();
  const tests = testsData.tests;
  const [activeSite, setActiveSite] = useState<SiteId>("gumi");
  const [showTestPlanForm, setShowTestPlanForm] = useState(false);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(() => {
    const gumiSpaces = [...data.testHalls, ...data.testYards].filter((s) => s.siteId === "gumi");
    return gumiSpaces[0]?.id ?? null;
  });
  const [checkedSpaceIds, setCheckedSpaceIds] = useState<Set<string>>(new Set());

  const toggleChecked = (id: string) => {
    setCheckedSpaceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const allSpaces = [...data.testHalls, ...data.testYards];
  const totalSpaces       = allSpaces.length;
  const activeSpaces      = allSpaces.filter((s) => s.status === "가동중").length;
  const constructingSpaces = allSpaces.filter((s) => s.status === "건축중").length;
  const certSpacesAll     = allSpaces.filter((s) => s.purpose.includes("인증")).length;
  const prodSpacesAll     = allSpaces.filter((s) => s.purpose === "양산시험").length;

  // 점유 중인 시험 = 준비중+시험중+지연 (공통 상수)
  const activeTests = tests.filter((t) => (OCCUPIED_TEST_STATUSES as readonly string[]).includes(t.status)).length;
  const totalTests  = tests.length;

  const siteHalls = data.testHalls.filter((h) => h.siteId === activeSite);
  const siteYards = data.testYards.filter((y) => y.siteId === activeSite);
  const allSiteSpaces: AnySpace[] = [...siteHalls, ...siteYards];
  const yardIds = new Set(data.testYards.map((y) => y.id));

  const certSiteSpaces = allSiteSpaces.filter((s) => s.purpose.includes("인증"));
  const prodSiteSpaces = allSiteSpaces.filter((s) => s.purpose === "양산시험");

  const selectedSpace = selectedSpaceId ? allSpaces.find((s) => s.id === selectedSpaceId) ?? null : null;

  const handleSiteChange = (site: SiteId) => {
    setActiveSite(site);
    const siteSpaces = allSpaces.filter((s) => s.siteId === site);
    setSelectedSpaceId(siteSpaces[0]?.id ?? null);
  };

  const ganttAssets = checkedSpaceIds.size === 0
    ? assets
    : assets.filter((e) =>
        (e.hallId != null && checkedSpaceIds.has(e.hallId)) ||
        (e.yardId != null && checkedSpaceIds.has(e.yardId))
      );

  return (
    <div className="space-y-5">
      {/* 시험 계획 등록 버튼 */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowTestPlanForm(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          시험 계획 등록
        </button>
      </div>

      {/* 시험 계획 등록 모달 */}
      {showTestPlanForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h2 className="text-base font-semibold text-slate-800">시험 계획 등록</h2>
              <button onClick={() => setShowTestPlanForm(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-6 py-4">
              <TestPlanForm
                equipment={assets}
                tests={tests}
                facilitiesData={data}
                onSuccess={() => { setShowTestPlanForm(false); router.refresh(); }}
                onCancel={() => setShowTestPlanForm(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* KPI 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          title="시험장 현황"
          main={`${totalSpaces}개`}
          items={[
            { label: "인증",   value: certSpacesAll,     color: "text-purple-600" },
            { label: "양산",   value: prodSpacesAll,     color: "text-teal-600" },
            { label: "가동중", value: activeSpaces,       color: "text-emerald-600" },
            { label: "건축중", value: constructingSpaces, color: "text-amber-600" },
          ]}
        />
        <KpiCard
          title="진행 중인 시험"
          main={`${activeTests}건`}
          mainColor="text-blue-600"
          items={[
            { label: "전체",   value: totalTests,                                                   color: "text-slate-500" },
            { label: "시험중", value: activeTests,                                                  color: "text-blue-600" },
            { label: "지연",   value: tests.filter((t) => t.status === "지연").length,              color: "text-red-500" },
            { label: "완료",   value: tests.filter((t) => t.status === "완료").length,              color: "text-emerald-600" },
          ]}
          bar={totalTests > 0 ? [
            { color: "bg-blue-400",    pct: (activeTests / totalTests) * 100,                                          label: "시험중" },
            { color: "bg-slate-300",   pct: (tests.filter((t) => t.status === "준비중").length / totalTests) * 100,   label: "준비중" },
            { color: "bg-red-400",     pct: (tests.filter((t) => t.status === "지연").length / totalTests) * 100,     label: "지연" },
            { color: "bg-emerald-400", pct: (tests.filter((t) => t.status === "완료").length / totalTests) * 100,     label: "완료" },
          ] : undefined}
        />
        <KpiCard
          title="인증시험 진행"
          main={`${tests.filter((t) => ["Type","EQ","PQ"].includes(t.testCategory)).length}건`}
          mainColor="text-purple-600"
          items={[
            { label: "Type", value: tests.filter((t) => t.testCategory === "Type").length, color: "text-purple-600" },
            { label: "EQ",   value: tests.filter((t) => t.testCategory === "EQ").length,   color: "text-purple-600" },
            { label: "PQ",   value: tests.filter((t) => t.testCategory === "PQ").length,   color: "text-purple-600" },
          ]}
        />
      </div>

      {/* 메인 패널 */}
      <div className="flex flex-col lg:flex-row gap-4" style={{ minHeight: 520 }}>
        {/* 좌측: 시험장 리스트 */}
        <div className="w-full lg:w-80 lg:shrink-0 bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden">
          <div className="flex border-b border-slate-200 shrink-0">
            {data.sites.map((site) => (
              <button
                key={site.id}
                onClick={() => handleSiteChange(site.id as SiteId)}
                className={cn(
                  "flex-1 py-3 text-sm font-medium transition-colors",
                  activeSite === site.id
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-slate-500 hover:text-slate-700"
                )}
              >{site.name}</button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
            {certSiteSpaces.length > 0 && (
              <>
                <p className="px-4 pt-3 pb-1 text-xs font-semibold text-purple-500 tracking-wider">인증 시험장</p>
                {certSiteSpaces.map((space) => {
                  const eqs = getSpaceEquipment(assets, space.id);
                  const spaceTests = getSpaceTests(tests, assets, space.id);
                  return (
                    <SpaceRow
                      key={space.id} space={space}
                      equipCount={eqs.length}
                      agingCount={eqs.filter((e) => computeStatus(e) === "aging").length}
                      statusCounts={{
                        new:     eqs.filter((e) => computeStatus(e) === "new").length,
                        normal:  eqs.filter((e) => computeStatus(e) === "normal").length,
                        aging:   eqs.filter((e) => computeStatus(e) === "aging").length,
                        planned: eqs.filter((e) => computeStatus(e) === "planned").length,
                      }}
                      activeTestCount={spaceTests.filter((t) => (OCCUPIED_TEST_STATUSES as readonly string[]).includes(t.status)).length}
                      selected={selectedSpaceId === space.id}
                      checked={checkedSpaceIds.has(space.id)}
                      isOutdoor={yardIds.has(space.id)}
                      onCheck={() => toggleChecked(space.id)}
                      onClick={() => setSelectedSpaceId(space.id)}
                    />
                  );
                })}
              </>
            )}
            {prodSiteSpaces.length > 0 && (
              <>
                <p className="px-4 pt-3 pb-1 text-xs font-semibold text-teal-500 tracking-wider">양산 시험장</p>
                {prodSiteSpaces.map((space) => {
                  const eqs = getSpaceEquipment(assets, space.id);
                  const spaceTests = getSpaceTests(tests, assets, space.id);
                  return (
                    <SpaceRow
                      key={space.id} space={space}
                      equipCount={eqs.length}
                      agingCount={eqs.filter((e) => computeStatus(e) === "aging").length}
                      statusCounts={{
                        new:     eqs.filter((e) => computeStatus(e) === "new").length,
                        normal:  eqs.filter((e) => computeStatus(e) === "normal").length,
                        aging:   eqs.filter((e) => computeStatus(e) === "aging").length,
                        planned: eqs.filter((e) => computeStatus(e) === "planned").length,
                      }}
                      activeTestCount={spaceTests.filter((t) => (OCCUPIED_TEST_STATUSES as readonly string[]).includes(t.status)).length}
                      selected={selectedSpaceId === space.id}
                      checked={checkedSpaceIds.has(space.id)}
                      isOutdoor={yardIds.has(space.id)}
                      onCheck={() => toggleChecked(space.id)}
                      onClick={() => setSelectedSpaceId(space.id)}
                    />
                  );
                })}
              </>
            )}
          </div>
        </div>

        {/* 우측: 진행 중인 시험 패널 */}
        <div className="flex-1 bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden">
          {selectedSpace ? (
            <ActiveTestsPanel space={selectedSpace} tests={tests} assets={assets} />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 text-slate-400">
              <svg className="w-10 h-10 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-sm">좌측 시험장을 선택하면 시험 현황이 표시됩니다</p>
            </div>
          )}
        </div>
      </div>

      {/* 간트 차트 */}
      <GanttChart tests={tests} assets={ganttAssets} filteredCount={checkedSpaceIds.size} />
    </div>
  );
}
