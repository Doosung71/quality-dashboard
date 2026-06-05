"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Claim, ClaimStatus, ClaimPriority, ClaimTimelineItem } from "@/types/claim";
import { CLAIM_STATUSES } from "@/types/claim";
import { ArrowLeft, Edit2, Trash2, Save, X, Plus, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import Link from "next/link";

const STATUS_LABELS: Record<ClaimStatus, string> = {
  Received:      "접수",
  Investigating: "조사 중",
  Action:        "대책 수립",
  Verification:  "효과검증",
  Closed:        "종결",
};

const STATUS_COLORS: Record<ClaimStatus, string> = {
  Received:      "bg-slate-100 text-slate-700 border-slate-300",
  Investigating: "bg-blue-100 text-blue-700 border-blue-300",
  Action:        "bg-amber-100 text-amber-700 border-amber-300",
  Verification:  "bg-purple-100 text-purple-700 border-purple-300",
  Closed:        "bg-emerald-100 text-emerald-700 border-emerald-300",
};

const PRIORITY_COLORS: Record<ClaimPriority, string> = {
  High: "bg-rose-100 text-rose-700 border-rose-300",
  Mid:  "bg-amber-100 text-amber-700 border-amber-300",
  Low:  "bg-sky-100 text-sky-700 border-sky-300",
};

const PRIORITY_LABELS: Record<ClaimPriority, string> = {
  High: "높음 (High)",
  Mid:  "보통 (Mid)",
  Low:  "낮음 (Low)",
};

interface Props {
  claim: Claim;
  canEdit?: boolean;
  userName?: string;
}

function getToday() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
}

