"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Claim, ClaimStatus, ClaimPriority, ClaimTimelineItem, ClaimAttachment, BackClaim, BackClaimStatus } from "@/types/claim";
import { CLAIM_STATUSES, RESPONSIBLE_PARTY_OPTIONS, BACK_CLAIM_STATUS_LABELS, BACK_CLAIM_STATUSES } from "@/types/claim";
import { ArrowLeft, Edit2, Trash2, Save, X, Plus, CheckCircle2, Clock, AlertTriangle, ShieldAlert, Paperclip, ReceiptText } from "lucide-react";
import { AttachmentUploader } from "@/components/ui/attachment-uploader";
import { buildStageMoveTimeline, isSystemTimelineEntry } from "@/lib/stage-timeline";
import { AiSuggestionPanel } from "@/components/ui/ai-suggestion-panel";
import { VerifiedLessonPanel } from "@/components/ui/verified-lesson-panel";
import { ProjectKeyInput } from "@/components/ui/project-key-input";
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
  /** verified_lesson 확정 권한 (TEAM_LEAD+). canEdit과 별개. */
  canVerifyLesson?: boolean;
  userName?: string;
}

function getToday() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
}

export function ClaimDetailPage({ claim: initial, canEdit = true, canVerifyLesson = false, userName }: Props) {
  const router = useRouter();
  const [claim, setClaim] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editForm, setEditForm] = useState({
    title:            claim.title,
    customer:         claim.customer,
    projectKey:       claim.projectKey ?? "",
    priority:         claim.priority,
    assignee:         claim.assignee,
    description:      claim.description,
    targetDate:       claim.targetDate ?? "",
    responsibleParty: claim.responsibleParty ?? "",
  });
  const [customParty, setCustomParty] = useState("");

  // Back-claim 상태
  const [backClaims, setBackClaims] = useState<BackClaim[]>([]);
  const [bcLoading, setBcLoading] = useState(true);
  const [showBcForm, setShowBcForm] = useState(false);
  const [bcSaving, setBcSaving] = useState(false);
  const [bcForm, setBcForm] = useState({
    vendorName: "", sentAt: "", replyDeadline: "",
    claimedAmount: "", recoveredAmount: "", status: "DRAFT" as BackClaimStatus, notes: "",
  });
  const [editingBcId, setEditingBcId] = useState<string | null>(null);
  const [editBcForm, setEditBcForm] = useState<Partial<typeof bcForm & { id: string }>>({});

  useEffect(() => {
    fetch(`/api/claims/${claim.id}/backclaims`)
      .then(r => r.ok ? r.json() : [])
      .then((data: BackClaim[]) => {
        setBackClaims(data.map(bc => ({
          ...bc,
          sentAt:        bc.sentAt ? bc.sentAt.slice(0, 10) : undefined,
          replyDeadline: bc.replyDeadline ? bc.replyDeadline.slice(0, 10) : undefined,
        })))
      })
      .finally(() => setBcLoading(false))
  }, [claim.id])
  const [attachments, setAttachments] = useState<ClaimAttachment[]>(initial.attachments ?? []);
  const [savingAttachments, setSavingAttachments] = useState(false);
  const [newEntry, setNewEntry] = useState("");
  const [addingEntry, setAddingEntry] = useState(false);
  const [deletingEntryIdx, setDeletingEntryIdx] = useState<number | null>(null);

  async function handleAttachmentsChange(next: ClaimAttachment[]) {
    setAttachments(next);
    setSavingAttachments(true);
    try {
      await fetch(`/api/claims/${claim.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attachments: next }),
      });
    } finally {
      setSavingAttachments(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const resolvedParty = editForm.responsibleParty === "__custom__"
        ? customParty.trim()
        : editForm.responsibleParty;
      const res = await fetch(`/api/claims/${claim.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...editForm, responsibleParty: resolvedParty || null }),
      });
      if (!res.ok) throw new Error("저장 실패");
      await res.json();
      setClaim(prev => ({
        ...prev,
        title:            editForm.title,
        customer:         editForm.customer,
        projectKey:       editForm.projectKey || null,
        priority:         editForm.priority,
        assignee:         editForm.assignee,
        description:      editForm.description,
        targetDate:       editForm.targetDate || undefined,
        responsibleParty: resolvedParty || undefined,
      }));
      setEditing(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateBackClaim() {
    if (!bcForm.vendorName.trim() || !bcForm.claimedAmount) return;
    setBcSaving(true);
    try {
      const res = await fetch(`/api/claims/${claim.id}/backclaims`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorName:      bcForm.vendorName.trim(),
          sentAt:          bcForm.sentAt || undefined,
          replyDeadline:   bcForm.replyDeadline || undefined,
          claimedAmount:   parseInt(bcForm.claimedAmount.replace(/,/g, "")),
          recoveredAmount: bcForm.recoveredAmount ? parseInt(bcForm.recoveredAmount.replace(/,/g, "")) : undefined,
          status:          bcForm.status,
          notes:           bcForm.notes.trim() || undefined,
        }),
      });
      if (!res.ok) return;
      const created: BackClaim = await res.json();
      setBackClaims(prev => [...prev, {
        ...created,
        sentAt:        created.sentAt?.slice(0, 10),
        replyDeadline: created.replyDeadline?.slice(0, 10),
      }]);
      setShowBcForm(false);
      setBcForm({ vendorName: "", sentAt: "", replyDeadline: "", claimedAmount: "", recoveredAmount: "", status: "DRAFT", notes: "" });
    } finally {
      setBcSaving(false);
    }
  }

  async function handleUpdateBackClaim(bcId: string) {
    if (!editBcForm.vendorName?.trim() || !editBcForm.claimedAmount) return;
    try {
      const res = await fetch(`/api/claims/${claim.id}/backclaims/${bcId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorName:      editBcForm.vendorName?.trim(),
          sentAt:          editBcForm.sentAt || null,
          replyDeadline:   editBcForm.replyDeadline || null,
          claimedAmount:   parseInt(String(editBcForm.claimedAmount ?? "0").replace(/,/g, "")),
          recoveredAmount: editBcForm.recoveredAmount ? parseInt(String(editBcForm.recoveredAmount).replace(/,/g, "")) : null,
          status:          editBcForm.status,
          notes:           editBcForm.notes?.trim() || null,
        }),
      });
      if (!res.ok) return;
      const updated: BackClaim = await res.json();
      setBackClaims(prev => prev.map(bc => bc.id === bcId ? {
        ...updated,
        sentAt:        updated.sentAt?.slice(0, 10),
        replyDeadline: updated.replyDeadline?.slice(0, 10),
      } : bc));
      setEditingBcId(null);
    } catch { /* ignore */ }
  }

  async function handleDeleteBackClaim(bcId: string) {
    if (!confirm("이 Back-claim 건을 삭제하시겠습니까?")) return;
    const res = await fetch(`/api/claims/${claim.id}/backclaims/${bcId}`, { method: "DELETE" });
    if (res.ok) setBackClaims(prev => prev.filter(bc => bc.id !== bcId));
  }

  async function handleMoveStatus(newStatus: ClaimStatus) {
    const closedAt = newStatus === "Closed" ? getToday() : null;
    const handler = userName || "담당자";
    // #63: 직전 이동의 정확한 역방향이면 왕복 로그를 정리(dedup), 아니면 시스템 로그 추가
    const newTimeline = buildStageMoveTimeline(
      claim.timeline ?? [],
      STATUS_LABELS[claim.status],
      STATUS_LABELS[newStatus],
      (action): ClaimTimelineItem => ({ date: getToday(), action, handler, kind: "system" }),
    );
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
    const timelineEntry: ClaimTimelineItem = { date: getToday(), action: newEntry.trim(), handler: userName || "담당자", kind: "user" };
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

  async function handleDeleteTimelineEntry(originalIndex: number) {
    setDeletingEntryIdx(originalIndex);
    const newTimeline = (claim.timeline ?? []).filter((_, idx) => idx !== originalIndex);
    try {
      const res = await fetch(`/api/claims/${claim.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timeline: newTimeline }),
      });
      if (!res.ok) throw new Error("삭제 실패");
      const updated = await res.json();
      setClaim(prev => ({ ...prev, ...updated }));
      router.refresh();
    } finally {
      setDeletingEntryIdx(null);
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
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/claims" className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-all shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
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
              <h1 className="mt-1 text-xl font-bold text-slate-900 break-all">{claim.title}</h1>
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
                <button onClick={() => { setEditForm({ title: claim.title, customer: claim.customer, projectKey: claim.projectKey ?? "", priority: claim.priority, assignee: claim.assignee, description: claim.description, targetDate: claim.targetDate ?? "", responsibleParty: claim.responsibleParty ?? "" }); setCustomParty(""); setEditing(true); }}
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
            <p className="text-sm font-semibold text-slate-800 wrap-break-word">{claim.customer}</p>
          )}
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">프로젝트 키</p>
          {editing ? (
            <ProjectKeyInput id="claim-detail-project-key" value={editForm.projectKey}
              onChange={v => setEditForm(f => ({...f, projectKey: v}))}
              inputClassName="w-full text-sm font-semibold text-slate-800 border-b border-slate-300 focus:outline-none focus:border-blue-500" />
          ) : (
            <p className="text-sm font-semibold text-slate-800 wrap-break-word">{claim.projectKey || "—"}</p>
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
            <p className="text-sm font-semibold text-slate-800 wrap-break-word">{PRIORITY_LABELS[claim.priority]}</p>
          )}
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">담당자</p>
          {editing ? (
            <input value={editForm.assignee} onChange={e => setEditForm(f => ({...f, assignee: e.target.value}))}
              className="w-full text-sm font-semibold text-slate-800 border-b border-slate-300 focus:outline-none focus:border-blue-500" />
          ) : (
            <p className="text-sm font-semibold text-slate-800 wrap-break-word">{claim.assignee}</p>
          )}
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">접수일</p>
          <p className="text-sm font-semibold text-slate-800 wrap-break-word">{claim.receivedAt}</p>
          {claim.closedAt && (
            <p className="text-[10px] text-emerald-600 mt-0.5">종결: {claim.closedAt}</p>
          )}
          <div className="mt-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">목표기한</p>
            {editing ? (
              <input type="date" value={editForm.targetDate}
                onChange={e => setEditForm(f => ({...f, targetDate: e.target.value}))}
                className="text-sm font-semibold text-slate-800 border-b border-slate-300 focus:outline-none focus:border-blue-500 bg-transparent w-full" />
            ) : claim.targetDate ? (
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold text-slate-800 wrap-break-word">{claim.targetDate}</p>
                {(() => {
                  if (claim.status === "Closed") return null;
                  const today = getToday();
                  const days = Math.round(
                    (new Date(claim.targetDate!).getTime() - new Date(today).getTime()) / 86_400_000
                  );
                  if (days < 0)  return <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-rose-100 text-rose-700 animate-pulse flex items-center gap-0.5"><ShieldAlert className="w-2.5 h-2.5" />{`D+${-days}`}</span>;
                  if (days <= 3) return <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-amber-100 text-amber-700">{days === 0 ? "D-Day" : `D-${days}`}</span>;
                  return <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-emerald-50 text-emerald-700">{`D-${days}`}</span>;
                })()}
              </div>
            ) : (
              <p className="text-sm text-slate-400">—</p>
            )}
          </div>
        </div>
      </div>

      {/* 귀책처 */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h2 className="text-sm font-bold text-slate-700 mb-3">귀책처</h2>
        {editing ? (
          <div className="space-y-2">
            <select
              value={editForm.responsibleParty}
              onChange={e => setEditForm(f => ({...f, responsibleParty: e.target.value}))}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs bg-white"
            >
              <option value="">선택 안 함</option>
              {RESPONSIBLE_PARTY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              <option value="__custom__">직접 입력...</option>
            </select>
            {editForm.responsibleParty === "__custom__" && (
              <input type="text" placeholder="귀책처를 직접 입력하세요" value={customParty}
                onChange={e => setCustomParty(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs" />
            )}
          </div>
        ) : (
          <p className="text-sm font-semibold text-slate-800">
            {claim.responsibleParty
              ? <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200">{claim.responsibleParty}</span>
              : <span className="text-slate-400 text-xs">미지정</span>
            }
          </p>
        )}
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

      {/* 파일 첨부 */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h2 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
          <Paperclip className="w-4 h-4 text-slate-400" />
          파일 첨부
          {savingAttachments && <span className="text-[10px] text-slate-400 font-normal">저장 중...</span>}
        </h2>
        <AttachmentUploader
          attachments={attachments}
          onChange={handleAttachmentsChange}
          context="claims"
        />
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

      {/* Back-claim 현황 */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <ReceiptText className="w-4 h-4 text-orange-500" /> Back-claim 진행 현황
          </h2>
          {canEdit && (
            <button onClick={() => setShowBcForm(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-orange-700 bg-orange-50 hover:bg-orange-100 rounded-xl border border-orange-200">
              <Plus className="w-3.5 h-3.5" /> 청구 건 추가
            </button>
          )}
        </div>

        {/* 신규 등록 폼 */}
        {showBcForm && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-3">
            <p className="text-xs font-bold text-orange-700">새 Back-claim 청구 건 등록</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <label className="text-[10px] font-bold text-slate-500">청구 대상 업체명 *</label>
                <input type="text" placeholder="예: ABC 협력업체" value={bcForm.vendorName}
                  onChange={e => setBcForm(f => ({...f, vendorName: e.target.value}))}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-orange-400" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500">공문 발송일</label>
                <input type="date" value={bcForm.sentAt}
                  onChange={e => setBcForm(f => ({...f, sentAt: e.target.value}))}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-orange-400" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500">회신 기한</label>
                <input type="date" value={bcForm.replyDeadline}
                  onChange={e => setBcForm(f => ({...f, replyDeadline: e.target.value}))}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-orange-400" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500">청구 금액 (원) *</label>
                <input type="text" placeholder="예: 50000000" value={bcForm.claimedAmount}
                  onChange={e => setBcForm(f => ({...f, claimedAmount: e.target.value.replace(/[^0-9]/g, "")}))}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-orange-400" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500">회수 금액 (원)</label>
                <input type="text" placeholder="예: 30000000" value={bcForm.recoveredAmount}
                  onChange={e => setBcForm(f => ({...f, recoveredAmount: e.target.value.replace(/[^0-9]/g, "")}))}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-orange-400" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500">상태</label>
                <select value={bcForm.status} onChange={e => setBcForm(f => ({...f, status: e.target.value as BackClaimStatus}))}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-orange-400">
                  {BACK_CLAIM_STATUSES.map(s => <option key={s} value={s}>{BACK_CLAIM_STATUS_LABELS[s]}</option>)}
                </select>
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-[10px] font-bold text-slate-500">비고</label>
                <input type="text" placeholder="기타 메모" value={bcForm.notes}
                  onChange={e => setBcForm(f => ({...f, notes: e.target.value}))}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-orange-400" />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowBcForm(false)} className="px-3 py-1.5 text-xs text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">취소</button>
              <button onClick={handleCreateBackClaim} disabled={bcSaving || !bcForm.vendorName.trim() || !bcForm.claimedAmount}
                className="px-4 py-1.5 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-lg disabled:opacity-50">
                {bcSaving ? "등록 중..." : "등록"}
              </button>
            </div>
          </div>
        )}

        {/* Back-claim 목록 */}
        {bcLoading ? (
          <p className="text-xs text-slate-400 py-2">불러오는 중...</p>
        ) : backClaims.length === 0 ? (
          <p className="text-xs text-slate-400 py-2 text-center">등록된 Back-claim 청구 건이 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {backClaims.map(bc => {
              const isEditing = editingBcId === bc.id;
              const recoveryRate = bc.recoveredAmount && bc.claimedAmount
                ? ((bc.recoveredAmount / bc.claimedAmount) * 100).toFixed(1)
                : null;
              return (
                <div key={bc.id} className="border border-slate-100 rounded-xl p-4 space-y-2 hover:border-orange-200 transition-colors">
                  {isEditing ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="col-span-2 space-y-1">
                          <label className="text-[10px] font-bold text-slate-500">청구 대상 업체명</label>
                          <input type="text" value={editBcForm.vendorName ?? ""}
                            onChange={e => setEditBcForm(f => ({...f, vendorName: e.target.value}))}
                            className="w-full px-2 py-1.5 rounded border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-orange-400" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500">공문 발송일</label>
                          <input type="date" value={editBcForm.sentAt ?? ""}
                            onChange={e => setEditBcForm(f => ({...f, sentAt: e.target.value}))}
                            className="w-full px-2 py-1.5 rounded border border-slate-200 text-xs bg-white focus:outline-none" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500">회신 기한</label>
                          <input type="date" value={editBcForm.replyDeadline ?? ""}
                            onChange={e => setEditBcForm(f => ({...f, replyDeadline: e.target.value}))}
                            className="w-full px-2 py-1.5 rounded border border-slate-200 text-xs bg-white focus:outline-none" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500">청구 금액 (원)</label>
                          <input type="text" value={editBcForm.claimedAmount ?? ""}
                            onChange={e => setEditBcForm(f => ({...f, claimedAmount: e.target.value.replace(/[^0-9]/g, "")}))}
                            className="w-full px-2 py-1.5 rounded border border-slate-200 text-xs focus:outline-none" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500">회수 금액 (원)</label>
                          <input type="text" value={editBcForm.recoveredAmount ?? ""}
                            onChange={e => setEditBcForm(f => ({...f, recoveredAmount: e.target.value.replace(/[^0-9]/g, "")}))}
                            className="w-full px-2 py-1.5 rounded border border-slate-200 text-xs focus:outline-none" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500">상태</label>
                          <select value={editBcForm.status ?? "DRAFT"}
                            onChange={e => setEditBcForm(f => ({...f, status: e.target.value as BackClaimStatus}))}
                            className="w-full px-2 py-1.5 rounded border border-slate-200 text-xs bg-white focus:outline-none">
                            {BACK_CLAIM_STATUSES.map(s => <option key={s} value={s}>{BACK_CLAIM_STATUS_LABELS[s]}</option>)}
                          </select>
                        </div>
                        <div className="col-span-2 space-y-1">
                          <label className="text-[10px] font-bold text-slate-500">비고</label>
                          <input type="text" value={editBcForm.notes ?? ""}
                            onChange={e => setEditBcForm(f => ({...f, notes: e.target.value}))}
                            className="w-full px-2 py-1.5 rounded border border-slate-200 text-xs focus:outline-none" />
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => setEditingBcId(null)} className="px-3 py-1 text-xs text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">취소</button>
                        <button onClick={() => handleUpdateBackClaim(bc.id)}
                          className="px-3 py-1 text-xs font-bold text-white bg-orange-600 rounded-lg hover:bg-orange-700">저장</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-slate-800">{bc.vendorName}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            bc.status === "CLOSED"  ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                            bc.status === "SETTLED" ? "bg-blue-50 text-blue-700 border-blue-200" :
                            bc.status === "REPLIED" ? "bg-purple-50 text-purple-700 border-purple-200" :
                            bc.status === "SENT"    ? "bg-amber-50 text-amber-700 border-amber-200" :
                                                      "bg-slate-100 text-slate-600 border-slate-200"
                          }`}>{BACK_CLAIM_STATUS_LABELS[bc.status]}</span>
                        </div>
                        {canEdit && (
                          <div className="flex gap-1 shrink-0">
                            <button onClick={() => {
                              setEditingBcId(bc.id);
                              setEditBcForm({
                                vendorName:      bc.vendorName,
                                sentAt:          bc.sentAt ?? "",
                                replyDeadline:   bc.replyDeadline ?? "",
                                claimedAmount:   String(bc.claimedAmount),
                                recoveredAmount: bc.recoveredAmount ? String(bc.recoveredAmount) : "",
                                status:          bc.status,
                                notes:           bc.notes ?? "",
                              });
                            }} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDeleteBackClaim(bc.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        <div>
                          <p className="text-[10px] text-slate-400">공문 발송일</p>
                          <p className="font-medium text-slate-700">{bc.sentAt ?? "—"}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400">회신 기한</p>
                          <p className="font-medium text-slate-700">{bc.replyDeadline ?? "—"}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400">청구 금액</p>
                          <p className="font-bold text-orange-700">{bc.claimedAmount.toLocaleString()}원</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400">회수 현황</p>
                          {bc.recoveredAmount
                            ? <p className="font-bold text-emerald-700">{bc.recoveredAmount.toLocaleString()}원 <span className="text-slate-500 font-normal">({recoveryRate}%)</span></p>
                            : <p className="text-slate-400">—</p>
                          }
                        </div>
                      </div>
                      {bc.notes && <p className="text-[11px] text-slate-500 bg-slate-50 rounded-lg px-2 py-1">{bc.notes}</p>}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* AI 유사사례 분석 패널 */}
      <AiSuggestionPanel title={claim.title} description={claim.description} type="claim" />

      {/* 교훈 확정 패널 — 종결된 클레임만 (Q4 지식 선순환 producer) */}
      {claim.status === "Closed" && (
        <VerifiedLessonPanel type="claim" id={claim.id} canVerify={canVerifyLesson} />
      )}

      {/* 타임라인 */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h2 className="text-sm font-bold text-slate-700 mb-4">처리 이력</h2>
        <div className="space-y-3">
          {(claim.timeline ?? []).length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">처리 이력이 없습니다.</p>
          ) : (
            [...(claim.timeline ?? [])].reverse().map((item, i) => {
              const originalIndex = (claim.timeline ?? []).length - 1 - i;
              const isSystem = isSystemTimelineEntry(item);
              return (
                <div key={i} className="flex gap-3 items-start group">
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${isSystem ? "bg-slate-300" : "bg-blue-400"}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs wrap-break-word flex items-center gap-1.5 ${isSystem ? "text-slate-500 font-normal italic" : "text-slate-700 font-medium"}`}>
                      {isSystem && (
                        <span className="not-italic shrink-0 px-1.5 py-0.5 rounded bg-slate-100 text-slate-400 text-[9px] font-bold tracking-wide">시스템</span>
                      )}
                      <span className="min-w-0 wrap-break-word">{item.action}</span>
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {item.date}
                      {item.handler && <> · <span className="font-medium text-slate-500">{item.handler}</span></>}
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
