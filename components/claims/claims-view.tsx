"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { ClaimsData, Claim, ClaimPriority } from "@/types/claim";
import { RESPONSIBLE_PARTY_OPTIONS } from "@/types/claim";
import { ClaimsKanban } from "./claims-kanban";
import { X, Plus } from "lucide-react";
import { AttachmentUploader, type AttachmentItem } from "@/components/ui/attachment-uploader";
import { ProjectKeyInput } from "@/components/ui/project-key-input";

const VALID_PRIORITIES: (ClaimPriority | "All")[] = ["All", "High", "Mid", "Low"];

interface ClaimsViewProps {
  data: ClaimsData;
  canEdit?: boolean;
  userName?: string;
}

export function ClaimsView({ data, canEdit = true, userName }: ClaimsViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // 검색어는 로컬 state로 즉시 입력 반영 + URL은 디바운스 동기화.
  // 키 입력마다 router.replace()를 호출하면 한글 조합(IME) 중 리렌더링이 끼어들어 글자가 씹히는 문제가 있었음.
  const [searchTerm, setSearchTermLocal] = useState(searchParams.get("q") ?? "");
  useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (searchTerm) params.set("q", searchTerm); else params.delete("q");
      router.replace(`${pathname}?${params.toString()}`);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const rawPriority = searchParams.get("priority");
  const priorityFilter: ClaimPriority | "All" = VALID_PRIORITIES.includes(rawPriority as ClaimPriority | "All")
    ? (rawPriority as ClaimPriority | "All")
    : "All";
  const spgFilter = searchParams.get("spg") ?? "All";

  const claims = data.claims;
  // SPG 필터 옵션 — 실제 등록된 값에서만 자동 구성(고정 목록 없음, 자유입력 필드)
  const spgOptions = [...new Set(claims.map(c => c.spg).filter((v): v is string => !!v))].sort();

  // 신규 클레임 등록 폼
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    title: "", customer: "", priority: "Mid", assignee: userName ?? "", description: "", receivedAt: today,
    responsibleParty: "", spg: "", projectKey: "",
  });
  const [customParty, setCustomParty] = useState("");

  const setPriorityFilter = (value: ClaimPriority | "All") => {
    const params = new URLSearchParams(searchParams.toString());
    if (value !== "All") params.set("priority", value); else params.delete("priority");
    router.replace(`${pathname}?${params.toString()}`);
  };

  const setSpgFilter = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value !== "All") params.set("spg", value); else params.delete("spg");
    router.replace(`${pathname}?${params.toString()}`);
  };

  const filteredClaims = claims.filter(c => {
    // 검색어를 단어 단위로 쪼개 AND 조건으로 매칭 — 각 단어가 title·customer·spg
    // 중 어느 필드에 있어도(필드가 달라도) 찾아지도록 함 (예: "전력기기 345kV")
    const searchTokens = searchTerm.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const haystack = `${c.title} ${c.customer} ${c.spg ?? ""}`.toLowerCase();
    const matchesSearch = searchTokens.every(tok => haystack.includes(tok));
    const matchesPriority = priorityFilter === "All" || c.priority === priorityFilter;
    const matchesSpg = spgFilter === "All" || c.spg === spgFilter;
    return matchesSearch && matchesPriority && matchesSpg;
  });

  async function handleCreate() {
    if (!form.title.trim() || !form.customer.trim() || !form.description.trim()) {
      setFormError("제목, 고객사, 상세 내용은 필수입니다."); return;
    }
    setSubmitting(true); setFormError("");
    try {
      const resolvedParty = form.responsibleParty === "__custom__" ? customParty.trim() : form.responsibleParty;
      const res = await fetch("/api/claims", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, responsibleParty: resolvedParty || undefined, spg: form.spg.trim() || undefined, attachments }),
      });
      if (!res.ok) throw new Error("등록 실패");
      setShowForm(false);
      setForm({ title: "", customer: "", priority: "Mid", assignee: userName ?? "", description: "", receivedAt: today, responsibleParty: "", spg: "", projectKey: "" });
      setCustomParty("");
      setAttachments([]);
      router.refresh();
    } catch {
      setFormError("등록 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls = "w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs transition-all";

  return (
    <div className="space-y-6 relative">
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm overflow-x-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">클레임 진행 보드</h2>
            <p className="text-xs text-slate-400 mt-1">각 단계별 적체 건수를 확인하고, 지연 이슈를 집중 관리하십시오.</p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text" placeholder="클레임명·고객사·SPG 검색..."
                value={searchTerm} onChange={(e) => setSearchTermLocal(e.target.value)}
                className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all min-w-[220px]"
              />
            </div>

            <div className="flex bg-slate-100 p-1 rounded-lg">
              {(["All", "High", "Mid", "Low"] as const).map((p) => (
                <button key={p} onClick={() => setPriorityFilter(p)}
                  className={cn("px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                    priorityFilter === p ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  )}>
                  {p === "All" ? "전체" : p === "High" ? "높음" : p === "Mid" ? "보통" : "낮음"}
                </button>
              ))}
            </div>

            {spgOptions.length > 0 && (
              <select value={spgFilter} onChange={(e) => setSpgFilter(e.target.value)}
                className="text-xs border border-slate-200 rounded-lg px-2 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 max-w-36">
                <option value="All">SPG 전체</option>
                {spgOptions.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            )}

            {canEdit && (
              <button onClick={() => { setFormError(""); setShowForm(true); }}
                className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-all shadow-sm">
                <Plus className="w-3.5 h-3.5" /> 새 클레임 등록
              </button>
            )}
          </div>
        </div>

        <ClaimsKanban claims={filteredClaims} />
      </div>

      {/* 신규 등록 모달 */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="font-extrabold text-slate-900 text-base">신규 고객 클레임 등록</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1 text-sm">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
                <span className="font-bold">자동입력:</span> 접수일 <strong>{today}</strong> · 초기 상태 <strong>접수(Received)</strong>
              </div>
              {formError && <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-700 font-medium">{formError}</div>}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">클레임 제목 <span className="text-rose-500">*</span></label>
                <input type="text" placeholder="예: A사 변전소 케이블 피복 균열" value={form.title}
                  onChange={e => setForm(f => ({...f, title: e.target.value}))} className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">고객사 <span className="text-rose-500">*</span></label>
                  <input type="text" placeholder="예: A-Power" value={form.customer}
                    onChange={e => setForm(f => ({...f, customer: e.target.value}))} className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">중요도</label>
                  <select value={form.priority} onChange={e => setForm(f => ({...f, priority: e.target.value}))} className={inputCls + " bg-white"}>
                    <option value="High">높음 (High)</option>
                    <option value="Mid">보통 (Mid)</option>
                    <option value="Low">낮음 (Low)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">담당자</label>
                  <input type="text" placeholder="홍길동" value={form.assignee}
                    onChange={e => setForm(f => ({...f, assignee: e.target.value}))} className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">접수일</label>
                  <input type="date" value={form.receivedAt}
                    onChange={e => setForm(f => ({...f, receivedAt: e.target.value}))} className={inputCls + " bg-white"} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">귀책처</label>
                <select value={form.responsibleParty}
                  onChange={e => setForm(f => ({...f, responsibleParty: e.target.value}))}
                  className={inputCls + " bg-white"}>
                  <option value="">선택 안 함</option>
                  {RESPONSIBLE_PARTY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  <option value="__custom__">직접 입력...</option>
                </select>
                {form.responsibleParty === "__custom__" && (
                  <input type="text" placeholder="귀책처를 직접 입력하세요" value={customParty}
                    onChange={e => setCustomParty(e.target.value)} className={inputCls} />
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">SPG <span className="text-slate-400 font-normal">(제품군·선택)</span></label>
                <input type="text" list="claim-spg-options" placeholder="예: 지중케이블" value={form.spg}
                  onChange={e => setForm(f => ({...f, spg: e.target.value}))} className={inputCls} />
                <datalist id="claim-spg-options">
                  {spgOptions.map(o => <option key={o} value={o} />)}
                </datalist>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">프로젝트 키 <span className="text-slate-400 font-normal">(Tender 연결용·선택)</span></label>
                <ProjectKeyInput id="claim-project-key" value={form.projectKey}
                  onChange={v => setForm(f => ({...f, projectKey: v}))} inputClassName={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">상세 내용 <span className="text-rose-500">*</span></label>
                <textarea rows={4} placeholder="클레임 내용, 발생 경위 등을 상세히 기술하세요." value={form.description}
                  onChange={e => setForm(f => ({...f, description: e.target.value}))}
                  className={inputCls + " resize-none"} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">첨부파일</label>
                <AttachmentUploader
                  attachments={attachments}
                  onChange={setAttachments}
                  context="claims"
                  disabled={submitting}
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex gap-2 justify-end shrink-0">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl">취소</button>
              <button onClick={handleCreate} disabled={submitting}
                className="px-5 py-2 text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 rounded-xl disabled:opacity-50">
                {submitting ? "등록 중..." : "등록하기"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
