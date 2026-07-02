"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Tag, Globe2 } from "lucide-react"

// 입찰 상세의 SPG·시장 권역 인라인 편집 (ProjectKeyEdit 패턴 재사용).
// 둘 다 자유입력 선택 필드(fail-open) — E2E-1 피드백 #28, 데이터 축적 후 고정목록화 예정.
export default function SpgMarketEdit({
  tenderId,
  spg,
  marketRegion,
  canEdit,
}: {
  tenderId: string
  spg: string | null
  marketRegion: string | null
  canEdit: boolean
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [spgValue, setSpgValue] = useState(spg ?? "")
  const [regionValue, setRegionValue] = useState(marketRegion ?? "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setSaving(true)
    setError(null)
    const res = await fetch(`/api/tenders/${tenderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ spg: spgValue.trim(), marketRegion: regionValue.trim() }),
    })
    setSaving(false)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError((d as { error?: string }).error ?? "저장 실패")
      return
    }
    setEditing(false)
    router.refresh()
  }

  if (!canEdit) {
    if (!spg && !marketRegion) return null
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        {spg && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 border border-indigo-100 rounded-md text-[10px] font-bold text-indigo-700">
            <Tag className="w-3 h-3" /> {spg}
          </span>
        )}
        {marketRegion && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-sky-50 border border-sky-100 rounded-md text-[10px] font-bold text-sky-700">
            <Globe2 className="w-3 h-3" /> {marketRegion}
          </span>
        )}
      </div>
    )
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {spg && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 border border-indigo-100 rounded-md text-[10px] font-bold text-indigo-700">
            <Tag className="w-3 h-3" /> {spg}
          </span>
        )}
        {marketRegion && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-sky-50 border border-sky-100 rounded-md text-[10px] font-bold text-sky-700">
            <Globe2 className="w-3 h-3" /> {marketRegion}
          </span>
        )}
        {!spg && !marketRegion && (
          <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 font-semibold">
            <Tag className="w-3 h-3" /> SPG·권역 없음
          </span>
        )}
        <button
          onClick={() => { setEditing(true); setError(null) }}
          className="text-[10px] text-slate-400 hover:text-indigo-600 border rounded px-1.5 py-0.5"
        >
          {spg || marketRegion ? "편집" : "+ SPG/권역 입력"}
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2 flex-wrap">
        <input
          value={spgValue}
          onChange={(e) => { setSpgValue(e.target.value); setError(null) }}
          placeholder="SPG (예: 지중케이블)"
          className="border rounded px-2 py-1 text-xs w-36"
        />
        <input
          value={regionValue}
          onChange={(e) => { setRegionValue(e.target.value); setError(null) }}
          placeholder="시장 권역 (예: 대만)"
          className="border rounded px-2 py-1 text-xs w-36"
        />
        <button
          onClick={handleSave}
          disabled={saving}
          className="text-[11px] px-2 py-1 bg-indigo-600 text-white rounded disabled:opacity-50 font-bold shrink-0"
        >
          저장
        </button>
        <button
          onClick={() => { setEditing(false); setSpgValue(spg ?? ""); setRegionValue(marketRegion ?? ""); setError(null) }}
          className="text-[11px] px-2 py-1 border rounded text-slate-500 shrink-0"
        >
          취소
        </button>
      </div>
      {error && <span className="text-[11px] text-red-600">{error}</span>}
    </div>
  )
}
