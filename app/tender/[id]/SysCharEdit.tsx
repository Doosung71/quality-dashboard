"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

type Fields = {
  voltage: string | null
  bilSil: string | null
  shortCircuit: string | null
  installCond: string | null
  groundConfig: string | null
  requiredCapacity: string | null
}

const LABELS: { key: keyof Fields; label: string }[] = [
  { key: "voltage", label: "전압" },
  { key: "bilSil", label: "BIL/SIL" },
  { key: "shortCircuit", label: "단락용량" },
  { key: "installCond", label: "포설 조건" },
  { key: "groundConfig", label: "접지 구성" },
  { key: "requiredCapacity", label: "요구 용량" },
]

type Props = { analysisId: string; fields: Fields }

export default function SysCharEdit({ analysisId, fields }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [values, setValues] = useState<Fields>(fields)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    const res = await fetch(`/api/analysis/${analysisId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    })
    setSaving(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      alert((data as { error?: string }).error ?? "저장 실패")
      return
    }
    setEditing(false)
    router.refresh()
  }

  if (!editing) {
    return (
      <div className="flex justify-end mb-2">
        <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
          시스템 특성 편집
        </Button>
      </div>
    )
  }

  return (
    <div className="bg-zinc-50 border rounded-lg p-4 space-y-3">
      <p className="text-sm font-medium text-zinc-700">시스템 특성 편집</p>
      <div className="grid grid-cols-2 gap-3">
        {LABELS.map(({ key, label }) => (
          <div key={key}>
            <label className="text-xs text-zinc-500 block mb-1">{label}</label>
            <input
              className="w-full border rounded px-2 py-1 text-sm"
              value={values[key] ?? ""}
              placeholder="없음"
              onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value || null }))}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-2 pt-1">
        <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? "저장 중…" : "저장"}</Button>
        <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setValues(fields) }}>취소</Button>
      </div>
    </div>
  )
}
