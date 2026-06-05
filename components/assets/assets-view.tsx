"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { AssetData, AssetCategory, Equipment } from "@/types/asset";
import type { SiteId, FacilitiesData } from "@/types/facility";
import type { TestsData } from "@/types/test";
import { EquipmentTable } from "@/components/facilities/equipment-table";
import { computeStatus } from "@/lib/facilities-utils";
import { EquipmentForm } from "./equipment-form";
import { OwnerModal } from "./owner-modal";
import { EquipmentDetailDrawer } from "./equipment-detail-drawer";
import { RepairForm } from "./repair-form";

const CATEGORIES: { key: AssetCategory | "전체"; label: string }[] = [
  { key: "전체",    label: "전체" },
  { key: "시험설비", label: "시험설비" },
  { key: "계측설비", label: "계측설비" },
  { key: "보조설비", label: "보조설비" },
];

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

function AgingCard({ equipment }: { equipment: Equipment[] }) {
  const aging = equipment.filter((e) => computeStatus(e) === "aging");
  if (aging.length === 0) return null;
  return (
    <div className="bg-rose-50 border border-rose-200 rounded-xl px-5 py-4">
      <p className="text-xs font-medium text-rose-500 uppercase tracking-wider">노후 설비 경보</p>
      <p className="text-3xl font-bold mt-1 mb-3 text-rose-600">{aging.length}건</p>
      <div className="space-y-1.5">
        {aging.slice(0, 4).map((eq) => (
          <div key={eq.id} className="flex items-center justify-between text-xs">
            <span className="text-rose-700 font-medium truncate max-w-[160px]">{eq.name}</span>
            <span className="text-rose-400 shrink-0 ml-2">
              {eq.replacedBy ? "교체 진행 중" : `${2026 - eq.yearIntroduced}년 경과`}
            </span>
          </div>
        ))}
        {aging.length > 4 && (
          <p className="text-xs text-rose-400">외 {aging.length - 4}건...</p>
        )}
      </div>
    </div>
  );
}

type ModalType = "equipment" | "repair" | null;
type OwnerTarget = { id: string; name: string; managingTeam: string | null; ownerId: string | null; ownerName: string | null } | null;

