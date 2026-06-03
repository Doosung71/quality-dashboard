"use client"

import { useState } from "react"

type Props = {
  name: string
  department: string | null
  employeeId: string | null
  phone: string | null
}

function formatPhone(value: string): string {
  const d = value.replace(/\D/g, "")
  if (d.startsWith("02")) {
    if (d.length <= 2) return d
    if (d.length <= 5) return `${d.slice(0, 2)}-${d.slice(2)}`
    if (d.length <= 9) return `${d.slice(0, 2)}-${d.slice(2, 5)}-${d.slice(5)}`
    return `${d.slice(0, 2)}-${d.slice(2, 6)}-${d.slice(6, 10)}`
  }
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}-${d.slice(3)}`
  if (d.length <= 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7, 11)}`
}

export default function ProfileInfoForm({ name, department, employeeId, phone }: Props) {
  const fmtPhone = formatPhone(phone ?? "")
  const [form, setForm] = useState({ name, department: department ?? "", employeeId: employeeId ?? "", phone: fmtPhone })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const dirty =
    form.name !== name ||
    form.department !== (department ?? "") ||
    form.employeeId !== (employeeId ?? "") ||
    form.phone !== fmtPhone

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(""); setSuccess(false); setLoading(true)
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    setLoading(false)
    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? "저장 중 오류가 발생했습니다.")
    } else {
      setSuccess(true)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {[
        { label: "이름", key: "name", required: true },
        { label: "부서", key: "department" },
        { label: "사번", key: "employeeId" },
        { label: "연락처", key: "phone" },
      ].map(({ label, key, required }) => (
        <div key={key} className="flex items-center gap-3">
          <span className="w-16 text-zinc-500 text-sm shrink-0">{label}</span>
          <input
            type="text"
            value={form[key as keyof typeof form]}
            onChange={e => {
              const val = key === "phone" ? formatPhone(e.target.value) : e.target.value
              setForm(prev => ({ ...prev, [key]: val }))
            }}
            required={required}
            placeholder={required ? "필수 항목" : "미입력"}
            className="flex-1 border border-zinc-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400/30"
          />
        </div>
      ))}
      {error && <p className="text-xs text-red-500">{error}</p>}
      {success && <p className="text-xs text-emerald-600">저장됐습니다. 다시 로그인하면 헤더 이름이 반영됩니다.</p>}
      {dirty && (
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-slate-800 text-white rounded-lg py-2 text-sm font-medium hover:bg-slate-700 disabled:opacity-50 transition-colors mt-1">
          {loading ? "저장 중..." : "변경사항 저장"}
        </button>
      )}
    </form>
  )
}
