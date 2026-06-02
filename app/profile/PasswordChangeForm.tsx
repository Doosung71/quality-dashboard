"use client"

import { useState } from "react"

export default function PasswordChangeForm() {
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSuccess(false)
    if (next !== confirm) { setError("새 비밀번호가 일치하지 않습니다."); return }
    setLoading(true)
    const res = await fetch("/api/profile/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: current, newPassword: next }),
    })
    setLoading(false)
    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? "변경 중 오류가 발생했습니다.")
    } else {
      setSuccess(true)
      setCurrent(""); setNext(""); setConfirm("")
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {[
        { label: "현재 비밀번호", value: current, onChange: setCurrent },
        { label: "새 비밀번호", value: next, onChange: setNext },
        { label: "새 비밀번호 확인", value: confirm, onChange: setConfirm },
      ].map(({ label, value, onChange }) => (
        <div key={label}>
          <label className="block text-xs font-medium text-zinc-500 mb-1">{label}</label>
          <input
            type="password"
            value={value}
            onChange={e => onChange(e.target.value)}
            required
            className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
      ))}
      {error && <p className="text-xs text-red-500">{error}</p>}
      {success && <p className="text-xs text-emerald-600">비밀번호가 변경되었습니다.</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-slate-800 text-white rounded-lg py-2 text-sm font-medium hover:bg-slate-700 disabled:opacity-50 transition-colors"
      >
        {loading ? "변경 중..." : "비밀번호 변경"}
      </button>
    </form>
  )
}
