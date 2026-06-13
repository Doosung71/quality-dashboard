"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Pencil, X, Check, Paperclip, MessageSquare, Download, Trash2, Plus } from "lucide-react"
import { AttachmentUploader, type AttachmentItem } from "@/components/ui/attachment-uploader"

// ─── 타입 ───────────────────────────────────────────────────────
type InspectionData = {
  id: string; inspNo: string; customer: string; projectName: string
  projectNumber?: string | null; productName?: string | null
  inspectionDate: string; endDate?: string | null; location?: string | null
  assigneeId: string; assigneeName: string; status: string; result?: string | null
  description?: string | null; notes?: string | null
  attachments: { url: string; name: string; size: number; contentType: string }[]
}
type VoCData = {
  id: string; content: string; category: string; priority: string
  status: string; response?: string | null; dueDate?: string | null
  closedAt?: string | null; createdAt: string
}

// ─── 상수 ───────────────────────────────────────────────────────
const STATUS_OPTIONS = [
  { value: "SCHEDULED",   label: "예정" },
  { value: "IN_PROGRESS", label: "진행중" },
  { value: "COMPLETED",   label: "완료" },
  { value: "CANCELLED",   label: "취소" },
]
const RESULT_OPTIONS = [
  { value: "",                 label: "미결정" },
  { value: "PASS",             label: "합격" },
  { value: "CONDITIONAL_PASS", label: "조건부합격" },
  { value: "FAIL",             label: "불합격" },
]
const VOC_CAT_LABEL: Record<string, string> = {
  DEFECT: "불량/품질", REQUIREMENT: "기술/규격", SCHEDULE: "일정", DOCUMENT: "서류", OTHER: "기타"
}
const VOC_PRI_COLOR: Record<string, string> = {
  HIGH: "text-rose-600", NORMAL: "text-slate-600", LOW: "text-slate-400"
}
const VOC_PRI_LABEL: Record<string, string> = { HIGH: "높음", NORMAL: "보통", LOW: "낮음" }
const VOC_STATUS_COLOR: Record<string, string> = {
  OPEN: "bg-rose-50 text-rose-700 border-rose-200",
  IN_PROGRESS: "bg-amber-50 text-amber-700 border-amber-200",
  RESOLVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
}
const VOC_STATUS_LABEL: Record<string, string> = { OPEN: "미처리", IN_PROGRESS: "처리중", RESOLVED: "완료" }

