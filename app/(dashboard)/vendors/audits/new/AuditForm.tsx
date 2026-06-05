"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

type Vendor = { id: string; name: string }

export default function AuditForm({ vendors, defaultAuditor }: { vendors: Vendor[]; defaultAuditor: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [form, setForm] = useState({
    vendorId:  "",
    auditDate: new Date().toISOString().slice(0, 10),
    auditType: "PERIODIC",
    auditor:   defaultAuditor,
    location:  "",
    status:    "PLANNED",
  })

  function set(key: string, val: string) { setForm(f => ({ ...f, [key]: val })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.vendorId) { setError("협력업체를 선택해주세요."); return }
    setLoading(true); setError("")
    try {
      const vendor = vendors.find(v => v.id === form.vendorId)
      const res = await fetch("/api/supplier-audits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, vendorName: vendor?.name ?? "" }),
      })
      if (!res.ok) { const j = await res.json() as { error?: string }; throw new Error(j.error ?? "등록 실패") }
      const { id } = await res.json() as { id: string }
      router.push(`/vendors/audits/${id}`)
    } catch (err) {
      setError((err as Error).message)
      setLoading(false)
    }
  }

  const field = "w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
  const label = "text-xs font-semibold text-slate-700 block mb-1.5"

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="sm:col-span-2">
          <label className={label}>협력업체 *</label>
          <select value={form.vendorId} onChange={e => set("vendorId", e.target.value)} className={field} required>
            <option value="">-- 협력업체 선택 --</option>
            {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>

        <div>
          <label className={label}>감사 일자 *</label>
          <input type="date" value={form.auditDate} onChange={e => set("auditDate", e.target.value)} className={field} required />
        </div>

        <div>
          <label className={label}>감사 유형 *</label>
          <select value={form.auditType} onChange={e => set("auditType", e.target.value)} className={field}>
            <option value="INITIAL">초기 심사</option>
            <option value="PERIODIC">정기 심사</option>
            <option value="FOLLOW_UP">사후관리 심사</option>
            <option value="SPECIAL">특별 심사</option>
          </select>
        </div>

        <div>
          <label className={label}>감사자 *</label>
          <input type="text" value={form.auditor} onChange={e => set("auditor", e.target.value)} className={field} placeholder="홍길동" required />
        </div>

        <div>
          <label className={label}>감사 장소</label>
          <input type="text" value={form.location} onChange={e => set("location", e.target.value)} className={field} placeholder="협력업체 공장 (울산)" />
        </div>

        <div>
          <label className={label}>상태</label>
          <select value={form.status} onChange={e => set("status", e.target.value)} className={field}>
            <option value="PLANNED">예정</option>
            <option value="COMPLETED">완료</option>
          </select>
        </div>
      </div>

      {error && <p className="text-xs text-rose-600">{error}</p>}

      <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
        <button type="button" onClick={() => router.back()} className="px-4 py-2 text-xs text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">
          취소
        </button>
        <button type="submit" disabled={loading} className="px-5 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
          {loading ? "등록 중..." : "감사 등록"}
        </button>
      </div>
    </form>
  )
}
