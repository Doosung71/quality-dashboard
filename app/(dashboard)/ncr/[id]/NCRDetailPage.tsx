"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { NCR, NCRStatus, NCRSeverity, NCRDispositionType, NCRTimelineItem, NCRAttachment } from "@/types/ncr";
import { NCR_STATUSES } from "@/types/ncr";
import { ArrowLeft, Edit2, Trash2, Save, X, Plus, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { AttachmentUploader, type AttachmentItem } from "@/components/ui/attachment-uploader";
import { AiSuggestionPanel } from "@/components/ui/ai-suggestion-panel";

const STATUS_LABELS: Record<NCRStatus, string> = {
  Issued:          "발행",
  Disposition:     "처리방안 수립",
  CorrectiveAction:"시정조치 중",
  Verification:    "효과검증",
  Closed:          "종결",
};

const STATUS_COLORS: Record<NCRStatus, string> = {
  Issued:          "bg-blue-100 text-blue-700 border-blue-300",
  Disposition:     "bg-purple-100 text-purple-700 border-purple-300",
  CorrectiveAction:"bg-amber-100 text-amber-700 border-amber-300",
  Verification:    "bg-indigo-100 text-indigo-700 border-indigo-300",
  Closed:          "bg-emerald-100 text-emerald-700 border-emerald-300",
};

const SEVERITY_COLORS: Record<NCRSeverity, string> = {
  Critical: "bg-rose-100 text-rose-800 border-rose-300 font-extrabold",
  Major:    "bg-amber-100 text-amber-700 border-amber-300 font-bold",
  Minor:    "bg-slate-100 text-slate-600 border-slate-300",
};

const SEVERITY_LABELS: Record<NCRSeverity, string> = {
  Critical: "Critical (위험)",
  Major:    "Major (중요)",
  Minor:    "Minor (경미)",
};

const DISPOSITION_LABELS: Record<NCRDispositionType, string> = {
  Scrap:      "폐기 (Scrap)",
  Rework:     "재작업 (Rework)",
  Concession: "특채 (Concession)",
  TBD:        "방안 미정",
};

interface Props {
  ncr: NCR;
  canEdit?: boolean;
  userName?: string;
}

function getToday() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
}

