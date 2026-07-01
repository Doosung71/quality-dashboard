"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function RegisterPage() {
  const router = useRouter()
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    const fd = new FormData(e.currentTarget)
    const department = String(fd.get("department") ?? "").trim()
    if (!department) {
      setError("부서명을 입력해주세요.")
      return
    }
    setLoading(true)
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fd.get("name"),
        email: fd.get("email"),
        password: fd.get("password"),
        department,
        employeeId: fd.get("employeeId"),
      }),
    })
    setLoading(false)
    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? "가입 신청 중 오류가 발생했습니다.")
    } else {
      router.push("/pending")
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-xs text-slate-400 uppercase tracking-widest">LS전선</p>
          <h1 className="text-xl font-bold text-slate-800 mt-1">가입 신청</h1>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { name: "name", label: "이름", type: "text", required: true },
              { name: "email", label: "이메일", type: "email", required: true },
              { name: "password", label: "비밀번호", type: "password", required: true },
              { name: "department", label: "부서", type: "text", required: true },
              { name: "employeeId", label: "사번", type: "text", required: false },
            ].map(({ name, label, type, required }) => (
              <div key={name}>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  {label}{required && <span className="text-red-400 ml-0.5">*</span>}
                </label>
                <input name={name} type={type} required={required}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              </div>
            ))}
            {error && <p className="text-xs text-red-500">{error}</p>}
            <p className="text-xs text-slate-400">가입 신청 후 관리자 승인이 필요합니다. 역할은 관리자가 부여합니다.</p>
            <button type="submit" disabled={loading}
              className="w-full bg-slate-800 text-white rounded-lg py-2 text-sm font-medium hover:bg-slate-700 disabled:opacity-50 transition-colors">
              {loading ? "신청 중..." : "가입 신청"}
            </button>
          </form>
          <p className="text-center text-xs text-slate-400 mt-4">
            이미 계정이 있으신가요?{" "}
            <Link href="/login" className="text-blue-600 hover:underline">로그인</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
