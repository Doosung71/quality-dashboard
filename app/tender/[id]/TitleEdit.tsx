"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function TitleEdit({ tenderId, title }: { tenderId: string; title: string }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(title)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    const trimmed = value.trim()
    if (!trimmed || trimmed === title) { setEditing(false); return }
    setSaving(true)
    const res = await fetch(`/api/tenders/${tenderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: trimmed }),
    })
    setSaving(false)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      alert((d as { error?: string }).error ?? "수정 실패")
      return
    }
    setEditing(false)
    router.refresh()
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold">{title}</h1>
        <button
          onClick={() => setEditing(true)}
          className="text-xs text-zinc-400 hover:text-zinc-700 border rounded px-1.5 py-0.5"
        >
          제목 편집
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <input
        className="border rounded px-2 py-1 text-sm font-semibold flex-1 min-w-0"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave()
          if (e.key === "Escape") { setEditing(false); setValue(title) }
        }}
        autoFocus
      />
      <button
        onClick={handleSave}
        disabled={saving}
        className="text-xs px-2 py-1 bg-zinc-800 text-white rounded disabled:opacity-50"
      >
        저장
      </button>
      <button
        onClick={() => { setEditing(false); setValue(title) }}
        className="text-xs px-2 py-1 border rounded text-zinc-500"
      >
        취소
      </button>
    </div>
  )
}
