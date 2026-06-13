"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

type Props = { defaultAssigneeName: string; defaultAssigneeId: string }

export default function WitnessForm({ defaultAssigneeName, defaultAssigneeId }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState("")

  const [form, setForm] = useState({
    customer:       "",
    projectName:    "",
    projectNumber:  "",
    productName:    "",
    inspectionDate: new Date().toISOString().slice(0, 10),
    endDate:        "",
    location:       "",
    assigneeName:   defaultAssigneeName,
    description:    "",
    notes:          "",
  })

  function set(key: string, val: string) { setForm(f => ({ ...f, [key]: val })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.customer.trim())    { setError("고객사를 입력해주세요."); return }
    if (!form.projectName.trim()) { setError("프로젝트명을 입력해주세요."); return }
    if (!form.assigneeName.trim()) { setError("담당자를 입력해주세요."); return }
    if (form.endDate && form.endDate < form.inspectionDate) {
      setError("종료일은 시작일 이후여야 합니다."); return
    }

    setLoading(true); setError("")
    try {
      const res = await fetch("/api/witness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer:      form.customer.trim(),
          projectName:   form.projectName.trim(),
          projectNumber: form.projectNumber.trim() || undefined,
          productName:   form.productName.trim() || undefined,
          inspectionDate: form.inspectionDate,
          endDate:        form.endDate || undefined,
          location:       form.location.trim() || undefined,
          assigneeId:     defaultAssigneeId,
          assigneeName:   form.assigneeName.trim(),
          description:    form.description.trim() || undefined,
          notes:          form.notes.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const j = await res.json() as { error?: string }
        throw new Error(j.error ?? "등록 실패")
      }
      const { id } = await res.json() as { id: string }
      router.push(`/witness/${id}`)
    } catch (err) {
      setError((err as Error).message)
      setLoading(false)
    }
  }

  const field = "w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
  const label = "text-xs font-semibold text-slate-700 block mb-1.5"

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">

      <fieldset className="space-y-4">
        <legend className="text-xs font-bold text-slate-400 uppercase tracking-wide pb-1 border-b border-slate-100 w-full">고객 / 프로젝트 정보</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={label}>고객사 *</label>
            <input value={form.customer} onChange={e => set("customer", e.target.value)}
              className={field} placeholder="예: 한국전력공사" required />
          </div>
          <div>
            <label className={label}>프로젝트명 *</label>
            <input value={form.projectName} onChange={e => set("projectName", e.target.value)}
              className={field} placeholder="예: 765kV XLPE Cable 공급" required />
          </div>
          <div>
            <label className={label}>수주번호</label>
            <input value={form.projectNumber} onChange={e => set("projectNumber", e.target.value)}
              className={field} placeholder="예: SO-2026-1234" />
          </div>
          <div className="sm:col-span-2">
            <label className={label}>제품명/품목</label>
            <input value={form.productName} onChange={e => set("productName", e.target.value)}
              className={field} placeholder="예: 154kV 800㎟ XLPE Cable" />
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-xs font-bold text-slate-400 uppercase tracking-wide pb-1 border-b border-slate-100 w-full">검사 일정</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={label}>검사 시작일 *</label>
            <input type="date" value={form.inspectionDate} onChange={e => set("inspectionDate", e.target.value)}
              className={field} required />
          </div>
          <div>
            <label className={label}>검사 종료일 <span className="text-slate-400 font-normal">(다일 검사 시)</span></label>
            <input type="date" value={form.endDate} onChange={e => set("endDate", e.target.value)}
              min={form.inspectionDate} className={field} />
          </div>
          <div>
            <label className={label}>검사 장소</label>
            <input value={form.location} onChange={e => set("location", e.target.value)}
              className={field} placeholder="예: 구미 공장 1공장" />
          </div>
          <div>
            <label className={label}>담당자 *</label>
            <input value={form.assigneeName} onChange={e => set("assigneeName", e.target.value)}
              className={field} placeholder="담당자 이름" required />
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-xs font-bold text-slate-400 uppercase tracking-wide pb-1 border-b border-slate-100 w-full">검사 내용 (선택)</legend>
        <div>
          <label className={label}>검사 범위 / 내용</label>
          <textarea value={form.description} onChange={e => set("description", e.target.value)}
            rows={3} className={field}
            placeholder="검사 항목, 적용 규격, 확인 포인트 등을 입력하세요..." />
        </div>
        <div>
          <label className={label}>비고</label>
          <textarea value={form.notes} onChange={e => set("notes", e.target.value)}
            rows={2} className={field}
            placeholder="특이사항, 준비물, 고객 요청 사전 메모 등" />
        </div>
      </fieldset>

      {error && <p className="text-xs text-rose-600">{error}</p>}

      <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
        <button type="button" onClick={() => router.back()}
          className="px-4 py-2 text-xs text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">
          취소
        </button>
        <button type="submit" disabled={loading}
          className="px-5 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
          {loading ? "등록 중..." : "입회검사 등록"}
        </button>
      </div>
    </form>
  )
}
