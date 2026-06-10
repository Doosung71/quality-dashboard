"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { AttachmentUploader, type AttachmentItem } from "@/components/ui/attachment-uploader"
import { AiSuggestionPanel } from "@/components/ui/ai-suggestion-panel"
import { Paperclip } from "lucide-react"

type Inspection = {
  id: string
  vendorId: string
  vendorName: string
  inspectionDate: string
  location: string | null
  itemName: string
  itemCode: string | null
  quantity: number
  sampleSize: number | null
  result: string
  defectCount: number | null
  defectRate: number | null
  inspector: string
  notes: string | null
  status: string
  attachments: AttachmentItem[]
}

const resultConfig: Record<string, { label: string; badge: string }> = {
  PASS:             { label: "합격",       badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  FAIL:             { label: "불합격",     badge: "bg-rose-50 text-rose-700 border-rose-200" },
  CONDITIONAL_PASS: { label: "조건부합격", badge: "bg-amber-50 text-amber-700 border-amber-200" },
}

export default function InspectionDetailClient({ inspection: initial }: { inspection: Inspection }) {
  const router = useRouter()
  const [insp, setInsp] = useState(initial)
  const [editMode, setEditMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editData, setEditData] = useState({
    result:      initial.result,
    defectCount: initial.defectCount?.toString() ?? "",
    notes:       initial.notes ?? "",
    status:      initial.status,
  })
  const [attachments, setAttachments] = useState<AttachmentItem[]>(initial.attachments ?? [])
  const [savingAttachments, setSavingAttachments] = useState(false)

  async function handleAttachmentsChange(next: AttachmentItem[]) {
    setAttachments(next)
    setSavingAttachments(true)
    try {
      await fetch(`/api/source-inspections/${insp.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attachments: next }),
      })
    } finally { setSavingAttachments(false) }
  }

  async function saveInspection() {
    setSaving(true)
    const defCnt = editData.defectCount ? parseInt(editData.defectCount) : null
    const defRate = (defCnt != null && insp.sampleSize) ? (defCnt / insp.sampleSize) * 100 : insp.defectRate
    await fetch(`/api/source-inspections/${insp.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        result:      editData.result,
        defectCount: defCnt,
        defectRate:  defRate,
        notes:       editData.notes || null,
        status:      editData.status,
      }),
    })
    setSaving(false)
    setEditMode(false)
    setInsp(i => ({ ...i, result: editData.result, defectCount: defCnt, defectRate: defRate ?? i.defectRate, notes: editData.notes || null, status: editData.status }))
  }

  async function deleteInspection() {
    if (!confirm("이 출장검사 결과를 삭제하시겠습니까?")) return
    await fetch(`/api/source-inspections/${insp.id}`, { method: "DELETE" })
    router.push("/vendors/inspections")
  }

  const field = "w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
  const rc = resultConfig[insp.result] ?? resultConfig.PASS

  return (
    <div className="space-y-6">
      {/* 검사 결과 요약 카드 */}
      <section className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-800">검사 결과</h2>
          <div className="flex gap-2">
            {editMode ? (
              <>
                <button onClick={() => setEditMode(false)} className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">취소</button>
                <button onClick={saveInspection} disabled={saving} className="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">{saving ? "저장 중..." : "저장"}</button>
              </>
            ) : (
              <>
                <button onClick={() => setEditMode(true)} className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">수정</button>
                <button onClick={deleteInspection} className="text-xs px-3 py-1.5 border border-rose-200 rounded-lg text-rose-600 hover:bg-rose-50">삭제</button>
              </>
            )}
          </div>
        </div>

        {editMode ? (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">검사 결과</label>
              <select value={editData.result} onChange={e => setEditData(d => ({ ...d, result: e.target.value }))} className={field}>
                <option value="PASS">합격</option>
                <option value="CONDITIONAL_PASS">조건부 합격</option>
                <option value="FAIL">불합격</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">불량 수량</label>
              <input type="number" min="0" value={editData.defectCount} onChange={e => setEditData(d => ({ ...d, defectCount: e.target.value }))} className={field} placeholder="0" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-slate-600 block mb-1">특이사항 / 검사 노트</label>
              <textarea value={editData.notes} onChange={e => setEditData(d => ({ ...d, notes: e.target.value }))} rows={3} className={field} placeholder="검사 중 특이사항, 조건부 합격 조건 등을 입력하세요..." />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 핵심 지표 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500">검사 결과</p>
                <span className={`mt-2 inline-block text-xs font-semibold px-3 py-1 rounded-full border ${rc.badge}`}>{rc.label}</span>
              </div>
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500">납품 수량</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{insp.quantity.toLocaleString()}</p>
              </div>
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500">샘플 수량</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{insp.sampleSize?.toLocaleString() ?? "—"}</p>
              </div>
              <div className={`text-center p-4 rounded-lg ${(insp.defectRate ?? 0) > 0 ? "bg-rose-50" : "bg-emerald-50"}`}>
                <p className="text-xs text-slate-500">불량률</p>
                <p className={`text-2xl font-bold mt-1 ${(insp.defectRate ?? 0) > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                  {insp.defectRate != null ? `${insp.defectRate.toFixed(2)}%` : "—"}
                </p>
                {insp.defectCount != null && insp.defectCount > 0 && (
                  <p className="text-xs text-rose-400 mt-0.5">불량 {insp.defectCount}개</p>
                )}
              </div>
            </div>

            {/* 검사 상세 정보 */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm border-t border-slate-100 pt-4">
              <div className="flex justify-between">
                <span className="text-xs text-slate-500">검사 품목</span>
                <span className="text-xs font-medium text-slate-800">{insp.itemName}</span>
              </div>
              {insp.itemCode && (
                <div className="flex justify-between">
                  <span className="text-xs text-slate-500">품목 코드</span>
                  <span className="text-xs font-medium text-slate-800">{insp.itemCode}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-xs text-slate-500">검사일</span>
                <span className="text-xs font-medium text-slate-800">{new Date(insp.inspectionDate).toLocaleDateString("ko-KR")}</span>
              </div>
              {insp.location && (
                <div className="flex justify-between">
                  <span className="text-xs text-slate-500">검사 장소</span>
                  <span className="text-xs font-medium text-slate-800">{insp.location}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-xs text-slate-500">검사원</span>
                <span className="text-xs font-medium text-slate-800">{insp.inspector}</span>
              </div>
            </div>

            {insp.notes && (
              <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
                <p className="text-xs font-semibold text-amber-700 mb-1">특이사항 / 검사 노트</p>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{insp.notes}</p>
              </div>
            )}
          </div>
        )}
      </section>

      <AiSuggestionPanel
        type="source_inspection"
        title={insp.itemName}
        description={insp.notes ?? undefined}
      />

      <section className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <Paperclip className="w-4 h-4 text-slate-400" />
          첨부파일
          {savingAttachments && <span className="text-[10px] text-slate-400 font-normal">저장 중...</span>}
        </h2>
        <AttachmentUploader attachments={attachments} onChange={handleAttachmentsChange} context="source-inspection" />
      </section>
    </div>
  )
}
