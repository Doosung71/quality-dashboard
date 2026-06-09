"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Equipment } from "@/types/asset";
import type { Test } from "@/types/test";
import type { FacilitiesData } from "@/types/facility";
import { TestCategoryChip, TestStatusBadge } from "./badges";
import { ChevronDown } from "lucide-react";
import { OCCUPIED_TEST_STATUSES } from "@/lib/facilities-utils";

const SITE_LABEL: Record<string, string> = {
  gumi: "구미", indon: "인동", donghae: "동해", external: "사외",
};

const PROGRESS_COLOR: Record<string, string> = {
  "시험중": "bg-blue-400",
  "완료":   "bg-emerald-400",
  "지연":   "bg-red-400",
  "준비중": "bg-slate-300",
};

// ─── 시험장 카드 ───────────────────────────────────────────────────────────────

function HallGrid({
  data, assets, tests,
}: {
  data: FacilitiesData;
  assets: Equipment[];
  tests: Test[];
}) {
  const allSpaces = [
    ...data.testHalls.map((h) => ({ ...h, spaceType: "홀" as const })),
    ...data.testYards.map((y) => ({ ...y, spaceType: "야드" as const })),
  ];
  const unassigned = assets.filter((e) => !e.hallId && !e.yardId);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
      {allSpaces.map((space) => {
        const hallEquip = assets.filter(
          (e) => e.hallId === space.id || e.yardId === space.id
        );
        const equipIds = new Set(hallEquip.map((e) => e.id));
        const activeTests = tests.filter(
          (t) =>
            equipIds.has(t.equipmentId) &&
            (OCCUPIED_TEST_STATUSES as readonly string[]).includes(t.status)
        );
        const delayedTests = tests.filter(
          (t) => equipIds.has(t.equipmentId) && t.status === "지연"
        );
        return (
          <div key={space.id} className="rounded-xl border border-slate-100 p-3.5 space-y-2.5 bg-white">
            <div className="flex items-start justify-between gap-1">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 leading-snug truncate" title={space.name}>
                  {space.name}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {SITE_LABEL[space.siteId] ?? space.siteId} · {space.type}
                </p>
              </div>
              <span className={cn(
                "shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-medium",
                space.status === "가동중"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-700"
              )}>
                {space.status}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs flex-wrap">
              <span className="text-slate-500">
                설비 <span className="font-semibold text-slate-700">{hallEquip.length}</span>대
              </span>
              {activeTests.length > 0 && (
                <span className="text-blue-600 font-medium">
                  시험중 {activeTests.length}
                </span>
              )}
              {delayedTests.length > 0 && (
                <span className="text-red-500 font-medium">
                  지연 {delayedTests.length}
                </span>
              )}
              {hallEquip.length === 0 && (
                <span className="text-slate-300">설비 없음</span>
              )}
            </div>
          </div>
        );
      })}
      {unassigned.length > 0 && (
        <div className="rounded-xl border border-dashed border-slate-200 p-3.5 space-y-2.5 bg-white">
          <div>
            <p className="text-sm font-semibold text-slate-400">미배정</p>
            <p className="text-[10px] text-slate-400 mt-0.5">시험장 미지정 설비</p>
          </div>
          <p className="text-xs text-slate-500">
            설비 <span className="font-semibold">{unassigned.length}</span>대
          </p>
        </div>
      )}
    </div>
  );
}

// ─── 시험 현황 (read-only 목록) ───────────────────────────────────────────────

type StatusFilter = "전체" | "시험중" | "준비중" | "지연" | "완료";

const FILTERS: { label: string; value: StatusFilter }[] = [
  { label: "전체",   value: "전체" },
  { label: "시험중", value: "시험중" },
  { label: "지연",   value: "지연" },
  { label: "준비중", value: "준비중" },
  { label: "완료",   value: "완료" },
];

function TestStatusList({ assets, tests }: { assets: Equipment[]; tests: Test[] }) {
  const [filter, setFilter] = useState<StatusFilter>("전체");

  const counts = {
    전체:   tests.length,
    시험중: tests.filter((t) => t.status === "시험중").length,
    준비중: tests.filter((t) => t.status === "준비중").length,
    지연:   tests.filter((t) => t.status === "지연").length,
    완료:   tests.filter((t) => t.status === "완료").length,
  } as Record<StatusFilter, number>;

  const filtered = filter === "전체" ? tests : tests.filter((t) => t.status === filter);

  return (
    <div className="space-y-3">
      {/* 필터 */}
      <div className="flex items-center gap-2 flex-wrap">
        {FILTERS.map(({ label, value }) => (
          <button key={value} onClick={() => setFilter(value)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors",
              filter === value
                ? "bg-violet-600 text-white border-violet-600"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
            )}>
            {label}
            <span className={cn(
              "px-1.5 py-0.5 rounded-full text-[10px] font-bold",
              filter === value ? "bg-violet-500 text-white" : "bg-slate-100 text-slate-500"
            )}>
              {counts[value]}
            </span>
          </button>
        ))}
      </div>

      {/* 목록 */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center">
          <p className="text-sm text-slate-400">해당 상태의 시험 계획이 없습니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((test) => {
            const eq = assets.find((e) => e.id === test.equipmentId);
            return (
              <div key={test.id}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-2.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <TestCategoryChip category={test.testCategory} />
                  <TestStatusBadge status={test.status} />
                </div>
                <p className="text-sm font-semibold text-slate-800 leading-snug line-clamp-2">
                  {test.projectName}
                </p>
                {eq && (
                  <p className="text-xs text-slate-500">
                    <span className="text-slate-300 mr-1">[{SITE_LABEL[eq.siteId] ?? eq.siteId}]</span>
                    <span className="font-medium text-slate-600">{eq.name}</span>
                  </p>
                )}
                <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                  <span>{test.plannedStart} ~ {test.plannedEnd}</span>
                  {test.ownerName && (
                    <span className="font-medium text-slate-600">{test.ownerName}</span>
                  )}
                </div>
                {test.progress > 0 && (
                  <div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                      <span>진행률</span>
                      <span className="font-semibold text-violet-600">{test.progress}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full", PROGRESS_COLOR[test.status] ?? "bg-slate-300")}
                        style={{ width: `${test.progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

export function FacilitiesOverview({
  data,
  assets,
  tests,
}: {
  data: FacilitiesData;
  assets: Equipment[];
  tests: Test[];
}) {
  const [hallOpen, setHallOpen] = useState(true);
  const allSpaces = data.testHalls.length + data.testYards.length;

  return (
    <div className="space-y-6">

      {/* ── 시험장 현황 ──────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <button
          onClick={() => setHallOpen((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-700">시험장 현황</span>
            <span className="text-xs text-slate-400">
              ({allSpaces}개 · 설비 {assets.length}대)
            </span>
          </div>
          <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", hallOpen ? "rotate-180" : "")} />
        </button>
        {hallOpen && (
          <div className="px-5 pb-5 border-t border-slate-100">
            <div className="pt-4">
              <HallGrid data={data} assets={assets} tests={tests} />
            </div>
          </div>
        )}
      </div>

      {/* ── 시험 현황 ────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm font-semibold text-slate-700">시험 현황</span>
          <span className="text-xs text-slate-400">({tests.length}건)</span>
        </div>
        <TestStatusList assets={assets} tests={tests} />
      </div>

    </div>
  );
}
