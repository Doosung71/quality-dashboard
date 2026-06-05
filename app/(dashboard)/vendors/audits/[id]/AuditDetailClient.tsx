"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Trash2, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react"

type Finding = {
  id: string; category: string; description: string; severity: string
  requirement: string | null; status: string; dueDate: string | null
  response: string | null; closedAt: string | null
}

type Audit = {
  id: string; status: string; overallGrade: string | null
  totalScore: number | null; summary: string | null; findings: Finding[]
}

const severityLabel: Record<string, { label: string; cls: string }> = {
  CRITICAL:    { label: "치명",   cls: "bg-rose-50 text-rose-700 border-rose-200" },
  MAJOR:       { label: "주요",   cls: "bg-amber-50 text-amber-700 border-amber-200" },
  MINOR:       { label: "경미",   cls: "bg-slate-50 text-slate-600 border-slate-200" },
  OBSERVATION: { label: "관찰",   cls: "bg-blue-50 text-blue-700 border-blue-200" },
}

export default function AuditDetailClient({ audit: initial }: { audit: Audit }) {
  const router = useRouter()
  const [audit, setAudit] = useState(initial)
  const [editMode, setEditMode] = useState(false)
  const [editData, setEditData] = useState({ overallGrade: initial.overallGrade ?? "", totalScore: initial.totalScore?.toString() ?? "", summary: initial.summary ?? "", status: initial.status })
  const [saving, setSaving] = useState(false)

  // 지적사항 추가 폼 상태
  const [showAddFinding, setShowAddFinding] = useState(false)
  const [newFinding, setNewFinding] = useState({ category: "", description: "", severity: "MINOR", requirement: "", dueDate: "" })
  const [addingFinding, setAddingFinding] = useState(false)

  const [expandedFinding, setExpandedFinding] = useState<string | null>(null)
  const [responseText, setResponseText] = useState<Record<string, string>>({})

  async function saveAudit() {
    setSaving(true)
    await fetch(`/api/supplier-audits/${audit.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ overallGrade: editData.overallGrade || null, totalScore: editData.totalScore ? parseInt(editData.totalScore) : null, summary: editData.summary || null, status: editData.status }),
    })
    setSaving(false); setEditMode(false); router.refresh()
  }

  async function addFinding() {
    if (!newFinding.category || !newFinding.description) return
    setAddingFinding(true)
    const res = await fetch(`/api/supplier-audits/${audit.id}/findings`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newFinding),
    })
    if (res.ok) {
      const f = await res.json() as Finding
      setAudit(a => ({ ...a, findings: [...a.findings, f] }))
      setNewFinding({ category: "", description: "", severity: "MINOR", requirement: "", dueDate: "" })
      setShowAddFinding(false)
    }
    setAddingFinding(false)
  }

  async function closeFinding(findingId: string) {
    const res = await fetch(`/api/supplier-audits/${audit.id}/findings/${findingId}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CLOSED", response: responseText[findingId] }),
    })
    if (res.ok) {
      setAudit(a => ({ ...a, findings: a.findings.map(f => f.id === findingId ? { ...f, status: "CLOSED", response: responseText[findingId] ?? f.response } : f) }))
    }
  }

  async function deleteFinding(findingId: string) {
    if (!confirm("지적사항을 삭제하시겠습니까?")) return
    const res = await fetch(`/api/supplier-audits/${audit.id}/findings/${findingId}`, { method: "DELETE" })
    if (res.ok) setAudit(a => ({ ...a, findings: a.findings.filter(f => f.id !== findingId) }))
  }

  async function deleteAudit() {
    if (!confirm("이 감사 결과를 삭제하시겠습니까?")) return
    await fetch(`/api/supplier-audits/${audit.id}`, { method: "DELETE" })
    router.push("/vendors/audits")
  }

  const field = "w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
  const openFindings = audit.findings.filter(f => f.status === "OPEN")

  return (
    <div className="space-y-6">
      {/* 감사 결과 요약 */}
      <section className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-800">감사 결과</h2>
          <div className="flex gap-2">
            {editMode ? (
              <>
                <button onClick={() => setEditMode(false)} className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">취소</button>
                <button onClick={saveAudit} disabled={saving} className="text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">{saving ? "저장 중..." : "저장"}</button>
              </>
            ) : (
              <>
                <button onClick={() => setEditMode(true)} className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">수정</button>
                <button onClick={deleteAudit} className="text-xs px-3 py-1.5 border border-rose-200 rounded-lg text-rose-600 hover:bg-rose-50">삭제</button>
              </>
            )}
          </div>
        </div>
        {editMode ? (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">상태</label>
              <select value={editData.status} onChange={e => setEditData(d => ({ ...d, status: e.target.value }))} className={field}>
                <option value="PLANNED">예정</option>
                <option value="COMPLETED">완료</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">종합 등급</label>
              <select value={editData.overallGrade} onChange={e => setEditData(d => ({ ...d, overallGrade: e.target.value }))} className={field}>
                <option value="">미정</option>
                <option value="A">A</option><option value="B">B</option>
                <option value="C">C</option><option value="D">D</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">점수</label>
              <input type="number" value={editData.totalScore} onChange={e => setEditData(d => ({ ...d, totalScore: e.target.value }))} className={field} min={0} max={100} />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-slate-600 block mb-1">종합 의견</label>
              <textarea value={editData.summary} onChange={e => setEditData(d => ({ ...d, summary: e.target.value }))} rows={3} className={field} placeholder="감사 종합 의견을 입력하세요..." />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500">종합 등급</p>
              <p className="text-3xl font-extrabold text-slate-900 mt-1">{audit.overallGrade ?? "—"}</p>
            </div>
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500">점수</p>
              <p className="text-3xl font-extrabold text-slate-900 mt-1">{audit.totalScore != null ? `${audit.totalScore}점` : "—"}</p>
            </div>
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500">지적사항</p>
              <p className="text-3xl font-extrabold text-slate-900 mt-1">{audit.findings.length}<span className="text-sm font-normal ml-1">건</span></p>
              {openFindings.length > 0 && <p className="text-xs text-rose-500 mt-0.5">미조치 {openFindings.length}건</p>}
            </div>
            {audit.summary && (
              <div className="col-span-3 bg-indigo-50 rounded-lg p-3 border border-indigo-100">
                <p className="text-xs font-semibold text-indigo-600 mb-1">종합 의견</p>
                <p className="text-sm text-slate-700 leading-relaxed">{audit.summary}</p>
              </div>
            )}
          </div>
        )}
      </section>

      {/* 지적사항 */}
      <section className="bg-white rounded-xl border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">지적사항 ({audit.findings.length}건)</h2>
          <button onClick={() => setShowAddFinding(s => !s)} className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium">
            <Plus className="w-3.5 h-3.5" /> 지적사항 추가
          </button>
        </div>

        {/* 추가 폼 */}
        {showAddFinding && (
          <div className="px-5 py-4 bg-indigo-50/50 border-b border-indigo-100 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">분류 *</label>
                <input value={newFinding.category} onChange={e => setNewFinding(f => ({ ...f, category: e.target.value }))} className={field} placeholder="예: 품질시스템, 공정관리" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">심각도</label>
                <select value={newFinding.severity} onChange={e => setNewFinding(f => ({ ...f, severity: e.target.value }))} className={field}>
                  <option value="CRITICAL">치명</option><option value="MAJOR">주요</option>
                  <option value="MINOR">경미</option><option value="OBSERVATION">관찰</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-xs font-semibold text-slate-600 block mb-1">지적 내용 *</label>
                <textarea value={newFinding.description} onChange={e => setNewFinding(f => ({ ...f, description: e.target.value }))} rows={2} className={field} placeholder="지적 내용을 입력하세요..." />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">해당 기준</label>
                <input value={newFinding.requirement} onChange={e => setNewFinding(f => ({ ...f, requirement: e.target.value }))} className={field} placeholder="ISO 9001 8.4.2" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">조치 기한</label>
                <input type="date" value={newFinding.dueDate} onChange={e => setNewFinding(f => ({ ...f, dueDate: e.target.value }))} className={field} />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowAddFinding(false)} className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">취소</button>
              <button onClick={addFinding} disabled={addingFinding} className="text-xs px-4 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                {addingFinding ? "추가 중..." : "추가"}
              </button>
            </div>
          </div>
        )}

        {audit.findings.length === 0 ? (
          <p className="text-xs text-slate-400 italic text-center py-10">등록된 지적사항이 없습니다.</p>
        ) : (
          <div className="divide-y divide-slate-50">
            {audit.findings.map(f => {
              const sv = severityLabel[f.severity] ?? { label: f.severity, cls: "" }
              const isOpen = expandedFinding === f.id
              return (
                <div key={f.id} className={f.status === "CLOSED" ? "opacity-60" : ""}>
                  <button className="w-full text-left px-5 py-3 hover:bg-slate-50 transition-colors" onClick={() => setExpandedFinding(isOpen ? null : f.id)}>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{f.category}</span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${sv.cls}`}>{sv.label}</span>
                          {f.status === "CLOSED" && <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5"><CheckCircle2 className="w-3 h-3" />조치 완료</span>}
                          {f.requirement && <span className="text-[10px] text-slate-400">{f.requirement}</span>}
                        </div>
                        <p className="text-sm text-slate-800 mt-1 leading-relaxed line-clamp-2">{f.description}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={e => { e.stopPropagation(); deleteFinding(f.id) }} className="p-1 text-slate-300 hover:text-rose-500 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </div>
                    </div>
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-4 space-y-3">
                      {f.dueDate && <p className="text-xs text-slate-500">조치 기한: {new Date(f.dueDate).toLocaleDateString("ko-KR")}</p>}
                      {f.status === "OPEN" && (
                        <div className="space-y-2">
                          <textarea
                            value={responseText[f.id] ?? f.response ?? ""}
                            onChange={e => setResponseText(r => ({ ...r, [f.id]: e.target.value }))}
                            rows={2} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="업체 조치 내용을 입력하세요..."
                          />
                          <button onClick={() => closeFinding(f.id)} className="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
                            조치 완료 처리
                          </button>
                        </div>
                      )}
                      {f.status === "CLOSED" && f.response && (
                        <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-100">
                          <p className="text-[10px] font-semibold text-emerald-600 mb-1">조치 내용</p>
                          <p className="text-xs text-slate-700">{f.response}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
