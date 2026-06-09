"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { Equipment } from "@/types/asset";
import type { Test } from "@/types/test";
import type { FacilitiesData } from "@/types/facility";
import { EquipmentBrowserModal } from "@/components/facilities/equipment-browser-modal";

interface ConflictInfo {
  projectName: string; status: string;
  plannedStart: string; plannedEnd: string;
  ownerName: string | null; managingTeam: string | null;
}

const CATEGORIES = ["Type", "EQ", "PQ", "양산", "개발"] as const;
const SAMPLE_TYPES = ["cable", "accessory"] as const;
const SAMPLE_TYPE_LABEL: Record<string, string> = { cable: "케이블", accessory: "접속재" };

interface UserOption { id: string; name: string; department: string | null }

function formatSpec(spec: Record<string, string>): string {
  const parts: string[] = [];
  if (spec.voltage) parts.push(spec.voltage);
  if (spec.current) parts.push(spec.current);
  if (spec.energy)  parts.push(spec.energy);
  return parts.join(" / ") || "—";
}

function getSpaceName(eq: Equipment, data: FacilitiesData): string {
  const id = eq.hallId ?? eq.yardId;
  if (!id) return "미배정";
  return data.testHalls.find((h) => h.id === id)?.name
    ?? data.testYards.find((y) => y.id === id)?.name ?? id;
}

const SITE_LABEL: Record<string, string> = {
  gumi: "구미", indon: "인동", donghae: "동해", external: "기타(사외)",
};

const SITE_OPTIONS = [
  { id: "all",      label: "전체" },
  { id: "gumi",     label: "구미" },
  { id: "indon",    label: "인동" },
  { id: "donghae",  label: "동해" },
  { id: "external", label: "사외" },
] as const;

