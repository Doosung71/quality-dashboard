"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export type HistoryEntry = {
  id: string
  action: string
  reason: string
  userName: string
  createdAt: string
}

export type ReplyEntry = {
  id: string
  content: string
  userName: string
  createdAt: string
}

export type CommentEntry = {
  id: string
  content: string
  userName: string
  createdAt: string
  replies: ReplyEntry[]
}

type Props = {
  analysisId: string
  history: HistoryEntry[]
  comments: CommentEntry[]
}

const ACTION_LABEL: Record<string, string> = {
  SUBMIT_FOR_REVIEW: "검토 요청",
  REVIEW_APPROVE:    "팀장 승인",
  REVIEW_REJECT:     "팀장 반려",
  FINAL_APPROVE:     "부문장 최종 승인",
  FINAL_REJECT:      "부문장 반려",
}

const ACTION_COLOR: Record<string, string> = {
  REVIEW_APPROVE: "border-green-400 bg-green-50",
  FINAL_APPROVE:  "border-green-500 bg-green-50",
  REVIEW_REJECT:  "border-red-400 bg-red-50",
  FINAL_REJECT:   "border-red-500 bg-red-50",
  SUBMIT_FOR_REVIEW: "border-blue-400 bg-blue-50",
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return "방금"
  if (m < 60) return `${m}분 전`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}시간 전`
  return `${Math.floor(h / 24)}일 전`
}

export default function TenderThread({ analysisId, history, comments }: Props) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)
  const [newText, setNewText] = useState("")
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState("")
  const [posting, setPosting] = useState(false)

  type TimelineItem =
    | { kind: "history"; data: HistoryEntry }
    | { kind: "comment"; data: CommentEntry }

  const timeline: TimelineItem[] = [
    ...history.map((h) => ({ kind: "history" as const, data: h })),
    ...comments.map((c) => ({ kind: "comment" as const, data: c })),
  ].sort((a, b) => new Date(a.data.createdAt).getTime() - new Date(b.data.createdAt).getTime())

  const totalActivity =
    history.length + comments.reduce((n, c) => n + 1 + c.replies.length, 0)

  async function postComment(content: string, parentId?: string) {
    if (!content.trim()) return
    setPosting(true)
    await fetch(`/api/analysis/${analysisId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: content.trim(), parentId: parentId ?? null }),
    })
    setPosting(false)
    setNewText("")
    setReplyText("")
    setReplyTo(null)
    router.refresh()
  }

  return (
    <div className="mt-2 pt-2 border-t border-zinc-100">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="text-xs text-zinc-400 hover:text-zinc-600 select-none"
      >
        {expanded ? "▲ 접기" : `▼ 활동 ${totalActivity}건`}
      </button>

      {expanded && (
        <div className="mt-3 space-y-2">
          {timeline.length === 0 && (
            <p className="text-xs text-zinc-400">활동 내역이 없습니다.</p>
          )}

          {timeline.map((item) =>
            item.kind === "history" ? (
              <div
                key={item.data.id}
                className={`text-xs border-l-2 pl-3 py-1 rounded-r ${ACTION_COLOR[item.data.action] ?? "border-zinc-300 bg-zinc-50"}`}
              >
                <span className="font-medium text-zinc-700">
                  {ACTION_LABEL[item.data.action] ?? item.data.action}
                </span>
                <span className="text-zinc-400 ml-2">{item.data.userName}</span>
                <span className="text-zinc-400 ml-2">{relativeTime(item.data.createdAt)}</span>
                <p className="mt-0.5 text-zinc-600 whitespace-pre-wrap">{item.data.reason}</p>
              </div>
            ) : (
              <div key={item.data.id} className="text-xs space-y-1">
                <div className="flex gap-2">
                  <div className="w-5 h-5 rounded-full bg-zinc-200 flex items-center justify-center text-zinc-500 shrink-0 text-[10px] font-medium">
                    {item.data.userName.slice(0, 1)}
                  </div>
                  <div className="flex-1 bg-zinc-50 rounded-md px-2.5 py-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-zinc-700">{item.data.userName}</span>
                      <span className="text-zinc-400">{relativeTime(item.data.createdAt)}</span>
                    </div>
                    <p className="mt-0.5 text-zinc-600 whitespace-pre-wrap">{item.data.content}</p>
                    <button
                      className="mt-1 text-zinc-400 hover:text-zinc-600"
                      onClick={() => {
                        setReplyTo(replyTo === item.data.id ? null : item.data.id)
                        setReplyText("")
                      }}
                    >
                      답글
                    </button>
                  </div>
                </div>

                {replyTo === item.data.id && (
                  <div className="ml-7 flex gap-1.5">
                    <input
                      autoFocus
                      className="flex-1 border rounded px-2 py-1 text-xs"
                      placeholder="답글 입력…"
                      value={replyText}
                      disabled={posting}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); postComment(replyText, item.data.id) }
                        if (e.key === "Escape") { setReplyTo(null); setReplyText("") }
                      }}
                    />
                    <button
                      disabled={posting || !replyText.trim()}
                      onClick={() => postComment(replyText, item.data.id)}
                      className="px-2 py-1 bg-zinc-800 text-white rounded text-xs disabled:opacity-40"
                    >
                      등록
                    </button>
                    <button
                      onClick={() => { setReplyTo(null); setReplyText("") }}
                      className="px-2 py-1 border rounded text-xs text-zinc-500"
                    >
                      취소
                    </button>
                  </div>
                )}

                {item.data.replies.map((r) => (
                  <div key={r.id} className="ml-7 flex gap-2">
                    <div className="w-4 h-4 rounded-full bg-zinc-200 flex items-center justify-center text-zinc-500 shrink-0 text-[9px] font-medium mt-0.5">
                      {r.userName.slice(0, 1)}
                    </div>
                    <div className="flex-1 bg-zinc-50 rounded-md px-2 py-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-zinc-700">{r.userName}</span>
                        <span className="text-zinc-400">{relativeTime(r.createdAt)}</span>
                      </div>
                      <p className="mt-0.5 text-zinc-600 whitespace-pre-wrap">{r.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          <div className="flex gap-1.5 pt-1">
            <input
              className="flex-1 border rounded px-2 py-1.5 text-xs"
              placeholder="댓글 작성…"
              value={newText}
              disabled={posting}
              onChange={(e) => setNewText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); postComment(newText) }
              }}
            />
            <button
              disabled={posting || !newText.trim()}
              onClick={() => postComment(newText)}
              className="px-2.5 py-1.5 bg-zinc-800 text-white rounded text-xs disabled:opacity-40"
            >
              등록
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
