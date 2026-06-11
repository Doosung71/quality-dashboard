"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { CheckSquare, Square, Calendar, ArrowRight, ClipboardList } from "lucide-react"

type MeetingInfo = { id: string; title: string; type: string; meetingDate: string }
type ActionItem  = {
  id: string; content: string; assigneeName: string
  dueDate: string | null; done: boolean
  meeting: MeetingInfo
}

const MEETING_TYPE_LABELS: Record<string, string> = {
  QUALITY_ISSUE: "품질이슈", STANDARD_REVIEW: "표준검토",
  CHANGE_MANAGEMENT: "변경관리", QUALITY_MEETING: "품질회의", OTHER: "기타",
}

function getDDay(dateStr: string | null): { label: string; color: string } | null {
  if (!dateStr) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const due   = new Date(dateStr); due.setHours(0, 0, 0, 0)
  const diff  = Math.round((due.getTime() - today.getTime()) / 86400000)
  const label = diff < 0 ? `D+${Math.abs(diff)}` : diff === 0 ? "D-Day" : `D-${diff}`
  const color = diff < 0
    ? "bg-rose-50 text-rose-700 border-rose-200"
    : diff <= 3
    ? "bg-amber-50 text-amber-700 border-amber-200"
    : "bg-emerald-50 text-emerald-700 border-emerald-200"
  return { label, color }
}

export default function MyJobPage() {
  const [actions, setActions]   = useState<ActionItem[]>([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState<"all" | "pending" | "done">("pending")

  useEffect(() => {
    fetch("/api/my-job")
      .then(r => r.json())
      .then(data => { setActions(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function toggleDone(action: ActionItem) {
    const res = await fetch(`/api/meetings/${action.meeting.id}/actions`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actionId: action.id, done: !action.done }),
    })
    if (res.ok) {
      setActions(prev => prev.map(a =>
        a.id === action.id ? { ...a, done: !a.done } : a
      ))
    }
  }

  const filtered = actions.filter(a =>
    filter === "all"     ? true :
    filter === "pending" ? !a.done :
    a.done
  )

  const pendingCount = actions.filter(a => !a.done).length
  const doneCount    = actions.filter(a => a.done).length

  // 날짜별로 그룹핑
  const overdue  = filtered.filter(a => !a.done && a.dueDate && new Date(a.dueDate) < new Date(new Date().toDateString()))
  const today    = filtered.filter(a => {
    if (a.done) return false
    if (!a.dueDate) return false
    const d = new Date(a.dueDate).toDateString()
    return d === new Date().toDateString()
  })
  const upcoming = filtered.filter(a => {
    if (a.done) return false
    if (!a.dueDate) return true
    const due = new Date(a.dueDate); due.setHours(0,0,0,0)
    const tdy = new Date(); tdy.setHours(0,0,0,0)
    return due > tdy
  })
  const completed = filtered.filter(a => a.done)

  function ActionCard({ action }: { action: ActionItem }) {
    const dday = getDDay(action.dueDate)
    return (
      <div className={`flex items-start gap-3 p-3.5 border rounded-xl group transition-all hover:shadow-sm
        ${action.done ? "bg-slate-50/50 border-slate-100 opacity-60" : "bg-white border-slate-100 hover:border-indigo-200"}`}>
        <button onClick={() => toggleDone(action)} className="shrink-0 mt-0.5">
          {action.done
            ? <CheckSquare className="w-4 h-4 text-emerald-500" />
            : <Square className="w-4 h-4 text-slate-300 group-hover:text-indigo-400 transition-colors" />}
        </button>
        <div className="flex-1 min-w-0 space-y-1">
          <p className={`text-xs font-bold ${action.done ? "line-through text-slate-400" : "text-slate-900"}`}>
            {action.content}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] text-slate-400">담당: {action.assigneeName}</span>
            <Link href={`/meetings/${action.meeting.id}`}
              className="text-[10px] text-indigo-500 hover:underline flex items-center gap-0.5">
              <ClipboardList className="w-3 h-3" />
              {action.meeting.title}
              <ArrowRight className="w-2.5 h-2.5" />
            </Link>
            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[9px] font-medium rounded border border-slate-200">
              {MEETING_TYPE_LABELS[action.meeting.type] ?? action.meeting.type}
            </span>
          </div>
        </div>
        {dday && !action.done && (
          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border shrink-0 ${dday.color}`}>
            {dday.label}
          </span>
        )}
        {action.dueDate && (
          <span className="text-[10px] text-slate-400 shrink-0 flex items-center gap-0.5">
            <Calendar className="w-3 h-3" />
            {new Date(action.dueDate).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-indigo-500" /> 내 할 일
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            미완료 {pendingCount}건 · 완료 {doneCount}건
          </p>
        </div>
        <Link href="/meetings"
          className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
          <ClipboardList className="w-3.5 h-3.5" /> 회의록 보기
        </Link>
      </div>

      {/* 필터 탭 */}
      <div className="flex gap-2">
        {([["pending","미완료"], ["all","전체"], ["done","완료"]] as const).map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all border
              ${filter === v
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-500 border-slate-200 hover:border-slate-400"}`}>
            {l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400 text-sm">로딩 중…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-sm">
          {filter === "pending" ? "미완료 액션 아이템이 없습니다. 👍" : "항목이 없습니다."}
        </div>
      ) : (
        <div className="space-y-5">
          {filter !== "done" && (
            <>
              {overdue.length > 0 && (
                <section className="space-y-2">
                  <p className="text-[10px] font-extrabold text-rose-600 uppercase tracking-widest">기한 초과</p>
                  {overdue.map(a => <ActionCard key={a.id} action={a} />)}
                </section>
              )}
              {today.length > 0 && (
                <section className="space-y-2">
                  <p className="text-[10px] font-extrabold text-amber-600 uppercase tracking-widest">오늘 마감</p>
                  {today.map(a => <ActionCard key={a.id} action={a} />)}
                </section>
              )}
              {upcoming.length > 0 && (
                <section className="space-y-2">
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">예정</p>
                  {upcoming.map(a => <ActionCard key={a.id} action={a} />)}
                </section>
              )}
            </>
          )}
          {filter !== "pending" && completed.length > 0 && (
            <section className="space-y-2">
              <p className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-widest">완료</p>
              {completed.map(a => <ActionCard key={a.id} action={a} />)}
            </section>
          )}
        </div>
      )}
    </div>
  )
}