export function TestPlanForm({
  equipment,
  tests,
  facilitiesData,
  initialEquipmentId,
  onSuccess,
  onCancel,
}: {
  equipment: Equipment[];
  tests: Test[];
  facilitiesData: FacilitiesData;
  initialEquipmentId?: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [filterSiteId, setFilterSiteId]       = useState<string>("all");
  const [filterSpaceId, setFilterSpaceId]     = useState<string>("all");
  const [equipmentId, setEquipmentId]         = useState(initialEquipmentId ?? "");
  const [conflict, setConflict]               = useState<ConflictInfo | null>(null);
  const [showBrowser, setShowBrowser]         = useState(false);
  const [testCategory, setTestCategory]       = useState("Type");
  const [projectName, setProjectName]         = useState("");
  const [sampleType, setSampleType]           = useState("cable");
  const [sampleDescription, setSampleDescription] = useState("");
  const [plannedStart, setPlannedStart]       = useState("");
  const [plannedEnd, setPlannedEnd]           = useState("");
  const [managingTeam, setManagingTeam]       = useState("");
  const [ownerId, setOwnerId]                 = useState("");
  const [ownerName, setOwnerName]             = useState("");
  const [users, setUsers]                     = useState<UserOption[]>([]);
  const [saving, setSaving]                   = useState(false);
  const [error, setError]                     = useState("");

  // 사이트별 시험장 목록
  const spacesForSite = [
    ...facilitiesData.testHalls.filter((h) => filterSiteId === "all" || h.siteId === filterSiteId),
    ...facilitiesData.testYards.filter((y) => filterSiteId === "all" || y.siteId === filterSiteId),
  ];

  useEffect(() => {
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((d: UserOption[]) => setUsers(d.filter((u) => u.id)))
      .catch(() => {});
  }, []);

  const selectedEq = equipment.find((e) => e.id === equipmentId);

  const handleSelectEquipment = (eq: Equipment, conf: ConflictInfo | null) => {
    setEquipmentId(eq.id);
    setConflict(conf);
    setShowBrowser(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!equipmentId) { setError("설비를 선택하세요."); return; }
    setSaving(true); setError("");

    const res = await fetch("/api/test-plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        equipmentId, testCategory, projectName, sampleType,
        sampleDescription, plannedStart, plannedEnd,
        managingTeam: managingTeam.trim() || null,
        ownerId:      ownerId             || null,
        ownerName:    ownerName.trim()    || null,
        status: "준비중", progress: 0,
      }),
    });

    if (res.ok) { onSuccess(); }
    else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "저장 실패");
    }
    setSaving(false);
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

        {/* 사이트 + 시험장 필터 */}
        <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">위치 선택</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">사이트</label>
              <select
                value={filterSiteId}
                onChange={(e) => { setFilterSiteId(e.target.value); setFilterSpaceId("all"); setEquipmentId(""); setConflict(null); }}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                {SITE_OPTIONS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">시험장 (선택)</label>
              <select
                value={filterSpaceId}
                onChange={(e) => { setFilterSpaceId(e.target.value); setEquipmentId(""); setConflict(null); }}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <option value="all">전체</option>
                {spacesForSite.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* 설비 선택 */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">시험 설비 *</label>
          {selectedEq ? (
            <div className={cn(
              "rounded-lg border px-4 py-3 space-y-1",
              conflict ? "border-red-200 bg-red-50" : "border-emerald-200 bg-emerald-50"
            )}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{selectedEq.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    [{SITE_LABEL[selectedEq.siteId] ?? selectedEq.siteId}] {getSpaceName(selectedEq, facilitiesData)}
                  </p>
                  <p className="text-xs font-mono text-slate-500">{formatSpec(selectedEq.spec)}</p>
                </div>
                <button type="button" onClick={() => setShowBrowser(true)} className="shrink-0 text-xs text-blue-600 underline">변경</button>
              </div>
              {conflict && (
                <div className="text-xs text-red-600 pt-2 border-t border-red-100 space-y-0.5">
                  <p className="font-medium">⚠ 충돌: {conflict.projectName}</p>
                  <p>{conflict.plannedStart} ~ {conflict.plannedEnd} ({conflict.status})</p>
                  {(conflict.managingTeam || conflict.ownerName) && (
                    <p>담당: {conflict.managingTeam}{conflict.ownerName ? ` · ${conflict.ownerName}` : ""}</p>
                  )}
                  <p className="text-slate-500">담당자와 조율 후 진행하세요.</p>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowBrowser(true)}
              className="w-full rounded-lg border-2 border-dashed border-slate-200 px-4 py-4 text-sm text-slate-400 hover:border-blue-300 hover:text-blue-500 transition-colors"
            >
              + 설비를 선택하세요 (시험장·규격·가용여부 확인 가능)
            </button>
          )}
        </div>

        {/* 시험 종류 + 시료 유형 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">시험 종류 *</label>
            <select value={testCategory} onChange={(e) => setTestCategory(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">시료 유형</label>
            <select value={sampleType} onChange={(e) => setSampleType(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
              {SAMPLE_TYPES.map((s) => <option key={s} value={s}>{SAMPLE_TYPE_LABEL[s]}</option>)}
            </select>
          </div>
        </div>

        {/* 프로젝트명 */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">프로젝트명 *</label>
          <input value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="예: HVDC 525kV XLPE 인증" required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        </div>

        {/* 시료 설명 */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">시료 설명</label>
          <input value={sampleDescription} onChange={(e) => setSampleDescription(e.target.value)} placeholder="예: 525kV XLPE 1600mm² DC 케이블" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        </div>

        {/* 계획 기간 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">계획 시작일 *</label>
            <input type="date" value={plannedStart} onChange={(e) => setPlannedStart(e.target.value)} required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">계획 종료일 *</label>
            <input type="date" value={plannedEnd} onChange={(e) => setPlannedEnd(e.target.value)} required min={plannedStart} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </div>
        </div>

        {/* 관리팀 */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">관리팀</label>
          <input value={managingTeam} onChange={(e) => setManagingTeam(e.target.value)} placeholder="예: 구미 시험1팀" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        </div>

        {/* 담당자 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">담당자 (시스템 계정)</label>
            <select value={ownerId} onChange={(e) => { setOwnerId(e.target.value); if (e.target.value) setOwnerName(""); }} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <option value="">선택 안 함</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name}{u.department ? ` (${u.department})` : ""}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">담당자명 (직접 입력)</label>
            <input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="시스템 계정 없는 경우" disabled={!!ownerId} className={cn("w-full rounded-lg border border-slate-200 px-3 py-2 text-sm", ownerId ? "bg-slate-50 text-slate-400" : "")} />
          </div>
        </div>

        {/* 버튼 */}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">취소</button>
          <button
            type="submit"
            disabled={saving}
            className={cn("px-4 py-2 text-sm font-medium rounded-lg text-white transition-colors", saving ? "bg-violet-400" : "bg-violet-600 hover:bg-violet-700")}
          >
            {saving ? "저장 중..." : "시험 계획 등록"}
          </button>
        </div>
      </form>

      {showBrowser && (
        <EquipmentBrowserModal
          facilitiesData={facilitiesData}
          equipment={equipment}
          tests={tests}
          selectedId={equipmentId}
          plannedStart={plannedStart}
          plannedEnd={plannedEnd}
          defaultSiteId={filterSiteId !== "all" ? filterSiteId : undefined}
          onSelect={handleSelectEquipment}
          onClose={() => setShowBrowser(false)}
        />
      )}
    </>
  );
}
