"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

type Vendor = { id: string; name: string; location: string }

export default function QpaNewForm({
  vendors,
  defaultAuditor,
}: {
  vendors: Vendor[]
  defaultAuditor: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState("")

  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState({
    vendorId:     "",
    auditDate:    today,
    partName:     "",
    location:     "",
    auditorNames: defaultAuditor,
  })

  function set(key: string, val: string) {
    setForm(f => ({ ...f, [key]: val }))
  }

  function onVendorChange(id: string) {
    const v = vendors.find(v => v.id === id)
    setForm(f => ({ ...f, vendorId: id, location: v?.location ?? f.location }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.vendorId) { setError("협력업체를 선택해주세요."); return }
    setLoading(true); setError("")
    try {
      const vendor = vendors.find(v => v.id === form.vendorId)
      const res = await fetch("/api/qpa-audits", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ ...form, vendorName: vendor?.name ?? "" }),
      })
      if (!res.ok) {
        const j = await res.json() as { error?: string }
        throw new Error(j.error ?? "등록 실패")
      }
      const { id } = await res.json() as { id: string }
      router.push(`/vendors/qpa/${id}`)
    } catch (err) {
      setError((err as Error).message)
      setLoading(false)
    }
  }

  const field = "w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
  const lbl   = "text-xs font-semibold text-slate-700 block mb-1.5"

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="sm:col-span-2">
          <label className={lbl}>협력업체 *</label>
          <select
            value={form.vendorId}
            onChange={e => onVendorChange(e.target.value)}
            className={field}
            required
          >
            <option value="">-- 협력업체 선택 --</option>
            {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>

        <div>
          <label className={lbl}>감사 일자 *</label>
          <input
            type="date"
            value={form.auditDate}
            onChange={e => set("auditDate", e.target.value)}
            className={field}
            required
          />
        </div>

        <div>
          <label className={lbl}>품명</label>
          <input
            type="text"
            value={form.partName}
            onChange={e => set("partName", e.target.value)}
            className={field}
            placeholder="예: XLPE 절연전선 (소방용)"
          />
        </div>

        <div>
          <label className={lbl}>위치 (감사 장소)</label>
          <input
            type="text"
            value={form.location}
            onChange={e => set("location", e.target.value)}
            className={field}
            placeholder="협력업체 선택 시 자동 채워집니다"
          />
        </div>

        <div>
          <label className={lbl}>감사자</label>
          <input
            type="text"
            value={form.auditorNames}
            onChange={e => set("auditorNames", e.target.value)}
            className={field}
            placeholder="홍길동 팀장, 김철수 대리"
          />
        </div>
      </div>

      <div className="rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 text-xs text-blue-700">
        등록 즉시 LSC QPA 1.0 체크리스트 <strong>47개 항목</strong>이 자동 생성됩니다.
      </div>

      {error && <p className="text-xs text-rose-600">{error}</p>}

      <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 text-xs text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? "생성 중..." : "감사 등록"}
        </button>
      </div>
    </form>
  )
}
