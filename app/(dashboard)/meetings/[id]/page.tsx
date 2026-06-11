"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft, Save, Plus, Trash2, CheckSquare, Square,
  Calendar, Tag, Link2, X, Edit3
} from "lucide-react"

type IssueLink  = { issueType: string; issueId: string; issueLabel: string }
type Action     = { id: string; content: string; assigneeName: string; dueDate: string | null; done: boolean }
type Meeting    = {
  id: string; title: string; type: string; meetingDate: string; body: string
  issueLinks: IssueLink[]
  createdBy: { name: string; nickname: string | null }
  actions: Action[]
}

const MEETING_TYPE_LABELS: Record<string, string> = {
  QUALITY_ISSUE: "품질이슈 회의", STANDARD_REVIEW: "표준검토 회의",
  CHANGE_MANAGEMENT: "변경관리 회의", QUALITY_MEETING: "품질회의", OTHER: "기타",
}
const ISSUE_TYPE_LABELS: Record<string, string> = {
  NCR: "부적합품(NCR)", CLAIM: "고객 클레임", INCOMING_INSPECTION: "수입검사",
  SOURCE_INSPECTION: "출장검사", SUPPLIER_AUDIT: "협력업체 감사",
  TEST_PLAN: "시험계획", QPA: "공정감사(QPA)", OTHER: "기타",
}

function getDDay(dateStr: string | null): string | null {
  if (!dateStr) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const due   = new Date(dateStr); due.setHours(0, 0, 0, 0)
  const diff  = Math.round((due.getTime() - today.getTime()) / 86400000)
  if (diff < 0)  return `D+${Math.abs(diff)}`
  if (diff === 0) return "D-Day"
  return `D-${diff}`
}
function getDDayColor(dateStr: string | null): string {
  if (!dateStr) return ""
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const due   = new Date(dateStr); due.setHours(0, 0, 0, 0)
  const diff  = Math.round((due.getTime() - today.getTime()) / 86400000)
  if (diff < 0)  return "bg-rose-50 text-rose-700 border-rose-200"
  if (diff <= 3) return "bg-amber-50 text-amber-700 border-amber-200"
  return "bg-emerald-50 text-emerald-700 border-emerald-200"
}

