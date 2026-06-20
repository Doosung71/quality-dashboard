"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { NCRsData, NCR, NCRStatus, NCRSeverity, NCRDispositionType } from "@/types/ncr";
import {
  ShieldAlert, CheckCircle2,
  MapPin, Search, SlidersHorizontal, X, Plus
} from "lucide-react";
import { AttachmentUploader, type AttachmentItem } from "@/components/ui/attachment-uploader";
import { ProjectKeyInput } from "@/components/ui/project-key-input";

interface NCRViewProps {
  data: NCRsData;
  canEdit?: boolean;
  userName?: string;
}

const STATUS_COLUMNS: { status: NCRStatus; label: string; color: string }[] = [
  { status: "Issued",          label: "발행",           color: "border-t-blue-500 bg-blue-50/10" },
  { status: "Disposition",     label: "처리방안 수립",   color: "border-t-purple-500 bg-purple-50/10" },
  { status: "CorrectiveAction",label: "시정조치 중",     color: "border-t-amber-500 bg-amber-50/10" },
  { status: "Verification",    label: "효과검증",        color: "border-t-indigo-500 bg-indigo-50/10" },
  { status: "Closed",          label: "종결 완료",       color: "border-t-emerald-500 bg-emerald-50/10" },
];

function getToday() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
}

function isOverdue(ncr: NCR): boolean {
  // getDDay()와 동일한 KST 재파싱 기준 — 문자열 직접 비교 시 오프셋 불일치 방지
  const target = new Date(ncr.targetDate).toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
  return ncr.status !== "Closed" && target < getToday();
}

function getDDay(ncr: NCR, today: string): { label: string; cls: string } | null {
  if (ncr.status === "Closed") return null;
  // KST 기준 날짜 문자열로 정규화 — ISO 타임스탬프의 UTC 오프셋 하루 오차 방지
  const target = new Date(ncr.targetDate).toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
  const days = Math.round(
    (new Date(target).getTime() - new Date(today).getTime()) / 86_400_000
  );
  if (days < 0)  return { label: `D+${-days}`, cls: "bg-rose-100 text-rose-700 animate-pulse" };
  if (days <= 3) return { label: days === 0 ? "D-Day" : `D-${days}`, cls: "bg-amber-100 text-amber-700" };
  return { label: `D-${days}`, cls: "bg-emerald-50 text-emerald-700" };
}

