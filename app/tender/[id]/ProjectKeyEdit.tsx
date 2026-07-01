"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Link2 } from "lucide-react"
import { ProjectKeyInput } from "@/components/ui/project-key-input"
import { parseProjectKeyInput } from "@/lib/project-key"

// 입찰 상세의 project_key 인라인 편집 (TitleEdit 패턴 + ProjectKeyInput 재사용).
// 이 키로 같은 project_key의 과거 NCR·클레임·확정교훈이 아래 패널에 surface된다.
// 선택 필드: 비우면 키 없음(fail-open). 소유자(canEdit)만 편집, 그 외 읽기 전용 칩.
export default function ProjectKeyEdit({
  tenderId,
  projectKey,
  canEdit,
}: {
  tenderId: string
  projectKey: string | null
  canEdit: boolean
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(projectKey ?? "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    // 클라 검증 (fail-closed): 값이 있는데 형식이 틀리면 저장 차단.
    const parsed = parseProjectKeyInput(value)
    if (parsed.invalid) {
      setError("소문자·숫자·하이픈만 사용하세요 (kebab-case)")
      return
    }
    setSaving(true)
    setError(null)
    const res = await fetch(`/api/tenders/${tenderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectKey: parsed.value }),
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

  // 읽기 전용 (비소유자) — 키 있을 때만 칩 표시
  if (!canEdit) {
    if (!projectKey) return null
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 border border-indigo-100 rounded-md text-[10px] font-bold text-indigo-700 font-mono">
        <Link2 className="w-3 h-3" /> {projectKey}
      </span>
    )
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        {projectKey ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 border border-indigo-100 rounded-md text-[10px] font-bold text-indigo-700 font-mono">
            <Link2 className="w-3 h-3" /> {projectKey}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 font-semibold">
            <Link2 className="w-3 h-3" /> 프로젝트 키 없음
          </span>
        )}
        <button
          onClick={() => { setEditing(true); setError(null) }}
          className="text-[10px] text-slate-400 hover:text-indigo-600 border rounded px-1.5 py-0.5"
        >
          {projectKey ? "키 편집" : "+ 키 연결"}
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1 max-w-xs">
          <ProjectKeyInput
            value={value}
            onChange={(v) => { setValue(v); setError(null) }}
            inputClassName="w-full border rounded px-2 py-1 text-xs font-mono"
            id={`tender-project-key-${tenderId}`}
          />
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="text-[11px] px-2 py-1 bg-indigo-600 text-white rounded disabled:opacity-50 font-bold shrink-0"
        >
          저장
        </button>
        <button
          onClick={() => { setEditing(false); setValue(projectKey ?? ""); setError(null) }}
          className="text-[11px] px-2 py-1 border rounded text-slate-500 shrink-0"
        >
          취소
        </button>
      </div>
      {error && <span className="text-[11px] text-red-600">{error}</span>}
      <span className="text-[10px] text-slate-400">
        같은 키의 과거 NCR·클레임·확정 교훈이 아래에 표시됩니다. 기존 키를 재사용하세요.
      </span>
    </div>
  )
}
