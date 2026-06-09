"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Equipment } from "@/types/asset";
import type { Test, TestsData, TestStatus, TestLog, IssueSeverity } from "@/types/test";
import type { FacilitiesData } from "@/types/facility";
import { TestCategoryChip, TestStatusBadge } from "./badges";
import { TestPlanForm } from "@/components/assets/test-plan-form";
import {
  Edit2, Trash2, Plus, X, Save, ChevronDown, Clock,
  AlertTriangle, CheckCircle2, CircleDot,
} from "lucide-react";

const SITE_LABEL: Record<string, string> = {
  gumi: "구미", indon: "인동", donghae: "동해", external: "사외",
};

type FilterValue = TestStatus | "전체";

interface EditForm {
  equipmentId:  string;
  status:       TestStatus;
  progress:     number;
  plannedStart: string;
  plannedEnd:   string;
  actualStart:  string;
  actualEnd:    string;
  ownerName:    string;
  managingTeam: string;
  changeNote:   string;
}

const FILTERS: { label: string; value: FilterValue }[] = [
  { label: "전체",   value: "전체" },
  { label: "시험중", value: "시험중" },
  { label: "준비중", value: "준비중" },
  { label: "지연",   value: "지연" },
  { label: "완료",   value: "완료" },
];

const PROGRESS_COLOR: Record<TestStatus, string> = {
  "시험중": "bg-blue-400",
  "완료":   "bg-emerald-400",
  "지연":   "bg-red-400",
  "준비중": "bg-slate-300",
};

const SEVERITY_LABEL: Record<IssueSeverity, string>  = { high: "높음", medium: "보통", low: "낮음" };
const SEVERITY_COLOR: Record<IssueSeverity, string> = {
  high:   "bg-red-100 text-red-700 border-red-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  low:    "bg-slate-100 text-slate-600 border-slate-200",
};

// ── 이슈 유틸 ─────────────────────────────────────────────────────────────────

interface IssueGroup {
  issue:    TestLog;
  action:   TestLog | undefined;
  resolved: boolean;
}

function groupIssues(logs: TestLog[]): IssueGroup[] {
  const actionMap = new Map(
    logs.filter(l => l.logType === "action" && l.issueId).map(l => [l.issueId!, l])
  );
  return logs
    .filter(l => l.logType === "issue" && l.issueId)
    .map(issue => ({
      issue,
      action:   actionMap.get(issue.issueId!),
      resolved: actionMap.has(issue.issueId!),
    }))
    .sort((a, b) => b.issue.date.localeCompare(a.issue.date));
}

function unresolvedCount(logs: TestLog[]): number {
  return groupIssues(logs).filter(g => !g.resolved).length;
}

// ── 이력 타임라인 ─────────────────────────────────────────────────────────────