export function NCRView({ data, canEdit = true, userName }: NCRViewProps) {
  const router = useRouter();
  const [ncrs] = useState<NCR[]>(data.ncrs);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSeverities, setSelectedSeverities] = useState<NCRSeverity[]>([]);
  const [selectedDispositions, setSelectedDispositions] = useState<NCRDispositionType[]>([]);

  const getDefaultForm = () => {
    const d = new Date(); d.setDate(d.getDate() + 14);
    const targetDate = d.toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
    return { title: "", source: "", severity: "Major" as NCRSeverity, disposition: "TBD" as NCRDispositionType, targetDate, description: "", projectKey: "" };
  };
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(getDefaultForm);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);

  const TODAY = getToday();

  const handleResetFilters = () => { setSearchQuery(""); setSelectedSeverities([]); setSelectedDispositions([]); };
  const toggleSeverity = (s: NCRSeverity) => setSelectedSeverities(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);
  const toggleDisposition = (d: NCRDispositionType) => setSelectedDispositions(p => p.includes(d) ? p.filter(x => x !== d) : [...p, d]);

  const filteredNCRs = useMemo(() => {
    return ncrs.filter(n => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!n.title.toLowerCase().includes(q) && !n.source.toLowerCase().includes(q) &&
            !n.assignee.toLowerCase().includes(q) && !n.description.toLowerCase().includes(q)) return false;
      }
      if (selectedSeverities.length > 0 && !selectedSeverities.includes(n.severity)) return false;
      if (selectedDispositions.length > 0 && !selectedDispositions.includes(n.disposition)) return false;
      return true;
    });
  }, [ncrs, searchQuery, selectedSeverities, selectedDispositions]);

  const columnsData = useMemo(() => {
    const columns: Record<NCRStatus, NCR[]> = { Issued: [], Disposition: [], CorrectiveAction: [], Verification: [], Closed: [] };
    filteredNCRs.forEach(ncr => { columns[ncr.status].push(ncr); });
    return columns;
  }, [filteredNCRs]);

  async function handleNewNCRSubmit() {
    if (!formData.title.trim() || !formData.source.trim() || !formData.description.trim()) {
      setFormError("제목, 발생처, 상세 설명은 필수 입력항목입니다."); return;
    }
    setSubmitting(true); setFormError("");
    try {
      const res = await fetch("/api/ncr", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, assignee: userName || "등록자", attachments }),
      });
      if (!res.ok) throw new Error("등록 실패");
      setFormData(getDefaultForm()); setAttachments([]); setShowForm(false);
      router.refresh();
    } catch {
      setFormError("등록 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  const severityBadges: Record<NCRSeverity, string> = {
    Critical: "bg-rose-100 text-rose-800 border-rose-200 animate-pulse font-extrabold",
    Major:    "bg-amber-100 text-amber-800 border-amber-200 font-bold",
    Minor:    "bg-slate-100 text-slate-700 border-slate-200",
  };
  const dispositionBadges: Record<NCRDispositionType, { label: string; style: string }> = {
    Scrap:     { label: "폐기 (Scrap)",       style: "bg-red-50 text-red-700 border-red-200" },
    Rework:    { label: "재작업 (Rework)",     style: "bg-violet-50 text-violet-700 border-violet-200" },
    Concession:{ label: "특채 (Concession)",   style: "bg-blue-50 text-blue-700 border-blue-200" },
    TBD:       { label: "방안 미정",           style: "bg-zinc-50 text-zinc-600 border-zinc-200" },
  };

  return (
    <div className="space-y-8 relative">
      {/* 신규 NCR 등록 버튼 */}
      {canEdit && (
        <div className="flex justify-end">
          <button onClick={() => { setFormData(getDefaultForm()); setFormError(""); setShowForm(true); }}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-950 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-all shadow-sm">
            <Plus className="w-4 h-4" /> 신규 NCR 등록
          </button>
        </div>
      )}

      {/* 검색 및 필터 */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="부적합 제목, 공장 발생처, 담당자 이름 검색..."
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-950 text-sm transition-all" />
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-500 flex items-center gap-1"><SlidersHorizontal className="w-3.5 h-3.5" /> 위험도:</span>
              <div className="flex items-center gap-1">
                {(["Critical", "Major", "Minor"] as NCRSeverity[]).map(sev => (
                  <button key={sev} onClick={() => toggleSeverity(sev)}
                    className={`px-2.5 py-1 rounded-lg border font-bold transition-all ${selectedSeverities.includes(sev) ? "bg-slate-900 border-slate-900 text-white" : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"}`}>
                    {sev}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-500">방안:</span>
              <div className="flex items-center gap-1">
                {(["Scrap", "Rework", "Concession", "TBD"] as NCRDispositionType[]).map(disp => {
                  const label = disp === "Scrap" ? "폐기" : disp === "Rework" ? "재작업" : disp === "Concession" ? "특채" : "미정";
                  return (
                    <button key={disp} onClick={() => toggleDisposition(disp)}
                      className={`px-2.5 py-1 rounded-lg border font-medium transition-all ${selectedDispositions.includes(disp) ? "bg-slate-900 border-slate-900 text-white" : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"}`}>
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
            {(searchQuery !== "" || selectedSeverities.length > 0 || selectedDispositions.length > 0) && (
              <button onClick={handleResetFilters} className="text-slate-500 hover:text-slate-900 hover:underline flex items-center gap-0.5 ml-2">필터 초기화</button>
            )}
          </div>
        </div>
      </div>

      {/* 칸반 보드 */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start overflow-x-auto pb-4">
        {STATUS_COLUMNS.map((column) => {
          const ncrItems = columnsData[column.status] || [];
          return (
            <div key={column.status}
              className={`rounded-2xl border-t-4 ${column.color} border-x border-b border-slate-100 shadow-sm p-4 min-w-[220px] min-h-[500px] flex flex-col justify-start gap-4`}>
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="font-bold text-slate-800 text-xs">{column.label}</span>
                <span className="bg-slate-200/80 text-slate-600 rounded-full px-2 py-0.5 text-[10px] font-bold">{ncrItems.length}</span>
              </div>
              <div className="flex flex-col gap-3 flex-1 overflow-y-auto">
                {ncrItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center gap-1 border-2 border-dashed border-slate-100 rounded-xl flex-1">
                    <CheckCircle2 className="w-6 h-6 text-slate-200" />
                    <span className="text-[10px] font-medium text-slate-400">부적합 없음</span>
                  </div>
                ) : (
                  ncrItems.map((ncr) => {
                    const overdue  = isOverdue(ncr);
                    const dispInfo = dispositionBadges[ncr.disposition];
                    return (
                      <Link key={ncr.id} href={`/ncr/${ncr.id}`}
                        className={`block bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:-translate-y-1 hover:shadow-md hover:border-slate-300 transition-all relative space-y-3 ${overdue ? "ring-1 ring-rose-400 border-rose-200 bg-rose-50/5" : ""}`}>
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[9px] font-bold font-mono text-slate-400">{ncr.ncrNo}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[8px] border ${severityBadges[ncr.severity]}`}>{ncr.severity}</span>
                        </div>
                        <h4 className="font-bold text-slate-900 text-xs line-clamp-2 leading-snug">{ncr.title}</h4>
                        <div className="flex items-center gap-1 text-[10px] text-slate-500">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate">{ncr.source}</span>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-slate-50 text-[9px]">
                          <span className="text-slate-400">방안: <strong className="text-slate-600 font-semibold">{dispInfo.label}</strong></span>
                          {(() => {
                            const dd = getDDay(ncr, TODAY);
                            if (!dd) return null;
                            return (
                              <span className={`px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5 ${dd.cls}`}>
                                {overdue && <ShieldAlert className="w-2.5 h-2.5" />}
                                {dd.label}
                              </span>
                            );
                          })()}
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 신규 NCR 등록 모달 */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="font-extrabold text-slate-900 text-base">신규 부적합보고서(NCR) 등록</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1 text-sm">
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-xs text-indigo-700">
                <span className="font-bold">자동입력:</span> 보고일 <strong>{TODAY}</strong> · 등록자 <strong>{userName || "현재 사용자"}</strong> · 초기 상태 <strong>발행(Issued)</strong>
              </div>
              {formError && <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-700 font-medium">{formError}</div>}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">부적합 제목 <span className="text-rose-500">*</span></label>
                <input type="text" placeholder="예: 압출 3호기 피복 두께 편차 부적합" value={formData.title}
                  onChange={e => setFormData(p => ({...p, title: e.target.value}))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 text-xs" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">발생 공장/검사처 <span className="text-rose-500">*</span></label>
                <input type="text" placeholder="예: 구미 1공장, 수입검사 등" value={formData.source}
                  onChange={e => setFormData(p => ({...p, source: e.target.value}))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 text-xs" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">프로젝트 키 <span className="text-slate-400 font-normal">(Tender 연결용·선택)</span></label>
                <ProjectKeyInput id="ncr-project-key" value={formData.projectKey}
                  onChange={v => setFormData(p => ({...p, projectKey: v}))}
                  inputClassName="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 text-xs" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">심각도</label>
                  <select value={formData.severity} onChange={e => setFormData(p => ({...p, severity: e.target.value as NCRSeverity}))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 text-xs bg-white">
                    <option value="Critical">Critical (위험)</option>
                    <option value="Major">Major (중요)</option>
                    <option value="Minor">Minor (경미)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">처리방안</label>
                  <select value={formData.disposition} onChange={e => setFormData(p => ({...p, disposition: e.target.value as NCRDispositionType}))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 text-xs bg-white">
                    <option value="TBD">방안 미정 (TBD)</option>
                    <option value="Rework">재작업 (Rework)</option>
                    <option value="Concession">특채 (Concession)</option>
                    <option value="Scrap">폐기 (Scrap)</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">완료 예정 기한</label>
                <input type="date" value={formData.targetDate} onChange={e => setFormData(p => ({...p, targetDate: e.target.value}))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 text-xs bg-white" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">부적합 현상 및 원인 기술 <span className="text-rose-500">*</span></label>
                <textarea rows={4} placeholder="부적합 발생 현상, 추정 원인, 발견 경위 등을 기술하세요." value={formData.description}
                  onChange={e => setFormData(p => ({...p, description: e.target.value}))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 text-xs resize-none" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">첨부파일</label>
                <AttachmentUploader
                  attachments={attachments}
                  onChange={setAttachments}
                  context="ncr"
                  disabled={submitting}
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex gap-2 justify-end shrink-0">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl">취소</button>
              <button onClick={handleNewNCRSubmit} disabled={submitting}
                className="px-5 py-2 text-xs font-bold bg-slate-950 text-white hover:bg-slate-800 rounded-xl disabled:opacity-50">
                {submitting ? "등록 중..." : "등록하기"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