// ─── .ics 내보내기 (VALUE=DATE — KST 날짜 기준, 시각 변환 없음) ──
function exportIcs(inspection: InspectionData) {
  // YYYYMMDD 형식 — 시간대 변환 없이 날짜 문자열 그대로 사용
  const toDate = (iso: string) => iso.slice(0, 10).replace(/-/g, "")
  const start = toDate(inspection.inspectionDate)
  const end   = inspection.endDate ? toDate(inspection.endDate) : start
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//QMS 2.0//Witness Inspection//KO",
    "BEGIN:VEVENT",
    `UID:${inspection.id}@qms`,
    `DTSTART;VALUE=DATE:${start}`,
    `DTEND;VALUE=DATE:${end}`,
    `SUMMARY:[입회검사] ${inspection.customer} — ${inspection.projectName}`,
    `DESCRIPTION:검사번호: ${inspection.inspNo}\\n수주번호: ${inspection.projectNumber ?? "—"}\\n제품: ${inspection.productName ?? "—"}\\n담당: ${inspection.assigneeName}\\n장소: ${inspection.location ?? "—"}`,
    `LOCATION:${inspection.location ?? ""}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n")
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url; a.download = `${inspection.inspNo}.ics`; a.click()
  URL.revokeObjectURL(url)
}

// ─── 메인 컴포넌트 ───────────────────────────────────────────────
export default function WitnessDetailClient({
  inspection: init, voCs: initVoCs,
}: { inspection: InspectionData; voCs: VoCData[] }) {
  const router = useRouter()
  const [data, setData]     = useState(init)
  const [voCs, setVoCs]     = useState(initVoCs)
  const [tab, setTab]       = useState<"info" | "docs" | "voc">("info")
  const [editing, setEditing] = useState(false)
  const [form, setForm]     = useState({ ...init })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState("")

  // VoC 상태
  const [vocForm, setVocForm] = useState({ content: "", category: "OTHER", priority: "NORMAL", dueDate: "" })
  const [vocError, setVocError] = useState("")
  const [vocAdding, setVocAdding] = useState(false)
  const [vocSaving, setVocSaving] = useState(false)
  const [editingVocId, setEditingVocId] = useState<string | null>(null)
  const [vocEditForm, setVocEditForm] = useState({ response: "", status: "" })
  const [vocResponseError, setVocResponseError] = useState("")
  const [vocDeleteError, setVocDeleteError] = useState("")

  const field = "w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
  const label = "text-xs font-semibold text-slate-700 block mb-1"

  // ── 기본정보 저장
  async function saveInfo() {
    setSaving(true); setSaveError("")
    try {
      const res = await fetch(`/api/witness/${data.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, attachments: data.attachments }),
      })
      if (!res.ok) {
        const j = await res.json() as { error?: string }
        throw new Error(j.error ?? "저장에 실패했습니다.")
      }
      const updated = await res.json() as InspectionData
      setData(d => ({ ...updated, attachments: d.attachments }))
      setForm(f => ({ ...updated, attachments: f.attachments }))
      setEditing(false)
      router.refresh()
    } catch (err) {
      setSaveError((err as Error).message)
    } finally { setSaving(false) }
  }

  // ── VoC 등록
  async function addVoC() {
    if (!vocForm.content.trim()) return
    setVocSaving(true); setVocError("")
    try {
      const res = await fetch(`/api/witness/${data.id}/voc`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vocForm),
      })
      if (!res.ok) {
        const j = await res.json() as { error?: string }
        throw new Error(j.error ?? "VoC 등록에 실패했습니다.")
      }
      const created = await res.json() as VoCData
      setVoCs(v => [...v, created])
      setVocForm({ content: "", category: "OTHER", priority: "NORMAL", dueDate: "" })
      setVocAdding(false)
    } catch (err) {
      setVocError((err as Error).message)
    } finally { setVocSaving(false) }
  }

  // ── VoC 대응 저장
  async function saveVocResponse(vocId: string) {
    setVocResponseError("")
    const res = await fetch(`/api/witness/${data.id}/voc/${vocId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(vocEditForm),
    })
    if (!res.ok) {
      const j = await res.json() as { error?: string }
      setVocResponseError(j.error ?? "VoC 수정에 실패했습니다.")
      return
    }
    const updated = await res.json() as VoCData
    setVoCs(v => v.map(x => x.id === vocId ? updated : x))
    setEditingVocId(null)
  }

  // ── VoC 삭제
  async function deleteVoC(vocId: string) {
    if (!confirm("이 VoC 항목을 삭제할까요?")) return
    setVocDeleteError("")
    const res = await fetch(`/api/witness/${data.id}/voc/${vocId}`, { method: "DELETE" })
    if (!res.ok) {
      const j = await res.json() as { error?: string }
      setVocDeleteError(j.error ?? "VoC 삭제에 실패했습니다.")
      return
    }
    setVoCs(v => v.filter(x => x.id !== vocId))
  }

  const TAB_BTN = (t: typeof tab, lbl: string) => (
    <button onClick={() => setTab(t)}
      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
        tab === t ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"
      }`}>{lbl}</button>
  )

  return (
    <div className="flex flex-col gap-4">
      {/* 탭 바 + .ics 버튼 */}
      <div className="flex items-center justify-between border-b border-slate-200">
        <div className="flex">
          {TAB_BTN("info", "기본 정보")}
          {TAB_BTN("docs", `문서 첨부 (${data.attachments.length})`)}
          {TAB_BTN("voc", `VoC / 고객 요청 (${voCs.length})`)}
        </div>
        <button onClick={() => exportIcs(data)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 mb-1">
          <Download className="w-3.5 h-3.5" />
          캘린더 추가 (.ics)
        </button>
      </div>

      {/* ── 탭: 기본 정보 ── */}
      {tab === "info" && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-semibold text-slate-700">검사 정보</h2>
            {!editing ? (
              <button onClick={() => { setEditing(true); setForm({ ...data }) }}
                className="flex items-center gap-1 text-xs text-indigo-600 hover:underline">
                <Pencil className="w-3 h-3" />수정
              </button>
            ) : (
              <div className="flex items-center gap-2">
                {saveError && <span className="text-xs text-rose-600">{saveError}</span>}
                <button onClick={() => { setEditing(false); setSaveError("") }} className="flex items-center gap-1 text-xs text-slate-500 hover:underline">
                  <X className="w-3 h-3" />취소
                </button>
                <button onClick={saveInfo} disabled={saving}
                  className="flex items-center gap-1 text-xs text-indigo-600 font-semibold hover:underline disabled:opacity-50">
                  <Check className="w-3 h-3" />{saving ? "저장중..." : "저장"}
                </button>
              </div>
            )}
          </div>

          {editing ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2"><label className={label}>고객사 *</label>
                <input value={form.customer} onChange={e => setForm(f => ({ ...f, customer: e.target.value }))} className={field} /></div>
              <div><label className={label}>프로젝트명 *</label>
                <input value={form.projectName} onChange={e => setForm(f => ({ ...f, projectName: e.target.value }))} className={field} /></div>
              <div><label className={label}>수주번호</label>
                <input value={form.projectNumber ?? ""} onChange={e => setForm(f => ({ ...f, projectNumber: e.target.value }))} className={field} /></div>
              <div className="sm:col-span-2"><label className={label}>제품명/품목</label>
                <input value={form.productName ?? ""} onChange={e => setForm(f => ({ ...f, productName: e.target.value }))} className={field} /></div>
              <div><label className={label}>검사 시작일</label>
                <input type="date" value={form.inspectionDate.slice(0, 10)} onChange={e => setForm(f => ({ ...f, inspectionDate: e.target.value }))} className={field} /></div>
              <div><label className={label}>검사 종료일</label>
                <input type="date" value={form.endDate?.slice(0, 10) ?? ""} onChange={e => setForm(f => ({ ...f, endDate: e.target.value || null }))} className={field} /></div>
              <div><label className={label}>검사 장소</label>
                <input value={form.location ?? ""} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} className={field} /></div>
              <div><label className={label}>담당자</label>
                <input value={form.assigneeName} onChange={e => setForm(f => ({ ...f, assigneeName: e.target.value }))} className={field} /></div>
              <div><label className={label}>상태</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className={field}>
                  {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select></div>
              <div><label className={label}>검사 결과</label>
                <select value={form.result ?? ""} onChange={e => setForm(f => ({ ...f, result: e.target.value || null }))} className={field}>
                  {RESULT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select></div>
              <div className="sm:col-span-2"><label className={label}>검사 범위/내용</label>
                <textarea value={form.description ?? ""} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} className={field} /></div>
              <div className="sm:col-span-2"><label className={label}>비고</label>
                <textarea value={form.notes ?? ""} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className={field} /></div>
            </div>
          ) : (
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4 text-sm">
              <InfoRow label="고객사" value={data.customer} span={2} />
              <InfoRow label="프로젝트명" value={data.projectName} span={2} />
              <InfoRow label="수주번호" value={data.projectNumber} />
              <InfoRow label="제품명/품목" value={data.productName} span={2} />
              <InfoRow label="검사 일정" value={
                `${new Date(data.inspectionDate).toLocaleDateString("ko-KR")}${data.endDate ? " ~ " + new Date(data.endDate).toLocaleDateString("ko-KR") : ""}`
              } />
              <InfoRow label="검사 장소" value={data.location} />
              <InfoRow label="담당자" value={data.assigneeName} />
              <InfoRow label="검사 범위/내용" value={data.description} span={3} />
              <InfoRow label="비고" value={data.notes} span={3} />
            </dl>
          )}
        </div>
      )}

      {/* ── 탭: 문서 첨부 ── */}
      {tab === "docs" && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
            <Paperclip className="w-4 h-4 text-slate-400" />첨부 문서
          </h2>
          <AttachmentUploader
            attachments={data.attachments}
            onChange={async (items) => {
              await fetch(`/api/witness/${data.id}`, {
                method: "PATCH", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ attachments: items }),
              })
              setData(d => ({ ...d, attachments: items }))
            }}
            context="witness-inspection"
          />
        </div>
      )}

      {/* ── 탭: VoC / 고객 요청 ── */}
      {tab === "voc" && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-slate-400" />고객 요청사항 / VoC
            </h2>
            <button onClick={() => setVocAdding(v => !v)}
              className="flex items-center gap-1 text-xs text-indigo-600 hover:underline">
              <Plus className="w-3 h-3" />요청사항 추가
            </button>
          </div>

          {vocDeleteError && (
            <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{vocDeleteError}</p>
          )}

          {/* VoC 등록 폼 */}
          {vocAdding && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex flex-col gap-3">
              <div><label className={label}>요청사항 내용 *</label>
                <textarea value={vocForm.content} onChange={e => setVocForm(f => ({ ...f, content: e.target.value }))}
                  rows={2} className={field} placeholder="고객 요청사항, VoC, 특별 요구사항 등을 입력하세요..." /></div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div><label className={label}>분류</label>
                  <select value={vocForm.category} onChange={e => setVocForm(f => ({ ...f, category: e.target.value }))} className={field}>
                    {Object.entries(VOC_CAT_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select></div>
                <div><label className={label}>우선순위</label>
                  <select value={vocForm.priority} onChange={e => setVocForm(f => ({ ...f, priority: e.target.value }))} className={field}>
                    <option value="HIGH">높음</option>
                    <option value="NORMAL">보통</option>
                    <option value="LOW">낮음</option>
                  </select></div>
                <div><label className={label}>마감일</label>
                  <input type="date" value={vocForm.dueDate} onChange={e => setVocForm(f => ({ ...f, dueDate: e.target.value }))} className={field} /></div>
              </div>
              {vocError && <p className="text-xs text-rose-600">{vocError}</p>}
              <div className="flex justify-end gap-2">
                <button onClick={() => { setVocAdding(false); setVocError("") }} className="px-3 py-1.5 text-xs text-slate-500 border border-slate-200 rounded-lg hover:bg-white">취소</button>
                <button onClick={addVoC} disabled={vocSaving || !vocForm.content.trim()}
                  className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                  {vocSaving ? "저장중..." : "등록"}
                </button>
              </div>
            </div>
          )}

          {/* VoC 목록 */}
          {voCs.length === 0 && !vocAdding ? (
            <p className="text-center py-8 text-sm text-slate-400">등록된 고객 요청사항이 없습니다.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {voCs.map(voc => (
                <div key={voc.id} className="bg-white border border-slate-200 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${VOC_STATUS_COLOR[voc.status]}`}>
                          {VOC_STATUS_LABEL[voc.status]}
                        </span>
                        <span className="text-xs text-slate-500">{VOC_CAT_LABEL[voc.category]}</span>
                        <span className={`text-xs font-semibold ${VOC_PRI_COLOR[voc.priority]}`}>
                          우선순위: {VOC_PRI_LABEL[voc.priority]}
                        </span>
                        {voc.dueDate && (
                          <span className="text-xs text-slate-400">
                            마감: {new Date(voc.dueDate).toLocaleDateString("ko-KR")}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-800 whitespace-pre-wrap">{voc.content}</p>
                      {voc.response && (
                        <div className="mt-2 pl-3 border-l-2 border-indigo-200">
                          <p className="text-xs text-slate-500 font-semibold mb-0.5">대응 내용</p>
                          <p className="text-sm text-slate-700 whitespace-pre-wrap">{voc.response}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => { setEditingVocId(voc.id); setVocEditForm({ response: voc.response ?? "", status: voc.status }) }}
                        className="p-1 text-slate-400 hover:text-indigo-600 rounded">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteVoC(voc.id)} className="p-1 text-slate-400 hover:text-rose-600 rounded">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* 인라인 대응 편집 */}
                  {editingVocId === voc.id && (
                    <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col gap-2">
                      <div><label className={label}>처리 상태</label>
                        <select value={vocEditForm.status} onChange={e => setVocEditForm(f => ({ ...f, status: e.target.value }))} className={field}>
                          <option value="OPEN">미처리</option>
                          <option value="IN_PROGRESS">처리중</option>
                          <option value="RESOLVED">완료</option>
                        </select></div>
                      <div><label className={label}>대응 내용</label>
                        <textarea value={vocEditForm.response} onChange={e => setVocEditForm(f => ({ ...f, response: e.target.value }))}
                          rows={2} className={field} placeholder="고객 요청에 대한 조치/대응 내용을 입력하세요..." /></div>
                      {vocResponseError && editingVocId === voc.id && (
                        <p className="text-xs text-rose-600">{vocResponseError}</p>
                      )}
                      <div className="flex justify-end gap-2">
                        <button onClick={() => { setEditingVocId(null); setVocResponseError("") }} className="px-3 py-1.5 text-xs text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50">취소</button>
                        <button onClick={() => saveVocResponse(voc.id)}
                          className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">저장</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function InfoRow({ label: lbl, value, span = 1 }: { label: string; value?: string | null; span?: number }) {
  return (
    <div className={span > 1 ? `col-span-${span}` : ""}>
      <dt className="text-xs font-semibold text-slate-500 mb-0.5">{lbl}</dt>
      <dd className="text-slate-800 whitespace-pre-wrap">{value || <span className="text-slate-300">—</span>}</dd>
    </div>
  )
}
