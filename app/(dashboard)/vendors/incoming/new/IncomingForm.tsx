"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { AttachmentUploader, type AttachmentItem } from "@/components/ui/attachment-uploader"
import { Paperclip } from "lucide-react"

type Vendor = { id: string; name: string }

export default function IncomingForm({ vendors, defaultInspector }: { vendors: Vendor[]; defaultInspector: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [attachments, setAttachments] = useState<AttachmentItem[]>([])

  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState({
    vendorId:       "",
    poNumber:       "",
    receiptDate:    today,
    inspectionDate: today,
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
    if (!form.vendorId)  { setError("협력업체를 선택해주세요."); return }
    if (!form.itemName)  { setError("품목명을 입력해주세요."); return }
    if (!form.quantity)  { setError("수량을 입력해주세요."); return }
    const qtyVal    = parseInt(form.quantity)
    const sampleVal = form.sampleSize  ? parseInt(form.sampleSize)  : null
    const defVal    = form.defectCount ? parseInt(form.defectCount) : null
    if (sampleVal !== null && sampleVal > qtyVal) {
      setError("샘플 검사 수량은 입고 수량을 초과할 수 없습니다."); return
    }
    if (defVal !== null && defVal > (sampleVal ?? qtyVal)) {
      setError("불량 수량은 샘플 검사 수량을 초과할 수 없습니다."); return
    }
    setLoading(true); setError("")
    try {
      const vendor = vendors.find(v => v.id === form.vendorId)
      const qty      = parseInt(form.quantity)
      const sampleSz = form.sampleSize  ? parseInt(form.sampleSize)  : null
      const defCnt   = form.defectCount ? parseInt(form.defectCount) : null
      const defRate  = (defCnt != null && sampleSz) ? (defCnt / sampleSz) * 100 : null

      const res = await fetch("/api/incoming-inspections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorId:       form.vendorId,
          vendorName:     vendor?.name ?? "",
          poNumber:       form.poNumber  || null,
          receiptDate:    form.receiptDate,
          inspectionDate: form.inspectionDate,
          itemName:       form.itemName,
          itemCode:       form.itemCode  || null,
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
      if (attachments.length > 0) {
        await fetch(`/api/incoming-inspections/${id}`, {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ attachments }),
        })
      }
      router.push(`/vendors/incoming/${id}`)
    } catch (err) {
      setError((err as Error).message)
      setLoading(false)
    }
  }

  const field = "w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
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
          <label className={label}>구매주문번호 (PO No.)</label>
          <input type="text" value={form.poNumber} onChange={e => set("poNumber", e.target.value)} className={field} placeholder="PO-2024-0001" />
        </div>

        <div>{/* 빈 칸 — 레이아웃 균형 */}</div>

        <div>
          <label className={label}>입고일 *</label>
          <input type="date" value={form.receiptDate} onChange={e => set("receiptDate", e.target.value)} className={field} required />
        </div>

        <div>
          <label className={label}>검사일 *</label>
          <input type="date" value={form.inspectionDate} onChange={e => set("inspectionDate", e.target.value)} className={field} required />
        </div>

        <div>
          <label className={label}>품목명 *</label>
          <input type="text" value={form.itemName} onChange={e => set("itemName", e.target.value)} className={field} placeholder="예: 압력 게이지" required />
        </div>

        <div>
          <label className={label}>품목 코드 / 규격</label>
          <input type="text" value={form.itemCode} onChange={e => set("itemCode", e.target.value)} className={field} placeholder="예: PG-A100-DN50" />
        </div>

        <div>
          <label className={label}>입고 수량 *</label>
          <input type="number" min="1" value={form.quantity} onChange={e => set("quantity", e.target.value)} className={field} placeholder="100" required />
        </div>

        <div>
          <label className={label}>샘플 검사 수량</label>
          <input type="number" min="1" max={form.quantity || undefined} value={form.sampleSize} onChange={e => set("sampleSize", e.target.value)} className={field} placeholder="10" />
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
          <input type="number" min="0" max={form.sampleSize || form.quantity || undefined} value={form.defectCount} onChange={e => set("defectCount", e.target.value)} className={field} placeholder="0" />
        </div>

        <div className="sm:col-span-2">
          <label className={label}>검사원 *</label>
          <input type="text" value={form.inspector} onChange={e => set("inspector", e.target.value)} className={field} placeholder="홍길동" required />
        </div>

        <div className="sm:col-span-2">
          <label className={label}>특이사항 / 검사 노트</label>
          <textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={3} className={field}
            placeholder="검사 중 특이사항, 조건부 합격 조건, 반품 지시 내용 등을 입력하세요..." />
        </div>
      </div>

      <div className="border-t border-slate-100 pt-4">
        <label className={label + " flex items-center gap-1.5 mb-2"}><Paperclip className="w-3.5 h-3.5 text-slate-400" /> 첨부파일</label>
        <AttachmentUploader attachments={attachments} onChange={setAttachments} context="incoming-inspection" disabled={loading} />
      </div>

      {error && <p className="text-xs text-rose-600">{error}</p>}

      <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
        <button type="button" onClick={() => router.back()} className="px-4 py-2 text-xs text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">
          취소
        </button>
        <button type="submit" disabled={loading} className="px-5 py-2 text-xs font-semibold bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-50">
          {loading ? "등록 중..." : "수입검사 등록"}
        </button>
      </div>
    </form>
  )
}
