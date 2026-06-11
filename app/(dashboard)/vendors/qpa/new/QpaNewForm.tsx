"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

type Vendor = { id: string; name: string; location: string }

const NEW_VENDOR_SENTINEL = "__new__"

export default function QpaNewForm({
  vendors: initialVendors,
  defaultAuditor,
}: {
  vendors: Vendor[]
  defaultAuditor: string
}) {
  const router = useRouter()
  const [vendors, setVendors] = useState<Vendor[]>(initialVendors)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState("")

  // 신규업체 등록 모달 상태
  const [modalOpen, setModalOpen]   = useState(false)
  const [modalLoading, setModalLoading] = useState(false)
  const [modalError, setModalError] = useState("")
  const [newVendor, setNewVendor]   = useState({ name: "", location: "", mainItem: "" })

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
    if (id === NEW_VENDOR_SENTINEL) {
      setNewVendor({ name: "", location: "", mainItem: "" })
      setModalError("")
      setModalOpen(true)
      return
    }
    const v = vendors.find(v => v.id === id)
    setForm(f => ({ ...f, vendorId: id, location: v?.location ?? f.location }))
  }

  async function handleNewVendorSubmit(e: React.FormEvent) {
    e.preventDefault()
    const name = newVendor.name.trim()
    if (!name) { setModalError("업체명은 필수입니다."); return }
    setModalLoading(true); setModalError("")
    try {
      const res = await fetch("/api/vendors", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(newVendor),
      })
      if (!res.ok) {
        const j = await res.json() as { error?: string }
        throw new Error(j.error ?? "등록 실패")
      }
      const created = await res.json() as Vendor
      setVendors(prev => [...prev, created])
      setForm(f => ({ ...f, vendorId: created.id, location: created.location || f.location }))
      setModalOpen(false)
    } catch (err) {
      setModalError((err as Error).message)
    } finally {
      setModalLoading(false)
    }
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
    <>
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
              <option value={NEW_VENDOR_SENTINEL} className="text-indigo-600 font-semibold">
                + 신규업체 등록...
              </option>
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

      {/* 신규업체 등록 모달 */}
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
                <label className={lbl}>업체명 *</label>
                <input
                  type="text"
                  value={newVendor.name}
                  onChange={e => setNewVendor(v => ({ ...v, name: e.target.value }))}
                  className={field}
                  placeholder="예: (주)한국케이블"
                  autoFocus
                />
              </div>
              <div>
                <label className={lbl}>소재지</label>
                <input
                  type="text"
                  value={newVendor.location}
                  onChange={e => setNewVendor(v => ({ ...v, location: e.target.value }))}
                  className={field}
                  placeholder="예: 경기도 안산시"
                />
              </div>
              <div>
                <label className={lbl}>주요 품목</label>
                <input
                  type="text"
                  value={newVendor.mainItem}
                  onChange={e => setNewVendor(v => ({ ...v, mainItem: e.target.value }))}
                  className={field}
                  placeholder="예: PVC 절연재"
                />
              </div>

              {modalError && <p className="text-xs text-rose-600">{modalError}</p>}

              <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="px-5 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
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
