"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Megaphone, X, ChevronRight } from "lucide-react"

interface PinnedNotice {
  id: string
  title: string
}

const STORAGE_KEY = (id: string) => `notice-dismissed-${id}`

export function NoticeBanner() {
  const [notice, setNotice] = useState<PinnedNotice | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    fetch("/api/board")
      .then(r => r.ok ? r.json() : [])
      .then((posts: Array<{ id: string; title: string; category: string; pinned: boolean }>) => {
        const pinned = posts.find(p => p.category === "NOTICE" && p.pinned)
        if (!pinned) return
        if (sessionStorage.getItem(STORAGE_KEY(pinned.id))) return
        setNotice({ id: pinned.id, title: pinned.title })
        setVisible(true)
      })
      .catch(() => {})
  }, [])

  function dismiss() {
    if (notice) sessionStorage.setItem(STORAGE_KEY(notice.id), "1")
    setVisible(false)
  }

  if (!visible || !notice) return null

  return (
    <div className="mx-4 mt-4 lg:mx-6 lg:mt-6 mb-0">
      <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 shadow-sm">
        <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
          <Megaphone className="w-3.5 h-3.5 text-amber-600" />
        </div>
        <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full shrink-0">
          공지사항
        </span>
        <Link
          href="/board"
          onClick={dismiss}
          className="flex-1 min-w-0 text-sm font-medium text-amber-900 hover:text-amber-700 hover:underline truncate transition-colors"
        >
          {notice.title}
        </Link>
        <Link
          href="/board"
          onClick={dismiss}
          className="flex items-center gap-0.5 text-xs font-semibold text-amber-700 hover:text-amber-900 shrink-0 transition-colors"
        >
          자세히 <ChevronRight className="w-3.5 h-3.5" />
        </Link>
        <button
          onClick={dismiss}
          className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-amber-100 text-amber-500 hover:text-amber-700 transition-colors shrink-0"
          aria-label="닫기"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