export default function MeetingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const [meeting, setMeeting]   = useState<Meeting | null>(null)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [savedOk, setSavedOk]   = useState(false)
  const [editTitle, setEditTitle]     = useState("")
  const [editType, setEditType]       = useState("")
  const [editDate, setEditDate]       = useState("")
  const [editBody, setEditBody]       = useState("")
  const [bodyDirty, setBodyDirty]     = useState(false)

  // 이슈 연결 폼
  const [showIssueForm, setShowIssueForm] = useState(false)
  const [issueForm, setIssueForm] = useState({ issueType: "NCR", issueId: "", issueLabel: "" })

  // 액션 아이템 폼
  const [showActionForm, setShowActionForm] = useState(false)
  const [actionForm, setActionForm] = useState({ content: "", assigneeName: "", dueDate: "" })
  const [addingAction, setAddingAction] = useState(false)

  useEffect(() => {
    fetch(`/api/meetings/${id}`)
      .then(r => r.json())
      .then((data: Meeting) => {
        setMeeting(data)
        setEditTitle(data.title)
        setEditType(data.type)
        setEditDate(data.meetingDate.slice(0, 10))
        setEditBody(data.body)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id])

  function flashSaved() {
    setSavedOk(true)
    setTimeout(() => setSavedOk(false), 2000)
  }

  async function saveHeader() {
    if (!meeting) return
    setSaving(true)
    const res = await fetch(`/api/meetings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: editTitle, type: editType, meetingDate: editDate }),
    })
    if (res.ok) {
      const updated: Meeting = await res.json()
      setMeeting(updated)
      flashSaved()
    }
    setSaving(false)
  }

  async function saveBody() {
    setSaving(true)
    const res = await fetch(`/api/meetings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: editBody }),
    })
    if (res.ok) { setBodyDirty(false); flashSaved() }
    setSaving(false)
  }

  async function addIssueLink() {
    if (!issueForm.issueId.trim() || !issueForm.issueLabel.trim()) return
    const newLinks = [...(meeting?.issueLinks ?? []), { ...issueForm }]
    const res = await fetch(`/api/meetings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ issueLinks: newLinks }),
    })
    if (res.ok) {
      const updated: Meeting = await res.json()
      setMeeting(updated)
      setIssueForm({ issueType: "NCR", issueId: "", issueLabel: "" })
      setShowIssueForm(false)
    }
  }

  async function removeIssueLink(idx: number) {
    const newLinks = meeting?.issueLinks.filter((_, i) => i !== idx) ?? []
    const res = await fetch(`/api/meetings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ issueLinks: newLinks }),
    })
    if (res.ok) {
      const updated: Meeting = await res.json()
      setMeeting(updated)
    }
  }

  async function addAction(e: React.FormEvent) {
    e.preventDefault()
    if (!actionForm.content.trim() || !actionForm.assigneeName.trim()) return
    setAddingAction(true)
    const res = await fetch(`/api/meetings/${id}/actions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: actionForm.content,
        assigneeName: actionForm.assigneeName,
        dueDate: actionForm.dueDate || null,
      }),
    })
    if (res.ok) {
      const newAction: Action = await res.json()
      setMeeting(prev => prev ? { ...prev, actions: [...prev.actions, newAction] } : prev)
      setActionForm({ content: "", assigneeName: "", dueDate: "" })
      setShowActionForm(false)
    }
    setAddingAction(false)
  }

  async function toggleDone(action: Action) {
    const res = await fetch(`/api/meetings/${id}/actions`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actionId: action.id, done: !action.done }),
    })
    if (res.ok) {
      const updated: Action = await res.json()
      setMeeting(prev => prev ? {
        ...prev,
        actions: prev.actions.map(a => a.id === updated.id ? updated : a),
      } : prev)
    }
  }

  async function deleteAction(actionId: string) {
    const res = await fetch(`/api/meetings/${id}/actions`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actionId }),
    })
    if (res.ok) {
      setMeeting(prev => prev ? {
        ...prev,
        actions: prev.actions.filter(a => a.id !== actionId),
      } : prev)
    }
  }

  async function deleteMeeting() {
    if (!confirm("이 회의록을 삭제하시겠습니까?")) return
    await fetch(`/api/meetings/${id}`, { method: "DELETE" })
    router.push("/meetings")
  }

  if (loading) return <div className="p-8 text-center text-slate-400 text-sm">로딩 중…</div>
  if (!meeting) return <div className="p-8 text-center text-slate-400 text-sm">회의록을 찾을 수 없습니다.</div>

  const pendingActions = meeting.actions.filter(a => !a.done)
  const doneActions    = meeting.actions.filter(a => a.done)

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      {/* 뒤로가기 */}
      <Link href="/meetings" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> 회의록 목록
      </Link>

      {/* 회의 기본 정보 */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            className="col-span-1 md:col-span-1 px-3 py-2 text-sm font-bold border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400"
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            placeholder="회의명"
          />
          <select
            className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400"
            value={editType}
            onChange={e => setEditType(e.target.value)}
          >
            {Object.entries(MEETING_TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <input
            type="date"
            className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400"
            value={editDate}
            onChange={e => setEditDate(e.target.value)}
          />
        </div>
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-slate-400">
            작성자: {meeting.createdBy.nickname ?? meeting.createdBy.name}
          </p>
          <div className="flex gap-2">
            <button onClick={deleteMeeting}
              className="px-3 py-1.5 text-xs text-rose-600 border border-rose-200 rounded-xl hover:bg-rose-50 transition-all">
              삭제
            </button>
            <button onClick={saveHeader} disabled={saving}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl disabled:opacity-50 transition-all
                ${savedOk ? "bg-emerald-600 text-white" : "bg-slate-900 text-white hover:bg-slate-700"}`}>
              <Save className="w-3 h-3" />
              {saving ? "저장 중…" : savedOk ? "저장됨 ✓" : "저장"}
            </button>
          </div>
        </div>
      </div>

      {/* 연결된 이슈 */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5 space-y-3">
        <div className="flex items-center justify-between border-b pb-2">
          <h2 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
            <Link2 className="w-4 h-4 text-indigo-400" /> 연결된 이슈
          </h2>
          <button onClick={() => setShowIssueForm(v => !v)}
            className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
            <Plus className="w-3 h-3" /> 이슈 연결
          </button>
        </div>

        {showIssueForm && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <select
                className="px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none"
                value={issueForm.issueType}
                onChange={e => setIssueForm(p => ({ ...p, issueType: e.target.value }))}
              >
                {Object.entries(ISSUE_TYPE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
              <input
                className="px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none"
                placeholder="이슈 ID (예: NCR-2026-001)"
                value={issueForm.issueId}
                onChange={e => setIssueForm(p => ({ ...p, issueId: e.target.value }))}
              />
              <input
                className="px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none"
                placeholder="표시명 (예: 배선 불량)"
                value={issueForm.issueLabel}
                onChange={e => setIssueForm(p => ({ ...p, issueLabel: e.target.value }))}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowIssueForm(false)}
                className="px-2.5 py-1 text-[10px] text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-100">취소</button>
              <button onClick={addIssueLink}
                className="px-3 py-1 text-[10px] font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">연결</button>
            </div>
          </div>
        )}

        {meeting.issueLinks.length === 0 ? (
          <p className="text-xs text-slate-400 py-2">연결된 이슈가 없습니다.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {meeting.issueLinks.map((link, i) => (
              <div key={i}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-full text-[10px] font-medium text-slate-700">
                <Tag className="w-3 h-3 text-slate-400" />
                <span className="text-indigo-600 font-bold">{ISSUE_TYPE_LABELS[link.issueType] ?? link.issueType}</span>
                <span>{link.issueLabel}</span>
                <span className="text-slate-400">({link.issueId})</span>
                <button onClick={() => removeIssueLink(i)}
                  className="text-slate-300 hover:text-rose-500 transition-colors ml-0.5">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 회의록 본문 */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5 space-y-3">
        <div className="flex items-center justify-between border-b pb-2">
          <h2 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
            <Edit3 className="w-4 h-4 text-indigo-400" /> 회의록 본문
          </h2>
          {(bodyDirty || savedOk) && (
            <button onClick={saveBody} disabled={saving}
              className={`flex items-center gap-1 px-3 py-1 text-[10px] font-bold rounded-lg disabled:opacity-50 transition-all
                ${savedOk ? "bg-emerald-600 text-white" : "bg-indigo-600 text-white hover:bg-indigo-700"}`}>
              <Save className="w-3 h-3" />
              {saving ? "저장 중…" : savedOk ? "저장됨 ✓" : "저장"}
            </button>
          )}
        </div>
        <textarea
          className="w-full min-h-[200px] px-3 py-2 text-sm border border-slate-200 rounded-xl resize-y focus:outline-none focus:ring-2 focus:ring-indigo-300"
          placeholder="회의 내용, 결정사항, 특이사항 등을 자유롭게 기록하세요…"
          value={editBody}
          onChange={e => { setEditBody(e.target.value); setBodyDirty(true) }}
        />
      </div>

      {/* 액션 아이템 */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5 space-y-3">
        <div className="flex items-center justify-between border-b pb-2">
          <h2 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
            <CheckSquare className="w-4 h-4 text-indigo-400" /> 액션 아이템
            {pendingActions.length > 0 && (
              <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[9px] font-extrabold rounded-full">
                미완료 {pendingActions.length}건
              </span>
            )}
          </h2>
          <button onClick={() => setShowActionForm(v => !v)}
            className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
            <Plus className="w-3 h-3" /> 아이템 추가
          </button>
        </div>

        {showActionForm && (
          <form onSubmit={addAction} className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <input
                required
                className="md:col-span-1 px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none"
                placeholder="내용 *"
                value={actionForm.content}
                onChange={e => setActionForm(p => ({ ...p, content: e.target.value }))}
              />
              <input
                required
                className="px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none"
                placeholder="담당자 *"
                value={actionForm.assigneeName}
                onChange={e => setActionForm(p => ({ ...p, assigneeName: e.target.value }))}
              />
              <input
                type="date"
                className="px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none"
                value={actionForm.dueDate}
                onChange={e => setActionForm(p => ({ ...p, dueDate: e.target.value }))}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowActionForm(false)}
                className="px-2.5 py-1 text-[10px] text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-100">취소</button>
              <button type="submit" disabled={addingAction}
                className="px-3 py-1 text-[10px] font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                {addingAction ? "추가 중…" : "추가"}
              </button>
            </div>
          </form>
        )}

        {meeting.actions.length === 0 ? (
          <p className="text-xs text-slate-400 py-2">등록된 액션 아이템이 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {/* 미완료 */}
            {pendingActions.map(action => (
              <div key={action.id}
                className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl group hover:border-indigo-200 transition-all">
                <button onClick={() => toggleDone(action)} className="shrink-0">
                  <Square className="w-4 h-4 text-slate-300 group-hover:text-indigo-400 transition-colors" />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">{action.content}</p>
                  <p className="text-[10px] text-slate-400">담당: {action.assigneeName}</p>
                </div>
                {action.dueDate && (
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border shrink-0 ${getDDayColor(action.dueDate)}`}>
                    {getDDay(action.dueDate)}
                  </span>
                )}
                <button onClick={() => deleteAction(action.id)}
                  className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 transition-all shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {/* 완료된 항목 */}
            {doneActions.map(action => (
              <div key={action.id}
                className="flex items-center gap-3 p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl opacity-60 group">
                <button onClick={() => toggleDone(action)} className="shrink-0">
                  <CheckSquare className="w-4 h-4 text-emerald-500" />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-xs line-through text-slate-400 truncate">{action.content}</p>
                  <p className="text-[10px] text-slate-400">담당: {action.assigneeName}</p>
                </div>
                <button onClick={() => deleteAction(action.id)}
                  className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 transition-all shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
