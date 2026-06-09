"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { FacilitiesData } from "@/types/facility";
import { AttachmentUploader, type AttachmentItem } from "@/components/ui/attachment-uploader";

const CATEGORIES = ["시험설비", "계측설비", "보조설비"] as const;
const STATUSES   = ["normal", "new", "aging", "planned"] as const;
const STATUS_LABEL: Record<string, string> = {
  normal: "정상", new: "신규", aging: "노후", planned: "도입예정",
};

interface EquipmentFormData {
  hallId: string; yardId: string; siteId: string; category: string;
  name: string; type: string; specVoltage: string; specCurrent: string; specEnergy: string;
  maker: string; makerCountry: string; yearIntroduced: string; quantity: string;
  status: string; notes: string;
}

const EMPTY: EquipmentFormData = {
  hallId: "", yardId: "", siteId: "gumi", category: "시험설비",
  name: "", type: "AC", specVoltage: "", specCurrent: "", specEnergy: "",
  maker: "", makerCountry: "", yearIntroduced: String(new Date().getFullYear()),
  quantity: "1", status: "normal", notes: "",
};

export function EquipmentForm({
  facilitiesData,
  onSuccess,
  onCancel,
}: {
  facilitiesData: FacilitiesData;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<EquipmentFormData>(EMPTY);
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k: keyof EquipmentFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const siteSpaces = [
    ...facilitiesData.testHalls.filter((h) => h.siteId === form.siteId),
    ...facilitiesData.testYards.filter((y) => y.siteId === form.siteId),
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError("");

    const spec: Record<string, string> = {};
    if (form.specVoltage) spec.voltage = form.specVoltage;
    if (form.specCurrent) spec.current = form.specCurrent;
    if (form.specEnergy)  spec.energy  = form.specEnergy;

    const body = {
      siteId:         form.siteId,
      hallId:         form.hallId  || null,
      yardId:         form.yardId  || null,
      category:       form.category,
      name:           form.name,
      type:           form.type,
      spec,
      maker:          form.maker,
      makerCountry:   form.makerCountry || null,
      yearIntroduced: Number(form.yearIntroduced),
      quantity:       Number(form.quantity),
      status:         form.status,
      notes:          form.notes,
    };

    const res = await fetch("/api/assets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, attachments }) });
    if (res.ok) {
      onSuccess();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "저장 실패");
    }
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      {/* 사이트 + 시험장 */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">사이트 *</label>
          <select value={form.siteId} onChange={set("siteId")} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <option value="gumi">구미</option>
            <option value="indon">인동</option>
            <option value="donghae">동해</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">시험장 (선택)</label>
          <select
            value={form.hallId || form.yardId}
            onChange={(e) => {
              const val = e.target.value;
              const isYard = facilitiesData.testYards.some((y) => y.id === val);
              setForm((p) => ({ ...p, hallId: isYard ? "" : val, yardId: isYard ? val : "" }));
            }}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">미배정</option>
            {siteSpaces.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>

      {/* 분류 + 유형 */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">분류 *</label>
          <select value={form.category} onChange={set("category")} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">유형 *</label>
          <input value={form.type} onChange={set("type")} placeholder="AC / DC / Imp / 전류원" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        </div>
      </div>

      {/* 설비명 */}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">설비명 *</label>
        <input value={form.name} onChange={set("name")} placeholder="예: AC 내전압기" required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
      </div>

      {/* 규격 */}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">규격</label>
        <div className="grid grid-cols-3 gap-2">
          <input value={form.specVoltage} onChange={set("specVoltage")} placeholder="전압 (예: AC 500KV)" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <input value={form.specCurrent} onChange={set("specCurrent")} placeholder="전류 (예: 50A)" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <input value={form.specEnergy}  onChange={set("specEnergy")}  placeholder="에너지 (예: 540KJ)" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        </div>
      </div>

      {/* 제조사 + 도입연도 + 대수 */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">제조사</label>
          <input value={form.maker} onChange={set("maker")} placeholder="Highvolt" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">도입연도 *</label>
          <input type="number" value={form.yearIntroduced} onChange={set("yearIntroduced")} min="1970" max="2035" required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">대수</label>
          <input type="number" value={form.quantity} onChange={set("quantity")} min="1" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        </div>
      </div>

      {/* 상태 + 비고 */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">상태</label>
          <select value={form.status} onChange={set("status")} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
            {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">비고</label>
          <input value={form.notes} onChange={set("notes")} placeholder="메모" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        </div>
      </div>

      {/* 첨부파일 */}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">첨부파일 (선택)</label>
        <AttachmentUploader attachments={attachments} onChange={setAttachments} context="equipment" disabled={saving} />
      </div>

      {/* 버튼 */}
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">취소</button>
        <button
          type="submit"
          disabled={saving}
          className={cn("px-4 py-2 text-sm font-medium rounded-lg text-white transition-colors", saving ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700")}
        >
          {saving ? "저장 중..." : "설비 등록"}
        </button>
      </div>
    </form>
  );
}
