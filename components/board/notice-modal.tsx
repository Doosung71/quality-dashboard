"use client"

import { useState, useEffect } from "react"
import { AlertTriangle, CheckCircle2 } from "lucide-react"
import { MarkdownContent } from "@/components/ui/markdown-content"
import { ACK_KEY, getUnacknowledgedNotice, type PinnedNotice, type BoardPost } from "./notice-modal.utils"

export function NoticeModal() {
  const [notice, setNotice] = useState<PinnedNotice | null>(null)

  useEffect(() => {
    fetch("/api/board")
      .then(r => r.ok ? r.json() : [])
      .then((posts: BoardPost[]) => {
        const unacked = getUnacknowledgedNotice(posts, k => localStorage.getItem(k))
        if (unacked) setNotice(unacked)
      })
      .catch(() => {})
  }, [])

  function acknowledge() {
    if (notice) localStorage.setItem(ACK_KEY(notice.id), "1")
    setNotice(null)
  }

  if (!notice) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-amber-100 bg-amber-50 rounded-t-2xl shrink-0">
          <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wide">시스템 공지</p>
            <h2 className="text-sm font-bold text-amber-900 leading-tight">{notice.title}</h2>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <MarkdownContent content={notice.content} />
        </div>
        <div className="px-6 py-4 border-t border-slate-100 shrink-0">
          <button
            onClick={acknowledge}
            className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-semibold py-2.5 rounded-xl transition-colors"
          >
            <CheckCircle2 className="w-4 h-4" />
            확인했습니다
          </button>
        </div>
      </div>
    </div>
  )
}
