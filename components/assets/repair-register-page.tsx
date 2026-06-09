"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { RepairType, Equipment } from "@/types/asset";
import { AttachmentUploader, type AttachmentItem } from "@/components/ui/attachment-uploader";

const TYPES: RepairType[] = ["고장", "예방점검", "수선", "교정"];
const TYPE_COLOR: Record<RepairType, string> = {
  "고장":    "bg-red-100 text-red-700 border-red-200",
  "예방점검": "bg-blue-100 text-blue-700 border-blue-200",
  "수선":    "bg-amber-100 text-amber-700 border-amber-200",
  "교정":    "bg-violet-100 text-violet-700 border-violet-200",
};
const SITE_LABEL: Record<string, string> = {
  gumi: "구미", donghae: "동해", indon: "인동", external: "외부",
};
const STATUS_COLOR: Record<string, string> = {
  normal: "text-emerald-600", new: "text-blue-600", aging: "text-red-600", planned: "text-slate-400",
};

interface FormData {
  type: RepairType;
  title: string;
  description: string;
  vendor: string;
  cost: string;
  reportedAt: string;
}

const today = new Date().toISOString().slice(0, 10);
const EMPTY: FormData = {
  type: "고장", title: "", description: "", vendor: "", cost: "", reportedAt: today,
};

export function RepairRegisterPage({ equipment }: { equipment: Equipment[] }) {
  const router = useRouter();
  const [selectedId, setSelectedId]     = useState("");
  const [selectedName, setSelectedName] = useState("");
  const [siteFilter, setSiteFilter]     = useState("전체");
  const [search, setSearch]             = useState("");
  const [form, setForm]   = useState<FormData>(EMPTY);
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");
  const [done, setDone]     = useState(false);

  const set = (k: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((p) => ({ ...p, [k]: e.target.value }));

  const sites = ["전체", ...Array.from(new Set(equipment.map((e) => e.siteId)))];
  const filtered = equipment.filter((eq) => {
    if (siteFilter !== "전체" && eq.siteId !== siteFilter) return false;
    if (search && !eq.name.toLowerCase().includes(search.toLowerCase()) && !eq.type.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) { setError("설비를 선택하세요."); return; }
    if (!form.title.trim()) { setError("제목을 입력하세요."); return; }

    setSaving(true); setError("");
    const res = await fetch(`/api/assets/${selectedId}/repairs`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type:        form.type,
        title:       form.title.trim(),
        description: form.description.trim(),
        vendor:      form.vendor.trim() || null,
        cost:        form.cost ? Number(form.cost) : null,
        reportedAt:  form.reportedAt,
        status:      "접수",
        attachments,
      }),
    });

    if (res.ok) {
      setDone(true);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "저장 실패");
    }
    setSaving(false);
  };

  if (done) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 px-6 py-10 max-w-lg text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 flex items-center justify-center">
          <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-sm font-medium text-slate-800">수선 이력이 등록되었습니다.</p>
        <div className="flex gap-2 justify-center">
          <button onClick={() => { setDone(false); setSelectedId(""); setSelectedName(""); setForm(EMPTY); setAttachments([]); }}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
            추가 등록
          </button>
          <button onClick={() => router.push("/assets")}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors">
            설비 현황으로
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 max-w-lg">
      <form onSubmit={handleSubmit}>
        {/* 설비 선택 */}
        <div className="px-6 pt-5 pb-4 space-y-3 border-b border-slate-100">
          <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            수선 대상 설비 선택
            {selectedId && (
              <span className="ml-auto text-amber-600 font-bold truncate max-w-[180px]">{selectedName}</span>
            )}
          </p>
          <div className="flex gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="설비명 검색..."
              className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <div className="flex rounded-lg border border-slate-200 overflow-hidden bg-white shrink-0">
              {sites.map((s) => (
                <button key={s} type="button" onClick={() => setSiteFilter(s)}
                  className={cn(
                    "px-2.5 py-1.5 text-xs font-medium transition-colors",
                    siteFilter === s ? "bg-amber-600 text-white" : "text-slate-500 hover:bg-slate-50"
                  )}>
                  {s === "전체" ? "전체" : SITE_LABEL[s] ?? s}
                </button>
              ))}
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-50">
            {filtered.length === 0 ? (
              <p className="py-4 text-center text-xs text-slate-400">검색 결과 없음</p>
            ) : (
              filtered.map((eq) => {
                const isSelected = selectedId === eq.id;
                return (
                  <label key={eq.id}
                    className={cn("flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors",
                      isSelected ? "bg-amber-50" : "hover:bg-slate-50")}>
                    <div className={cn("w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                      isSelected ? "bg-amber-600 border-amber-600" : "border-slate-300")}>
                      {isSelected && (
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12">
                          <path d="M10 3L5 8.5 2 5.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <input type="radio" name="equipment" value={eq.id} checked={isSelected}
                      onChange={() => { setSelectedId(eq.id); setSelectedName(eq.name); }}
                      className="sr-only" />
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-xs font-medium truncate", isSelected ? "text-amber-800" : "text-slate-800")}>{eq.name}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {SITE_LABEL[eq.siteId] ?? eq.siteId} · {eq.type}
                      </p>
                    </div>
                    <span className={cn("text-[10px] font-medium shrink-0", STATUS_COLOR[eq.status] ?? "text-slate-400")}>
                      {eq.status === "normal" ? "정상" : eq.status === "new" ? "신규" : eq.status === "aging" ? "노후" : "도입예정"}
                    </span>
                  </label>
                );
              })
            )}
          </div>
        </div>

        {/* 폼 필드 */}
        <div className="px-6 py-5 space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-2">유형</label>
            <div className="grid grid-cols-4 gap-2">
              {TYPES.map((t) => (
                <button key={t} type="button"
                  onClick={() => setForm((p) => ({ ...p, type: t }))}
                  className={cn("py-1.5 text-xs font-medium rounded-lg border transition-all",
                    form.type === t ? TYPE_COLOR[t] : "bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300")}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">제목 <span className="text-red-500">*</span></label>
            <input value={form.title} onChange={set("title")}
              placeholder="예: DC 내전압기 고전압 누설 발생"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">상세 내용</label>
            <textarea value={form.description} onChange={set("description")} rows={3}
              placeholder="고장 증상, 발생 상황 등"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">발생일</label>
              <input type="date" value={form.reportedAt} onChange={set("reportedAt")}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">수선 업체</label>
              <input value={form.vendor} onChange={set("vendor")} placeholder="예: Hipotronics"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">예상 수선 비용 (원, 선택)</label>
            <input type="number" value={form.cost} onChange={set("cost")} placeholder="0" min="0"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">첨부파일 (선택)</label>
            <AttachmentUploader attachments={attachments} onChange={setAttachments} context="repair" disabled={saving} />
          </div>
        </div>

        {/* 푸터 */}
        <div className="px-6 py-4 border-t border-slate-100 flex gap-2">
          <button type="button" onClick={() => router.push("/assets")}
            className="flex-1 py-2.5 text-sm font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
            취소
          </button>
          <button type="submit" disabled={saving || !selectedId}
            className={cn("flex-1 py-2.5 text-sm font-medium rounded-lg text-white transition-colors",
              saving || !selectedId ? "bg-amber-300 cursor-not-allowed" : "bg-amber-600 hover:bg-amber-700")}>
            {saving ? "등록 중..." : "수선 등록"}
          </button>
        </div>
      </form>
    </div>
  );
}
