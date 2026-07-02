"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  ClipboardList, Plus, Search, ChevronRight,
  Calendar, Tag, CheckSquare, User
} from "lucide-react"

type MeetingAction = {
  id: string; content: string; assigneeName: string
  dueDate: string | null; done: boolean
}
type Meeting = {
  id: string; title: string; type: string; meetingDate: string; body: string
  createdBy: { name: string; nickname: string | null }
  actions: MeetingAction[]
}

const MEETING_TYPE_LABELS: Record<string, string> = {
  QUALITY_ISSUE:     "품질이슈 회의",
  STANDARD_REVIEW:   "표준검토 회의",
  CHANGE_MANAGEMENT: "변경관리 회의",
  QUALITY_MEETING:   "품질회의",
  OTHER:             "기타",
}
const MEETING_TYPE_COLORS: Record<string, string> = {
  QUALITY_ISSUE:     "bg-rose-50 text-rose-700 border-rose-200",
  STANDARD_REVIEW:   "bg-teal-50 text-teal-700 border-teal-200",
  CHANGE_MANAGEMENT: "bg-amber-50 text-amber-700 border-amber-200",
  QUALITY_MEETING:   "bg-indigo-50 text-indigo-700 border-indigo-200",
  OTHER:             "bg-slate-50 text-slate-600 border-slate-200",
}

type NewForm = { title: string; type: string; meetingDate: string }

export default function MeetingsPage() {
  const [meetings, setMeetings]   = useState<Meeting[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState("")
  const [showForm, setShowForm]   = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState<NewForm>({
    title: "", type: "QUALITY_ISSUE",
    meetingDate: new Date().toISOString().slice(0, 10),
  })

  useEffect(() => {
    fetch("/api/meetings")
      .then(r => r.json())
      .then(data => { setMeetings(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = meetings.filter(m => {
    const q = search.toLowerCase()
    return m.title.toLowerCase().includes(q) ||
      m.body.toLowerCase().includes(q) ||
      MEETING_TYPE_LABELS[m.type]?.includes(search)
  })

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return
    setSubmitting(true)
    const res = await fetch("/api/meetings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      const created: Meeting = await res.json()
      setMeetings(prev => [created, ...prev])
      setShowForm(false)
      setForm({ title: "", type: "QUALITY_ISSUE", meetingDate: new Date().toISOString().slice(0, 10) })
    }
    setSubmitting(false)
  }

  const pendingTotal = meetings.reduce((s, m) => s + m.actions.filter(a => !a.done).length, 0)

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-indigo-500" /> 회의록
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            미완료 액션 아이템 {pendingTotal}건
          </p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-700 transition-all"
        >
          <Plus className="w-3.5 h-3.5" /> 회의 등록
        </button>
      </div>

      {/* 신규 등록 폼 */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5 space-y-4">
          <p className="text-xs font-extrabold text-indigo-700">신규 회의 등록</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              required
              className="col-span-1 md:col-span-1 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="회의명 *"
              value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
            />
            <select
              className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400"
              value={form.type}
              onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
            >
              {Object.entries(MEETING_TYPE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            <input
              type="date"
              className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400"
              value={form.meetingDate}
              onChange={e => setForm(p => ({ ...p, meetingDate: e.target.value }))}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowForm(false)}
              className="px-3 py-1.5 text-xs text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-100">
              취소
            </button>
            <button type="submit" disabled={submitting}
              className="px-4 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50">
              {submitting ? "등록 중…" : "등록"}
            </button>
          </div>
        </form>
      )}

      {/* 검색 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300"
          placeholder="회의명, 본문 내용, 유형으로 검색"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* 목록 */}
      {loading ? (
        <div className="text-center py-16 text-slate-400 text-sm">로딩 중…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-sm">
          {search ? "검색 결과가 없습니다." : "등록된 회의가 없습니다."}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(meeting => {
            const pending = meeting.actions.filter(a => !a.done).length
            const done    = meeting.actions.filter(a => a.done).length
            const dateStr = new Date(meeting.meetingDate).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })
            return (
              <Link
                key={meeting.id}
                href={`/meetings/${meeting.id}`}
                className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${MEETING_TYPE_COLORS[meeting.type] ?? ""}`}>
                        {MEETING_TYPE_LABELS[meeting.type] ?? meeting.type}
                      </span>
                      <p className="text-sm font-bold text-slate-900 truncate">{meeting.title}</p>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {dateStr}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {meeting.createdBy.nickname ?? meeting.createdBy.name}
                      </span>
                      {meeting.actions.length > 0 && (
                        <span className="flex items-center gap-1">
                          <CheckSquare className="w-3 h-3" />
                          액션 {done}/{meeting.actions.length}건 완료
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {pending > 0 && (
                    <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold rounded-full">
                      미완료 {pending}건
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