export function NCRDetailPage({ ncr: initial, canEdit = true, userName }: Props) {
  const router = useRouter();
  const [ncr, setNcr] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editForm, setEditForm] = useState({
    title:       ncr.title,
    source:      ncr.source,
    severity:    ncr.severity,
    disposition: ncr.disposition,
    targetDate:  ncr.targetDate,
    assignee:    ncr.assignee,
    description: ncr.description,
  });
  const [newEntry, setNewEntry] = useState("");
  const [addingEntry, setAddingEntry] = useState(false);
  const [deletingEntryIdx, setDeletingEntryIdx] = useState<number | null>(null);
  const [attachments, setAttachments] = useState<AttachmentItem[]>(
    (ncr.attachments ?? []) as AttachmentItem[]
  );
  const [savingAttachments, setSavingAttachments] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/ncr/${ncr.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) throw new Error("저장 실패");
      const updated = await res.json();
      setNcr(prev => ({ ...prev, ...updated }));
      setEditing(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleMoveStatus(newStatus: NCRStatus) {
    const closedDate = newStatus === "Closed" ? getToday() : null;
    const user = userName || "담당자";
    const timelineEntry: NCRTimelineItem = {
      date: getToday(),
      action: `단계 이동: ${STATUS_LABELS[ncr.status]} → ${STATUS_LABELS[newStatus]}`,
      user,
    };
    const newTimeline = [...(ncr.timeline ?? []), timelineEntry];
    try {
      const res = await fetch(`/api/ncr/${ncr.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, closedDate, timeline: newTimeline }),
      });
      if (!res.ok) throw new Error("상태 변경 실패");
      const updated = await res.json();
      setNcr(prev => ({ ...prev, ...updated }));
      router.refresh();
    } catch { /* ignore */ }
  }

  async function handleAddTimelineEntry() {
    if (!newEntry.trim()) return;
    setAddingEntry(true);
    const timelineEntry: NCRTimelineItem = {
      date: getToday(),
      action: newEntry.trim(),
      user: userName || "담당자",
    };
    const newTimeline = [...(ncr.timeline ?? []), timelineEntry];
    try {
      const res = await fetch(`/api/ncr/${ncr.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timeline: newTimeline }),
      });
      if (!res.ok) throw new Error("저장 실패");
      const updated = await res.json();
      setNcr(prev => ({ ...prev, ...updated }));
      setNewEntry("");
      router.refresh();
    } finally {
      setAddingEntry(false);
    }
  }

  async function handleDeleteTimelineEntry(originalIndex: number) {
    setDeletingEntryIdx(originalIndex);
    const newTimeline = (ncr.timeline ?? []).filter((_, idx) => idx !== originalIndex);
    try {
      const res = await fetch(`/api/ncr/${ncr.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timeline: newTimeline }),
      });
      if (!res.ok) throw new Error("삭제 실패");
      const updated = await res.json();
      setNcr(prev => ({ ...prev, ...updated }));
      router.refresh();
    } finally {
      setDeletingEntryIdx(null);
    }
  }

  async function handleAttachmentsChange(next: AttachmentItem[]) {
    setAttachments(next);
    setSavingAttachments(true);
    try {
      await fetch(`/api/ncr/${ncr.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attachments: next }),
      });
    } finally {
      setSavingAttachments(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/ncr/${ncr.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("삭제 실패");
      router.push("/ncr");
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  const currentIdx = NCR_STATUSES.indexOf(ncr.status);
  const prevStatus = currentIdx > 0 ? NCR_STATUSES[currentIdx - 1] : null;
  const nextStatus = currentIdx < NCR_STATUSES.length - 1 ? NCR_STATUSES[currentIdx + 1] : null;
  const isOverdue = ncr.status !== "Closed" && ncr.targetDate < getToday();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/ncr" className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-all shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs text-slate-400 font-bold">{ncr.ncrNo}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${STATUS_COLORS[ncr.status]}`}>
                {STATUS_LABELS[ncr.status]}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${SEVERITY_COLORS[ncr.severity]}`}>
                {SEVERITY_LABELS[ncr.severity]}
              </span>
              {isOverdue && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold border bg-rose-100 text-rose-700 border-rose-300 animate-pulse">
                  기한 초과
                </span>
              )}
            </div>
            {editing ? (
              <input value={editForm.title} onChange={e => setEditForm(f => ({...f, title: e.target.value}))}
                className="mt-1 text-xl font-bold text-slate-900 w-full border-b-2 border-slate-900 focus:outline-none" />
            ) : (
              <h1 className="mt-1 text-xl font-bold text-slate-900 break-all">{ncr.title}</h1>
            )}
          </div>
        </div>

        {canEdit && (
          <div className="flex items-center gap-2 shrink-0">
            {editing ? (
              <>
                <button onClick={() => setEditing(false)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl">
                  <X className="w-3.5 h-3.5" /> 취소
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-slate-950 hover:bg-slate-800 rounded-xl disabled:opacity-50">
                  <Save className="w-3.5 h-3.5" /> {saving ? "저장 중..." : "저장"}
                </button>
              </>
            ) : (
              <>
                <button onClick={() => { setEditForm({ title: ncr.title, source: ncr.source, severity: ncr.severity, disposition: ncr.disposition, targetDate: ncr.targetDate, assignee: ncr.assignee, description: ncr.description }); setEditing(true); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl">
                  <Edit2 className="w-3.5 h-3.5" /> 수정
                </button>
                <button onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-200">
                  <Trash2 className="w-3.5 h-3.5" /> 삭제
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* 기본 정보 카드 */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">발생 공장/검사처</p>
          {editing ? (
            <input value={editForm.source} onChange={e => setEditForm(f => ({...f, source: e.target.value}))}
              className="w-full text-sm font-semibold text-slate-800 border-b border-slate-300 focus:outline-none focus:border-slate-900" />
          ) : (
            <p className="text-sm font-semibold text-slate-800 wrap-break-word">{ncr.source}</p>
          )}
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">심각도</p>
          {editing ? (
            <select value={editForm.severity} onChange={e => setEditForm(f => ({...f, severity: e.target.value as NCRSeverity}))}
              className="text-sm font-semibold text-slate-800 border-b border-slate-300 focus:outline-none bg-white">
              <option value="Critical">Critical (위험)</option>
              <option value="Major">Major (중요)</option>
              <option value="Minor">Minor (경미)</option>
            </select>
          ) : (
            <p className="text-sm font-semibold text-slate-800 wrap-break-word">{SEVERITY_LABELS[ncr.severity]}</p>
          )}
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">처리방안</p>
          {editing ? (
            <select value={editForm.disposition} onChange={e => setEditForm(f => ({...f, disposition: e.target.value as NCRDispositionType}))}
              className="text-sm font-semibold text-slate-800 border-b border-slate-300 focus:outline-none bg-white">
              <option value="TBD">방안 미정</option>
              <option value="Rework">재작업 (Rework)</option>
              <option value="Concession">특채 (Concession)</option>
              <option value="Scrap">폐기 (Scrap)</option>
            </select>
          ) : (
            <p className="text-sm font-semibold text-slate-800 wrap-break-word">{DISPOSITION_LABELS[ncr.disposition]}</p>
          )}
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">담당자</p>
          {editing ? (
            <input value={editForm.assignee} onChange={e => setEditForm(f => ({...f, assignee: e.target.value}))}
              className="w-full text-sm font-semibold text-slate-800 border-b border-slate-300 focus:outline-none focus:border-slate-900" />
          ) : (
            <p className="text-sm font-semibold text-slate-800 wrap-break-word">{ncr.assignee}</p>
          )}
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">발행일</p>
          <p className="text-sm font-semibold text-slate-800 wrap-break-word">{ncr.issuedDate}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">완료 예정일</p>
          {editing ? (
            <input type="date" value={editForm.targetDate} onChange={e => setEditForm(f => ({...f, targetDate: e.target.value}))}
              className="text-sm font-semibold text-slate-800 border-b border-slate-300 focus:outline-none bg-white" />
          ) : (
            <p className={`text-sm font-semibold wrap-break-word ${isOverdue ? "text-rose-600 animate-pulse" : "text-slate-800"}`}>{ncr.targetDate}</p>
          )}
        </div>
        {ncr.closedDate && (
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">종결일</p>
            <p className="text-sm font-semibold text-emerald-600">{ncr.closedDate}</p>
          </div>
        )}
      </div>

      {/* 상세 내용 */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h2 className="text-sm font-bold text-slate-700 mb-3">부적합 현상 및 원인</h2>
        {editing ? (
          <textarea rows={5} value={editForm.description} onChange={e => setEditForm(f => ({...f, description: e.target.value}))}
            className="w-full text-sm text-slate-700 leading-relaxed border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none" />
        ) : (
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{ncr.description}</p>
        )}
      </div>

      {/* 파일 첨부 */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h2 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
          첨부파일
          {savingAttachments && <span className="text-[10px] text-slate-400 font-normal">저장 중...</span>}
        </h2>
        <AttachmentUploader
          attachments={attachments}
          onChange={handleAttachmentsChange}
          context="ncr"
          disabled={!canEdit}
        />
      </div>

      {/* 단계 이동 */}
      {canEdit && ncr.status !== "Closed" && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h2 className="text-sm font-bold text-slate-700 mb-4">단계 이동</h2>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1 flex-1 flex-wrap">
              {NCR_STATUSES.map((s, i) => (
                <div key={s} className="flex items-center gap-1">
                  <div className={`px-2 py-1 rounded-full text-[10px] font-bold border ${ncr.status === s ? STATUS_COLORS[s] + " ring-2 ring-offset-1 ring-slate-400" : i < currentIdx ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-slate-50 text-slate-400 border-slate-200"}`}>
                    {STATUS_LABELS[s]}
                  </div>
                  {i < NCR_STATUSES.length - 1 && <div className={`w-3 h-0.5 ${i < currentIdx ? "bg-emerald-400" : "bg-slate-200"}`} />}
                </div>
              ))}
            </div>
            <div className="flex gap-2 shrink-0">
              {prevStatus && (
                <button onClick={() => handleMoveStatus(prevStatus)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-200">
                  ← 이전 단계
                </button>
              )}
              {nextStatus && (
                <button onClick={() => handleMoveStatus(nextStatus)}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-slate-950 hover:bg-slate-800 rounded-xl">
                  다음 단계 ({STATUS_LABELS[nextStatus]}) →
                </button>
              )}
              <button onClick={() => handleMoveStatus("Closed")}
                className="px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />종결 처리
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI 유사사례 분석 패널 */}
      <AiSuggestionPanel title={ncr.title} description={ncr.description} type="ncr" />

      {/* 타임라인 */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h2 className="text-sm font-bold text-slate-700 mb-4">처리 이력</h2>
        <div className="space-y-3">
          {(ncr.timeline ?? []).length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">처리 이력이 없습니다.</p>
          ) : (
            [...(ncr.timeline ?? [])].reverse().map((item, i) => {
              const originalIndex = (ncr.timeline ?? []).length - 1 - i;
              return (
                <div key={i} className="flex gap-3 items-start group">
                  <div className="w-2 h-2 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-700 font-medium wrap-break-word">{item.action}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {item.date}
                      {item.user && <> · <span className="font-medium text-slate-500">{item.user}</span></>}
                    </p>
                  </div>
                  {canEdit && (
                    <button
                      onClick={() => handleDeleteTimelineEntry(originalIndex)}
                      disabled={deletingEntryIdx === originalIndex}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-50 text-slate-300 hover:text-red-400 shrink-0"
                      title="이력 삭제"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {canEdit && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex gap-2">
            <input type="text" value={newEntry} onChange={e => setNewEntry(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleAddTimelineEntry(); }}
              placeholder="처리 내용을 입력하고 Enter 또는 추가 버튼을 눌러주세요..."
              className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900" />
            <button onClick={handleAddTimelineEntry} disabled={addingEntry || !newEntry.trim()}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-slate-950 hover:bg-slate-800 rounded-xl disabled:opacity-40">
              <Plus className="w-3.5 h-3.5" /> 추가
            </button>
          </div>
        )}
      </div>

      {/* 삭제 확인 모달 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">NCR 삭제</h3>
                <p className="text-xs text-slate-500 mt-0.5">이 작업은 되돌릴 수 없습니다.</p>
              </div>
            </div>
            <p className="text-xs text-slate-700 bg-slate-50 rounded-xl p-3">
              <strong>{ncr.ncrNo}</strong> — {ncr.title}<br />
              <span className="text-slate-400">관련 모든 이력이 영구 삭제됩니다.</span>
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl">취소</button>
              <button onClick={handleDelete} disabled={deleting}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl disabled:opacity-50">
                {deleting ? "삭제 중..." : "삭제 확인"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