export function AssetsView({
  assetData, testsData, facilitiesData, userRole = "PRACTITIONER",
}: {
  assetData: AssetData; testsData: TestsData; facilitiesData: FacilitiesData; userRole?: string;
}) {
  const equipment = assetData.equipment;
  const tests = testsData.tests;

  const router = useRouter();
  const [activeSite, setActiveSite] = useState<SiteId | "전체">("전체");
  const [activeCategory, setActiveCategory] = useState<AssetCategory | "전체">("전체");
  const [modal, setModal] = useState<ModalType>(null);
  const [ownerTarget, setOwnerTarget] = useState<OwnerTarget>(null);
  const [detailTarget, setDetailTarget] = useState<Equipment | null>(null);
  const [repairTarget, setRepairTarget] = useState<Equipment | null>(null);

  const onFormSuccess  = () => { setModal(null); router.refresh(); };
  const onOwnerSaved   = () => { setOwnerTarget(null); router.refresh(); };

  const siteOptions: { key: SiteId | "전체"; label: string }[] = [
    { key: "전체",    label: "전체" },
    { key: "gumi",    label: "구미" },
    { key: "indon",   label: "인동" },
    { key: "donghae", label: "동해" },
  ];

  const filtered = equipment.filter((e) => {
    if (activeSite !== "전체" && e.siteId !== activeSite) return false;
    if (activeCategory !== "전체" && e.category !== activeCategory) return false;
    return true;
  });

  // KPI (전체 기준)
  const total     = equipment.length;
  const newCount  = equipment.filter((e) => computeStatus(e) === "new").length;
  const normal    = equipment.filter((e) => computeStatus(e) === "normal").length;
  const aging     = equipment.filter((e) => computeStatus(e) === "aging").length;
  const planned   = equipment.filter((e) => computeStatus(e) === "planned").length;
  const agingWithReplace = equipment.filter((e) => computeStatus(e) === "aging" && e.replacedBy).length;

  const avgAge = Math.round(
    equipment
      .filter((e) => computeStatus(e) !== "planned")
      .reduce((sum, e) => sum + (2026 - e.yearIntroduced), 0) /
    (equipment.filter((e) => computeStatus(e) !== "planned").length || 1)
  );

  const categoryCount = (cat: AssetCategory) => equipment.filter((e) => e.category === cat).length;

  return (
    <div className="space-y-5">
      {/* KPI 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="전체 설비"
          main={`${total}대`}
          items={[
            { label: "신규",      value: newCount, color: "text-blue-600" },
            { label: "정상",      value: normal,   color: "text-emerald-600" },
            { label: "노후",      value: aging,    color: "text-red-600" },
            { label: "도입예정",  value: planned,  color: "text-slate-500" },
          ]}
          bar={total > 0 ? [
            { color: "bg-blue-400",    pct: (newCount / total) * 100, label: "신규" },
            { color: "bg-emerald-400", pct: (normal   / total) * 100, label: "정상" },
            { color: "bg-red-400",     pct: (aging    / total) * 100, label: "노후" },
            { color: "bg-slate-200",   pct: (planned  / total) * 100, label: "도입예정" },
          ] : undefined}
        />
        <KpiCard
          title="평균 사용 연수"
          main={`${avgAge}년`}
          items={[
            { label: "시험설비", value: categoryCount("시험설비"), color: "text-blue-600" },
            { label: "계측설비", value: categoryCount("계측설비"), color: "text-violet-600" },
            { label: "보조설비", value: categoryCount("보조설비"), color: "text-slate-500" },
          ]}
        />
        <KpiCard
          title="노후 설비"
          main={`${aging}건`}
          mainColor="text-red-600"
          items={[
            { label: "교체 진행", value: agingWithReplace,          color: "text-amber-600" },
            { label: "미착수",    value: aging - agingWithReplace,   color: "text-red-500" },
          ]}
        />
        <KpiCard
          title="교체 예정"
          main={`${planned}대`}
          mainColor="text-slate-600"
          items={[
            { label: "구미",  value: equipment.filter((e) => computeStatus(e) === "planned" && e.siteId === "gumi").length,     color: "text-slate-600" },
            { label: "동해",  value: equipment.filter((e) => computeStatus(e) === "planned" && e.siteId === "donghae").length,  color: "text-slate-600" },
          ]}
        />
      </div>

      {/* 노후 설비 경보 (있을 때만) */}
      {aging > 0 && (
        <AgingCard equipment={equipment} />
      )}

      {/* 등록 버튼 */}
      <div className="flex gap-2 justify-end">
        <button
          onClick={() => setModal("equipment")}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          설비 등록
        </button>
        <button
          onClick={() => setModal("repair")}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          설비 수선
        </button>
      </div>

      {/* 등록 모달 */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-800">설비 등록</h2>
              <button onClick={() => setModal(null)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-6 py-4">
              <EquipmentForm
                facilitiesData={facilitiesData}
                onSuccess={onFormSuccess}
                onCancel={() => setModal(null)}
              />
            </div>
          </div>
        </div>
      )}

      {/* 필터 바 */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* 사이트 필터 */}
        <div className="flex rounded-lg border border-slate-200 overflow-hidden bg-white">
          {siteOptions.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveSite(key)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium transition-colors",
                activeSite === key
                  ? "bg-blue-600 text-white"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              )}
            >
              {label}
            </button>
          ))}
        </div>
        {/* 카테고리 필터 */}
        <div className="flex rounded-lg border border-slate-200 overflow-hidden bg-white">
          {CATEGORIES.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveCategory(key as AssetCategory | "전체")}
              className={cn(
                "px-3 py-1.5 text-xs font-medium transition-colors",
                activeCategory === key
                  ? "bg-slate-700 text-white"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="text-xs text-slate-400 ml-auto">
          {filtered.length}개 설비
        </span>
      </div>

      {/* 설비 수선 등록 모달 */}
      {modal === "repair" && (
        <RepairForm
          equipmentId={repairTarget?.id}
          equipmentName={repairTarget?.name}
          equipmentList={repairTarget ? undefined : equipment}
          onClose={() => { setModal(null); setRepairTarget(null); }}
          onSaved={() => { setModal(null); setRepairTarget(null); router.refresh(); }}
        />
      )}

      {/* 설비 테이블 */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <EquipmentTable
          equipment={filtered}
          tests={tests}
          onRowClick={(eq) => setDetailTarget(eq)}
          onOwnerClick={(eq) => setOwnerTarget({
            id:           eq.id,
            name:         eq.name,
            managingTeam: eq.managingTeam,
            ownerId:      eq.ownerId,
            ownerName:    eq.ownerName,
          })}
        />
      </div>

      {/* 설비 상세 드로어 */}
      {detailTarget && (
        <EquipmentDetailDrawer
          equipment={detailTarget}
          userRole={userRole}
          onClose={() => setDetailTarget(null)}
          onSaved={() => { setDetailTarget(null); router.refresh(); }}
        />
      )}

      {/* 담당자 관리 모달 (레거시 — 드로어 미사용 경로 fallback) */}
      {ownerTarget && !detailTarget && (
        <OwnerModal
          equipmentId={ownerTarget.id}
          equipmentName={ownerTarget.name}
          currentManagingTeam={ownerTarget.managingTeam}
          currentOwnerId={ownerTarget.ownerId}
          currentOwnerName={ownerTarget.ownerName}
          onClose={() => setOwnerTarget(null)}
          onSaved={onOwnerSaved}
        />
      )}
    </div>
  );
}
