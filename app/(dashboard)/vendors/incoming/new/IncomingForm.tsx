"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { AttachmentUploader, type AttachmentItem } from "@/components/ui/attachment-uploader"
import { Paperclip } from "lucide-react"

type Vendor = { id: string; name: string; location: string }

const NEW_VENDOR_SENTINEL = "__new__"

export default function IncomingForm({ vendors: initialVendors, defaultInspector }: { vendors: Vendor[]; defaultInspector: string }) {
  const router = useRouter()
  const [vendors, setVendors] = useState<Vendor[]>(initialVendors)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [attachments, setAttachments] = useState<AttachmentItem[]>([])

  const [modalOpen, setModalOpen] = useState(false)
  const [modalLoading, setModalLoading] = useState(false)
  const [modalError, setModalError] = useState("")
  const [newVendor, setNewVendor] = useState({ name: "", location: "", mainItem: "" })

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

  function onVendorChange(id: string) {
    if (id === NEW_VENDOR_SENTINEL) {
      setNewVendor({ name: "", location: "", mainItem: "" })
      setModalError("")
      setModalOpen(true)
      return
    }
    set("vendorId", id)
  }

  async function handleNewVendorSubmit(e: React.FormEvent) {
    e.preventDefault()
    const name = newVendor.name.trim()
    if (!name) { setModalError("업체명은 필수입니다."); return }
    setModalLoading(true); setModalError("")
    try {
      const res = await fetch("/api/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newVendor),
      })
      if (!res.ok) { const j = await res.json() as { error?: string }; throw new Error(j.error ?? "등록 실패") }
      const created = await res.json() as Vendor
      setVendors(prev => [...prev, created])
      set("vendorId", created.id)
      setModalOpen(false)
    } catch (err) {
      setModalError((err as Error).message)
    } finally {
      setModalLoading(false)
    }
  }

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
    <>
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="sm:col-span-2">
          <label className={label}>협력업체 *</label>
          <select value={form.vendorId} onChange={e => onVendorChange(e.target.value)} className={field} required>
            <option value="">-- 협력업체 선택 --</option>
            {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            <option value={NEW_VENDOR_SENTINEL} className="text-sky-600 font-semibold">+ 신규업체 등록...</option>
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

    {modalOpen && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        onClick={e => { if (e.target === e.currentTarget) setModalOpen(false) }}
      >
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
          <h2 className="text-base font-bold text-slate-900 mb-1">신규업체 등록</h2>
          <p className="text-xs text-slate-500 mb-5">
            필수 정보만 입력하세요. 상세 정보는 공급망 관리에서 나중에 보완할 수 있습니다.
          </p>

          <form onSubmit={handleNewVendorSubmit} className="space-y-4">
            <div>
              <label className={label}>업체명 *</label>
              <input type="text" value={newVendor.name} onChange={e => setNewVendor(v => ({ ...v, name: e.target.value }))} className={field} placeholder="예: (주)한국케이블" autoFocus />
            </div>
            <div>
              <label className={label}>소재지</label>
              <input type="text" value={newVendor.location} onChange={e => setNewVendor(v => ({ ...v, location: e.target.value }))} className={field} placeholder="예: 경기도 안산시" />
            </div>
            <div>
              <label className={label}>주요 품목</label>
              <input type="text" value={newVendor.mainItem} onChange={e => setNewVendor(v => ({ ...v, mainItem: e.target.value }))} className={field} placeholder="예: PVC 절연재" />
            </div>

            {modalError && <p className="text-xs text-rose-600">{modalError}</p>}

            <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
              <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-xs text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">
                취소
              </button>
              <button type="submit" disabled={modalLoading} className="px-5 py-2 text-xs font-semibold bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-50">
                {modalLoading ? "등록 중..." : "업체 등록"}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
    </>
  )
}
