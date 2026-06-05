"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

type Vendor = { id: string; name: string }

export default function InspectionForm({ vendors, defaultInspector }: { vendors: Vendor[]; defaultInspector: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [form, setForm] = useState({
    vendorId:       "",
    inspectionDate: new Date().toISOString().slice(0, 10),
    location:       "",
    itemName:       "",
    itemCode:       "",
    quantity:       "",
    sampleSize:     "",
    result:         "PASS",
    defectCount:    "",
    inspector:      defaultInspector,
    notes:          "",
  })

  function set(key: string, val: string) { setForm(f => ({ ...f, [key]: val })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.vendorId) { setError("협력업체를 선택해주세요."); return }
    if (!form.itemName) { setError("검사 품목명을 입력해주세요."); return }
    if (!form.quantity) { setError("수량을 입력해주세요."); return }
    setLoading(true); setError("")
    try {
      const vendor = vendors.find(v => v.id === form.vendorId)
      const qty = parseInt(form.quantity)
      const sampleSz = form.sampleSize ? parseInt(form.sampleSize) : null
      const defCnt = form.defectCount ? parseInt(form.defectCount) : null
      const defRate = (defCnt != null && sampleSz) ? (defCnt / sampleSz) * 100 : null

      const res = await fetch("/api/source-inspections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorId:       form.vendorId,
          vendorName:     vendor?.name ?? "",
          inspectionDate: form.inspectionDate,
          location:       form.location || null,
          itemName:       form.itemName,
          itemCode:       form.itemCode || null,
          quantity:       qty,
          sampleSize:     sampleSz,
          result:         form.result,
          defectCount:    defCnt,
          defectRate:     defRate,
          inspector:      form.inspector,
          notes:          form.notes || null,
        }),
      })
      if (!res.ok) { const j = await res.json() as { error?: string }; throw new Error(j.error ?? "등록 실패") }
      const { id } = await res.json() as { id: string }
      router.push(`/vendors/inspections/${id}`)
    } catch (err) {
      setError((err as Error).message)
      setLoading(false)
    }
  }

  const field = "w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
          <label className={label}>검사 일자 *</label>
          <input type="date" value={form.inspectionDate} onChange={e => set("inspectionDate", e.target.value)} className={field} required />
        </div>

        <div>
          <label className={label}>검사 장소</label>
          <input type="text" value={form.location} onChange={e => set("location", e.target.value)} className={field} placeholder="협력업체 공장 (울산)" />
        </div>

        <div>
          <label className={label}>검사 품목 *</label>
          <input type="text" value={form.itemName} onChange={e => set("itemName", e.target.value)} className={field} placeholder="예: 압력 게이지" required />
        </div>

        <div>
          <label className={label}>품목 코드</label>
          <input type="text" value={form.itemCode} onChange={e => set("itemCode", e.target.value)} className={field} placeholder="예: PG-2024-001" />
        </div>

        <div>
          <label className={label}>납품 수량 *</label>
          <input type="number" min="1" value={form.quantity} onChange={e => set("quantity", e.target.value)} className={field} placeholder="100" required />
        </div>

        <div>
          <label className={label}>샘플 검사 수량</label>
          <input type="number" min="1" value={form.sampleSize} onChange={e => set("sampleSize", e.target.value)} className={field} placeholder="10" />
        </div>

        <div>
          <label className={label}>검사 결과 *</label>
          <select value={form.result} onChange={e => set("result", e.target.value)} className={field}>
            <option value="PASS">합격</option>
            <option value="CONDITIONAL_PASS">조건부 합격</option>
            <option value="FAIL">불합격</option>
          </select>
        </div>

        <div>
          <label className={label}>불량 수량</label>
          <input type="number" min="0" value={form.defectCount} onChange={e => set("defectCount", e.target.value)} className={field} placeholder="0" />
        </div>

        <div>
          <label className={label}>검사원 *</label>
          <input type="text" value={form.inspector} onChange={e => set("inspector", e.target.value)} className={field} placeholder="홍길동" required />
        </div>

        <div className="sm:col-span-2">
          <label className={label}>특이사항 / 검사 노트</label>
          <textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={3} className={field} placeholder="검사 중 특이사항, 조건부 합격 조건 등을 입력하세요..." />
        </div>
      </div>

      {error && <p className="text-xs text-rose-600">{error}</p>}

      <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
        <button type="button" onClick={() => router.back()} className="px-4 py-2 text-xs text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">
          취소
        </button>
        <button type="submit" disabled={loading} className="px-5 py-2 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">
          {loading ? "등록 중..." : "검사 결과 등록"}
        </button>
      </div>
    </form>
  )
}