function LogTimeline({ logs }: { logs: TestLog[] }) {
  const shown = [...logs].filter(l => !l.logType || l.logType === "change" || l.logType === "progress").reverse();
  if (shown.length === 0) return null;
  return (
    <div className="mt-1 space-y-2 pl-1">
      {shown.map((log, i) => (
        <div key={i} className="flex gap-2.5">
          <div className="flex flex-col items-center shrink-0">
            <div className="w-2 h-2 rounded-full bg-violet-300 mt-0.5 shrink-0" />
            {i < shown.length - 1 && <div className="w-px flex-1 bg-violet-100 mt-1" />}
          </div>
          <div className="pb-2 min-w-0">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 flex-wrap">
              <span>{log.date}</span>
              {log.changedBy && <><span>·</span><span className="font-medium text-slate-600">{log.changedBy}</span></>}
            </div>
            {log.changes && <p className="text-xs text-slate-600 mt-0.5 font-medium break-all">{log.changes}</p>}
            {log.note && log.note !== "계획 변경" && (
              <p className="text-[11px] text-slate-400 italic mt-0.5">{log.note}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── 이슈 관리 모달 ────────────────────────────────────────────────────────────

function IssueModal({
  test,
  onClose,
  onRefresh,
}: {
  test: Test;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const groups = groupIssues(test.logs);
  const [showResolved, setShowResolved] = useState(false);
  const [severity, setSeverity] = useState<IssueSeverity>("medium");
  const [issueNote, setIssueNote] = useState("");
  const [addingActionFor, setAddingActionFor] = useState<string | null>(null);
  const [actionNote, setActionNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const open   = groups.filter(g => !g.resolved);
  const closed = groups.filter(g => g.resolved);

  async function submitIssue() {
    if (!issueNote.trim()) { setError("이슈 내용을 입력하세요."); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch(`/api/test-plans/${test.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          addLog: {
            logType: "issue",
            issueId: crypto.randomUUID(),
            severity,
            note: issueNote.trim(),
          },
        }),
      });
      if (!res.ok) { setError("이슈 등록 실패"); return; }
      setIssueNote(""); setSeverity("medium");
      onRefresh();
    } finally { setSaving(false); }
  }

  async function submitAction(issueId: string) {
    if (!actionNote.trim()) return;
    setSaving(true); setError("");
    try {
      const res = await fetch(`/api/test-plans/${test.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          addLog: {
            logType: "action",
            issueId,
            note: actionNote.trim(),
          },
        }),
      });
      if (!res.ok) { setError("조치 등록 실패"); return; }
      setAddingActionFor(null); setActionNote("");
      onRefresh();
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* 헤더 */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between gap-3 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h2 className="text-sm font-bold text-slate-800">이슈 관리</h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{test.projectName}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* 미해결 이슈 */}
          {open.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                미해결 이슈 ({open.length}건)
              </p>
              {open.map(({ issue }) => (
                <div key={issue.issueId} className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                          SEVERITY_COLOR[issue.severity ?? "medium"]
                        )}>
                          {SEVERITY_LABEL[issue.severity ?? "medium"]}
                        </span>
                        <span className="text-[10px] text-slate-400">{issue.date} · {issue.changedBy}</span>
                      </div>
                      <p className="text-sm text-slate-700 font-medium">{issue.note}</p>
                    </div>
                    <CircleDot className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  </div>

                  {addingActionFor === issue.issueId ? (
                    <div className="space-y-2 pt-1 border-t border-amber-200">
                      <textarea
                        value={actionNote}
                        onChange={(e) => setActionNote(e.target.value)}
                        placeholder="조치 내용 및 결과를 입력하세요"
                        rows={2}
                        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      />
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => { setAddingActionFor(null); setActionNote(""); }}
                          className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg">취소</button>
                        <button onClick={() => submitAction(issue.issueId!)} disabled={saving}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50">
                          <CheckCircle2 className="w-3.5 h-3.5" /> 조치 완료
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setAddingActionFor(issue.issueId!); setActionNote(""); }}
                      className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> 조치 추가
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {open.length === 0 && closed.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-4">등록된 이슈가 없습니다.</p>
          )}

          {/* 해결된 이슈 */}
          {closed.length > 0 && (
            <div className="space-y-2">
              <button
                onClick={() => setShowResolved(v => !v)}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600"
              >
                <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showResolved ? "rotate-180" : "")} />
                해결된 이슈 ({closed.length}건)
              </button>
              {showResolved && (
                <div className="space-y-2">
                  {closed.map(({ issue, action }) => (
                    <div key={issue.issueId} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 space-y-1.5 opacity-70">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                          SEVERITY_COLOR[issue.severity ?? "medium"]
                        )}>
                          {SEVERITY_LABEL[issue.severity ?? "medium"]}
                        </span>
                        <span className="text-[10px] text-slate-400">{issue.date}</span>
                        <CheckCircle2 className="w-3 h-3 text-emerald-500 ml-auto" />
                      </div>
                      <p className="text-xs text-slate-600">{issue.note}</p>
                      {action && (
                        <p className="text-xs text-emerald-700 font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> {action.note}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 이슈 등록 폼 */}
          <div className="border-t border-slate-100 pt-4 space-y-3">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">이슈 등록</p>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">심각도</label>
              <div className="flex gap-2">
                {(["high", "medium", "low"] as const).map(sv => (
                  <button key={sv} onClick={() => setSeverity(sv)}
                    className={cn(
                      "flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors",
                      severity === sv
                        ? SEVERITY_COLOR[sv] + " ring-2 ring-offset-1 ring-current"
                        : "border-slate-200 text-slate-500 hover:bg-slate-50"
                    )}>
                    {SEVERITY_LABEL[sv]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">이슈 내용</label>
              <textarea
                value={issueNote}
                onChange={(e) => setIssueNote(e.target.value)}
                placeholder="예) 시험체 제작 지연 — 납기 2주 초과 예상"
                rows={3}
                className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button onClick={submitIssue} disabled={saving}
              className="w-full py-2 text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl disabled:opacity-50 transition-colors">
              {saving ? "등록 중..." : "이슈 등록"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

export function FacilitiesView({
  data,
  assets,
  testsData,
}: {
  data: FacilitiesData;
  assets: Equipment[];
  testsData: TestsData;
}) {
  const router = useRouter();
  const tests = testsData.tests;

  const [filter,           setFilter]           = useState<FilterValue>("전체");
  const [showCreate,       setShowCreate]       = useState(false);
  const [editTarget,       setEditTarget]       = useState<Test | null>(null);
  const [editForm,         setEditForm]         = useState<EditForm | null>(null);
  const [saving,           setSaving]           = useState(false);
  const [saveError,        setSaveError]        = useState<string | null>(null);
  const [confirmDeleteId,  setConfirmDeleteId]  = useState<string | null>(null);
  const [deleting,         setDeleting]         = useState(false);
  const [expandedLogId,    setExpandedLogId]    = useState<string | null>(null);
  const [issueTarget,      setIssueTarget]      = useState<Test | null>(null);

  const counts: Record<FilterValue, number> = {
    전체:   tests.length,
    시험중: tests.filter(t => t.status === "시험중").length,
    준비중: tests.filter(t => t.status === "준비중").length,
    지연:   tests.filter(t => t.status === "지연").length,
    완료:   tests.filter(t => t.status === "완료").length,
  };

  const filtered = filter === "전체" ? tests : tests.filter(t => t.status === filter);

  const hasKeyChange = editTarget && editForm && (
    editForm.plannedStart !== editTarget.plannedStart ||
    editForm.plannedEnd   !== editTarget.plannedEnd   ||
    editForm.equipmentId  !== (editTarget.equipmentId ?? "")
  );

  function openEdit(test: Test) {
    setEditTarget(test);
    setEditForm({
      equipmentId:  test.equipmentId ?? "",
      status:       test.status,
      progress:     test.progress,
      plannedStart: test.plannedStart,
      plannedEnd:   test.plannedEnd,
      actualStart:  test.actualStart  ?? "",
      actualEnd:    test.actualEnd    ?? "",
      ownerName:    test.ownerName    ?? "",
      managingTeam: test.managingTeam ?? "",
      changeNote:   "",
    });
  }

  async function handleSave() {
    if (!editTarget || !editForm) return;
    if (hasKeyChange && !editForm.changeNote.trim()) {
      setSaveError("계획 기간 또는 설비 변경 시 변경 사유를 입력하세요.");
      return;
    }
    setSaving(true); setSaveError(null);
    try {
      const res = await fetch(`/api/test-plans/${editTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          equipmentId:  editForm.equipmentId  || null,
          status:       editForm.status,
          progress:     editForm.progress,
          plannedStart: editForm.plannedStart || null,
          plannedEnd:   editForm.plannedEnd   || null,
          actualStart:  editForm.actualStart  || null,
          actualEnd:    editForm.actualEnd    || null,
          ownerName:    editForm.ownerName    || null,
          managingTeam: editForm.managingTeam || null,
          changeNote:   editForm.changeNote   || null,
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setSaveError(json.error ?? "저장 실패");
        return;
      }
      setEditTarget(null); setEditForm(null); setSaveError(null);
      router.refresh();
    } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    setDeleting(true);
    try {
      await fetch(`/api/test-plans/${id}`, { method: "DELETE" });
      setConfirmDeleteId(null);
      router.refresh();
    } finally { setDeleting(false); }
  }

  return (
    <div className="space-y-5">

      {/* ── 헤더 ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-slate-700">시험 계획</span>
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
              )}>{counts[value]}</span>
            </button>
          ))}
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition-colors">
          <Plus className="w-4 h-4" /> 시험 계획 등록
        </button>
      </div>

      {/* ── 등록 모달 ─────────────────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-800">시험 계획 등록</h2>
              <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-4">
              <TestPlanForm
                equipment={assets} tests={tests} facilitiesData={data}
                onSuccess={() => { setShowCreate(false); router.refresh(); }}
                onCancel={() => setShowCreate(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── 수정 모달 ─────────────────────────────────────────── */}
      {editTarget && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-800">시험 계획 수정</h2>
                <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{editTarget.projectName}</p>
              </div>
              <button onClick={() => { setEditTarget(null); setEditForm(null); setSaveError(null); }}
                className="text-slate-400 hover:text-slate-600 shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {/* 설비 */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">시험 설비</label>
                <select value={editForm.equipmentId}
                  onChange={e => setEditForm(f => f ? { ...f, equipmentId: e.target.value } : f)}
                  className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white">
                  <option value="">설비 미지정</option>
                  {assets.map(eq => (
                    <option key={eq.id} value={eq.id}>[{SITE_LABEL[eq.siteId] ?? eq.siteId}] {eq.name}</option>
                  ))}
                </select>
              </div>
              {/* 계획 기간 */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">
                  계획 기간
                  {hasKeyChange && (editForm.plannedStart !== editTarget.plannedStart || editForm.plannedEnd !== editTarget.plannedEnd) && (
                    <span className="ml-1.5 text-amber-500 font-normal">변경됨</span>
                  )}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">시작일</label>
                    <input type="date" value={editForm.plannedStart}
                      onChange={e => setEditForm(f => f ? { ...f, plannedStart: e.target.value } : f)}
                      className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">종료일</label>
                    <input type="date" value={editForm.plannedEnd} min={editForm.plannedStart}
                      onChange={e => setEditForm(f => f ? { ...f, plannedEnd: e.target.value } : f)}
                      className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500" />
                  </div>
                </div>
              </div>
              {/* 변경 사유 */}
              {hasKeyChange && (
                <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3">
                  <label className="block text-xs font-bold text-amber-700 mb-1.5">
                    변경 사유 <span className="text-red-500">*</span>
                  </label>
                  <textarea value={editForm.changeNote}
                    onChange={e => setEditForm(f => f ? { ...f, changeNote: e.target.value } : f)}
                    placeholder="예) 시험체 제작 지연으로 인한 일정 조정"
                    rows={2}
                    className="w-full text-sm border border-amber-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white resize-none" />
                </div>
              )}
              {/* 상태 + 진행률 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">상태</label>
                  <select value={editForm.status}
                    onChange={e => setEditForm(f => f ? { ...f, status: e.target.value as TestStatus } : f)}
                    className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white">
                    <option value="준비중">준비중</option>
                    <option value="시험중">시험중</option>
                    <option value="완료">완료</option>
                    <option value="지연">지연</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">진행률 (%)</label>
                  <input type="number" min={0} max={100} value={editForm.progress}
                    onChange={e => setEditForm(f => f ? { ...f, progress: Number(e.target.value) } : f)}
                    className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
              </div>
              {/* 실제 기간 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">실제 시작일</label>
                  <input type="date" value={editForm.actualStart}
                    onChange={e => setEditForm(f => f ? { ...f, actualStart: e.target.value } : f)}
                    className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">실제 완료일</label>
                  <input type="date" value={editForm.actualEnd}
                    onChange={e => setEditForm(f => f ? { ...f, actualEnd: e.target.value } : f)}
                    className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
              </div>
              {/* 담당자 + 관리팀 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">담당자</label>
                  <input type="text" value={editForm.ownerName} placeholder="담당자 이름"
                    onChange={e => setEditForm(f => f ? { ...f, ownerName: e.target.value } : f)}
                    className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">관리팀</label>
                  <input type="text" value={editForm.managingTeam} placeholder="팀명"
                    onChange={e => setEditForm(f => f ? { ...f, managingTeam: e.target.value } : f)}
                    className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
              </div>
              {/* 변경 이력 */}
              {editTarget.logs.filter(l => !l.logType || l.logType === "change").length > 0 && (
                <div className="rounded-xl border border-slate-100 px-4 py-3">
                  <p className="text-xs font-bold text-slate-400 mb-2 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> 변경 이력
                  </p>
                  <LogTimeline logs={editTarget.logs} />
                </div>
              )}
              {saveError && (
                <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">{saveError}</p>
              )}
              <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
                <button onClick={() => { setEditTarget(null); setEditForm(null); setSaveError(null); }}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl">취소</button>
                <button onClick={handleSave} disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-xl disabled:opacity-50">
                  <Save className="w-3.5 h-3.5" /> {saving ? "저장 중..." : "저장"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 이슈 관리 모달 ───────────────────────────────────── */}
      {issueTarget && (
        <IssueModal
          test={issueTarget}
          onClose={() => setIssueTarget(null)}
          onRefresh={() => { setIssueTarget(null); router.refresh(); }}
        />
      )}

      {/* ── 시험 계획 목록 ───────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
          <p className="text-sm text-slate-400">
            {filter === "전체" ? "등록된 시험 계획이 없습니다." : `"${filter}" 상태의 시험 계획이 없습니다.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((test) => {
            const eq = assets.find(e => e.id === test.equipmentId);
            const isConfirmDelete = confirmDeleteId === test.id;
            const logExpanded = expandedLogId === test.id;
            const issueCount = unresolvedCount(test.logs);

            return (
              <div key={test.id}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:border-slate-200 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <TestCategoryChip category={test.testCategory} />
                      <TestStatusBadge  status={test.status} />
                      {issueCount > 0 && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                          <AlertTriangle className="w-3 h-3" /> 이슈 {issueCount}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-slate-800">{test.projectName}</p>
                    {test.sampleDescription && (
                      <p className="text-xs text-slate-500 mt-0.5 truncate">{test.sampleDescription}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 flex-wrap text-xs text-slate-400">
                      {eq && (
                        <span>
                          <span className="text-slate-300 mr-1">[{SITE_LABEL[eq.siteId] ?? eq.siteId}]</span>
                          <span className="font-medium text-slate-600">{eq.name}</span>
                        </span>
                      )}
                      <span>{test.plannedStart} ~ {test.plannedEnd}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-1.5 text-xs">
                      <span className="text-slate-400">
                        담당: <span className={test.ownerName ? "font-medium text-slate-700" : "text-slate-300"}>
                          {test.ownerName ?? "미지정"}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* 액션 버튼 */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isConfirmDelete ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-rose-600 font-semibold">삭제?</span>
                        <button onClick={() => setConfirmDeleteId(null)}
                          className="px-2.5 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg">취소</button>
                        <button onClick={() => handleDelete(test.id)} disabled={deleting}
                          className="px-2.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg disabled:opacity-50">
                          {deleting ? "삭제 중" : "확인"}
                        </button>
                      </div>
                    ) : (
                      <>
                        {/* 이슈 버튼 */}
                        <button
                          onClick={() => setIssueTarget(test)}
                          className={cn(
                            "p-2 rounded-xl transition-colors relative",
                            issueCount > 0
                              ? "text-amber-500 hover:text-amber-700 hover:bg-amber-50"
                              : "text-slate-300 hover:text-amber-500 hover:bg-amber-50"
                          )}
                          title="이슈 관리"
                        >
                          <AlertTriangle className="w-4 h-4" />
                          {issueCount > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-amber-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                              {issueCount}
                            </span>
                          )}
                        </button>
                        <button onClick={() => openEdit(test)}
                          className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => setConfirmDeleteId(test.id)}
                          className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* 진행률 바 */}
                {test.progress > 0 && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                      <span>진행률</span>
                      <span className="font-semibold text-violet-600">{test.progress}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full transition-all", PROGRESS_COLOR[test.status])}
                        style={{ width: `${test.progress}%` }} />
                    </div>
                  </div>
                )}

                {/* 변경 이력 토글 */}
                {test.logs.filter(l => !l.logType || l.logType === "change").length > 0 && (
                  <div className="mt-3 border-t border-slate-100 pt-3">
                    <button
                      onClick={() => setExpandedLogId(logExpanded ? null : test.id)}
                      className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-violet-600 transition-colors"
                    >
                      <Clock className="w-3 h-3" />
                      변경 이력 {test.logs.filter(l => !l.logType || l.logType === "change").length}건
                      <ChevronDown className={cn("w-3 h-3 transition-transform", logExpanded ? "rotate-180" : "")} />
                    </button>
                    {logExpanded && (
                      <div className="mt-2.5">
                        <LogTimeline logs={test.logs} />
                      </div>
                    )}
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
