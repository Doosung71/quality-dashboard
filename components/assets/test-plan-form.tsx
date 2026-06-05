"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Equipment } from "@/types/asset";

const CATEGORIES = ["Type", "EQ", "PQ", "양산", "개발"] as const;
const SAMPLE_TYPES = ["cable", "accessory"] as const;
const SAMPLE_TYPE_LABEL: Record<string, string> = { cable: "케이블", accessory: "접속재" };

interface TestPlanFormData {
  equipmentId: string;
  testCategory: string;
  projectName: string;
  sampleType: string;
  sampleDescription: string;
  plannedStart: string;
  plannedEnd: string;
}

export function TestPlanForm({
  equipment,
  initialEquipmentId,
  onSuccess,
  onCancel,
}: {
  equipment: Equipment[];
  initialEquipmentId?: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<TestPlanFormData>({
    equipmentId:       initialEquipmentId ?? (equipment[0]?.id ?? ""),
    testCategory:      "Type",
    projectName:       "",
    sampleType:        "cable",
    sampleDescription: "",
    plannedStart:      "",
    plannedEnd:        "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  const set = (k: keyof TestPlanFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.equipmentId) { setError("설비를 선택하세요."); return; }
    setSaving(true); setError("");

    const res = await fetch("/api/test-plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, status: "준비중", progress: 0 }),
    });

    if (res.ok) {
      onSuccess();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "저장 실패");
    }
    setSaving(false);
  };

  const selectedEq = equipment.find((e) => e.id === form.equipmentId);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      {/* 설비 선택 */}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">시험 설비 *</label>
        <select
          value={form.equipmentId}
          onChange={set("equipmentId")}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          required
        >
          <option value="">설비 선택...</option>
          {equipment.map((eq) => (
            <option key={eq.id} value={eq.id}>
              [{eq.siteId === "gumi" ? "구미" : "동해"}] {eq.name} ({eq.type})
            </option>
          ))}
        </select>
        {selectedEq && (
          <p className="text-xs text-slate-400 mt-1">
            {selectedEq.spec.voltage ?? ""}{selectedEq.spec.current ? ` / ${selectedEq.spec.current}` : ""}
          </p>
        )}
      </div>

      {/* 시험 종류 + 시료 유형 */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">시험 종류 *</label>
          <select value={form.testCategory} onChange={set("testCategory")} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">시료 유형</label>
          <select value={form.sampleType} onChange={set("sampleType")} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
            {SAMPLE_TYPES.map((s) => <option key={s} value={s}>{SAMPLE_TYPE_LABEL[s]}</option>)}
          </select>
        </div>
      </div>

      {/* 프로젝트명 */}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">프로젝트명 *</label>
        <input
          value={form.projectName}
          onChange={set("projectName")}
          placeholder="예: HVDC 525kV XLPE 인증"
          required
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
      </div>

      {/* 시료 설명 */}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">시료 설명</label>
        <input
          value={form.sampleDescription}
          onChange={set("sampleDescription")}
          placeholder="예: 525kV XLPE 1600mm² DC 케이블"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
      </div>

      {/* 계획 기간 */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">계획 시작일 *</label>
          <input
            type="date"
            value={form.plannedStart}
            onChange={set("plannedStart")}
            required
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">계획 종료일 *</label>
          <input
            type="date"
            value={form.plannedEnd}
            onChange={set("plannedEnd")}
            required
            min={form.plannedStart}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
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
  );
}