export function ClaimDetailPage({ claim: initial, canEdit = true, userName }: Props) {
  const router = useRouter();
  const [claim, setClaim] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editForm, setEditForm] = useState({
    title:       claim.title,
    customer:    claim.customer,
    priority:    claim.priority,
    assignee:    claim.assignee,
    description: claim.description,
  });
  const [newEntry, setNewEntry] = useState("");
  const [addingEntry, setAddingEntry] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/claims/${claim.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) throw new Error("저장 실패");
      const updated = await res.json();
      setClaim(prev => ({ ...prev, ...updated }));
      setEditing(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleMoveStatus(newStatus: ClaimStatus) {
    const closedAt = newStatus === "Closed" ? getToday() : null;
    const timelineEntry = { date: getToday(), action: `단계 이동: ${STATUS_LABELS[claim.status]} → ${STATUS_LABELS[newStatus]}` };
    const newTimeline = [...(claim.timeline ?? []), timelineEntry];
    try {
      const res = await fetch(`/api/claims/${claim.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, closedAt, timeline: newTimeline }),
      });
      if (!res.ok) throw new Error("상태 변경 실패");
      const updated = await res.json();
      setClaim(prev => ({ ...prev, ...updated }));
      router.refresh();
    } catch { /* ignore */ }
  }

  async function handleAddTimelineEntry() {
    if (!newEntry.trim()) return;
    setAddingEntry(true);
    const timelineEntry: ClaimTimelineItem = { date: getToday(), action: newEntry.trim() };
    const newTimeline = [...(claim.timeline ?? []), timelineEntry];
    try {
      const res = await fetch(`/api/claims/${claim.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timeline: newTimeline }),
      });
      if (!res.ok) throw new Error("저장 실패");
      const updated = await res.json();
      setClaim(prev => ({ ...prev, ...updated }));
      setNewEntry("");
      router.refresh();
    } finally {
      setAddingEntry(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/claims/${claim.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("삭제 실패");
      router.push("/claims");
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  const currentIdx = CLAIM_STATUSES.indexOf(claim.status);
  const prevStatus = currentIdx > 0 ? CLAIM_STATUSES[currentIdx - 1] : null;
  const nextStatus = currentIdx < CLAIM_STATUSES.length - 1 ? CLAIM_STATUSES[currentIdx + 1] : null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/claims" className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-all">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-slate-400 font-bold">{claim.claimNo}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${STATUS_COLORS[claim.status]}`}>
                {STATUS_LABELS[claim.status]}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${PRIORITY_COLORS[claim.priority]}`}>
                {PRIORITY_LABELS[claim.priority]}
              </span>
            </div>
            {editing ? (
              <input value={editForm.title} onChange={e => setEditForm(f => ({...f, title: e.target.value}))}
                className="mt-1 text-xl font-bold text-slate-900 w-full border-b-2 border-blue-500 focus:outline-none" />
            ) : (
              <h1 className="mt-1 text-xl font-bold text-slate-900">{claim.title}</h1>
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
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-50">
                  <Save className="w-3.5 h-3.5" /> {saving ? "저장 중..." : "저장"}
                </button>
              </>
            ) : (
              <>
                <button onClick={() => { setEditForm({ title: claim.title, customer: claim.customer, priority: claim.priority, assignee: claim.assignee, description: claim.description }); setEditing(true); }}
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

      {/* 기본 정보 */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">고객사</p>
          {editing ? (
            <input value={editForm.customer} onChange={e => setEditForm(f => ({...f, customer: e.target.value}))}
              className="w-full text-sm font-semibold text-slate-800 border-b border-slate-300 focus:outline-none focus:border-blue-500" />
          ) : (
            <p className="text-sm font-semibold text-slate-800">{claim.customer}</p>
          )}
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">중요도</p>
          {editing ? (
            <select value={editForm.priority} onChange={e => setEditForm(f => ({...f, priority: e.target.value as ClaimPriority}))}
              className="text-sm font-semibold text-slate-800 border-b border-slate-300 focus:outline-none bg-white">
              <option value="High">높음 (High)</option>
              <option value="Mid">보통 (Mid)</option>
              <option value="Low">낮음 (Low)</option>
            </select>
          ) : (
            <p className="text-sm font-semibold text-slate-800">{PRIORITY_LABELS[claim.priority]}</p>
          )}
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">담당자</p>
          {editing ? (
            <input value={editForm.assignee} onChange={e => setEditForm(f => ({...f, assignee: e.target.value}))}
              className="w-full text-sm font-semibold text-slate-800 border-b border-slate-300 focus:outline-none focus:border-blue-500" />
          ) : (
            <p className="text-sm font-semibold text-slate-800">{claim.assignee}</p>
          )}
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">접수일</p>
          <p className="text-sm font-semibold text-slate-800">{claim.receivedAt}</p>
          {claim.closedAt && (
            <p className="text-[10px] text-emerald-600 mt-0.5">종결: {claim.closedAt}</p>
          )}
        </div>
      </div>

      {/* 상세 내용 */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h2 className="text-sm font-bold text-slate-700 mb-3">클레임 상세 내용</h2>
        {editing ? (
          <textarea rows={5} value={editForm.description} onChange={e => setEditForm(f => ({...f, description: e.target.value}))}
            className="w-full text-sm text-slate-700 leading-relaxed border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
        ) : (
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{claim.description}</p>
        )}
      </div>

      {/* 단계 이동 */}
      {canEdit && claim.status !== "Closed" && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h2 className="text-sm font-bold text-slate-700 mb-4">단계 이동</h2>
          <div className="flex items-center gap-4 flex-wrap">
            {/* 진행 표시 */}
            <div className="flex items-center gap-1 flex-1">
              {CLAIM_STATUSES.map((s, i) => (
                <div key={s} className="flex items-center gap-1">
                  <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${claim.status === s ? STATUS_COLORS[s] + " ring-2 ring-offset-1 ring-blue-400" : i < currentIdx ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-slate-50 text-slate-400 border-slate-200"}`}>
                    {STATUS_LABELS[s]}
                  </div>
                  {i < CLAIM_STATUSES.length - 1 && <div className={`w-4 h-0.5 ${i < currentIdx ? "bg-emerald-400" : "bg-slate-200"}`} />}
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
                  className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl">
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

      {/* 타임라인 */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h2 className="text-sm font-bold text-slate-700 mb-4">처리 이력</h2>
        <div className="space-y-3">
          {(claim.timeline ?? []).length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">처리 이력이 없습니다.</p>
          ) : (
            [...(claim.timeline ?? [])].reverse().map((item, i) => (
              <div key={i} className="flex gap-3 items-start">
                <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                <div>
                  <p className="text-xs text-slate-700 font-medium">{item.action}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {item.date}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {canEdit && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex gap-2">
            <input type="text" value={newEntry} onChange={e => setNewEntry(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleAddTimelineEntry(); }}
              placeholder="처리 내용을 입력하고 Enter 또는 추가 버튼을 눌러주세요..."
              className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <button onClick={handleAddTimelineEntry} disabled={addingEntry || !newEntry.trim()}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-40">
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
                <h3 className="font-bold text-slate-900 text-sm">클레임 삭제</h3>
                <p className="text-xs text-slate-500 mt-0.5">이 작업은 되돌릴 수 없습니다.</p>
              </div>
            </div>
            <p className="text-xs text-slate-700 bg-slate-50 rounded-xl p-3">
              <strong>{claim.claimNo}</strong> — {claim.title}<br />
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
