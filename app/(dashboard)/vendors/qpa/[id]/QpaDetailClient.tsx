"use client"

import { useState, useCallback, useRef } from "react"
import { CheckCircle2, AlertCircle, Plus, Trash2, ChevronDown, ChevronRight, Star } from "lucide-react"
import { calcQpaScores, QPA_CATEGORIES } from "@/lib/qpa-template"

// ─── types ──────────────────────────────────────────────────────

type Item = {
  id: string; itemNo: number; category: string; subCategory: string
  isKey: boolean; checkItem: string; criteria: string
  potential: number; score: number; isNA: boolean; comment: string; evidence: string
}

type Finding = {
  id: string; seq: number; category: string; finding: string
  action: string; responsible: string; dueDate: string | null; status: string
}

type Audit = {
  id: string; qpaNo: string; vendorName: string; location: string; partName: string
  auditDate: string; auditorNames: string; templateVersion?: string
  totalPotential: number; totalScore: number; totalPercent: number
  level: string; result: string; status: string
  items: Item[]; findings: Finding[]
}

// ─── radar chart ────────────────────────────────────────────────

function RadarChart({ scores }: { scores: number[] }) {
  const cx = 120, cy = 120, r = 80
  const n = 5
  const angles = Array.from({ length: n }, (_, i) => -Math.PI / 2 + (i * 2 * Math.PI) / n)
  const pt = (i: number, ratio: number) => ({
    x: cx + r * ratio * Math.cos(angles[i]),
    y: cy + r * ratio * Math.sin(angles[i]),
  })
  const polygon = (ratio: number) =>
    Array.from({ length: n }, (_, i) => { const v = pt(i, ratio); return `${v.x.toFixed(1)},${v.y.toFixed(1)}` }).join(" ")
  const scorePolygon = scores.map((s, i) => { const v = pt(i, Math.max(s, 2) / 100); return `${v.x.toFixed(1)},${v.y.toFixed(1)}` }).join(" ")
  const labels = ["품질경영", "외주품/원자재", "생산공정", "검사/시험", "물류/재고"]
  const labelOffset = 14

  return (
    <svg viewBox="0 0 240 240" className="w-full max-w-[240px] mx-auto">
      {[0.2, 0.4, 0.6, 0.8, 1.0].map((ratio, i) => (
        <polygon key={i} points={polygon(ratio)} fill="none" stroke="#e2e8f0" strokeWidth={i === 4 ? "1" : "0.6"} />
      ))}
      {Array.from({ length: n }, (_, i) => {
        const v = pt(i, 1)
        return <line key={i} x1={cx} y1={cy} x2={v.x.toFixed(1)} y2={v.y.toFixed(1)} stroke="#cbd5e1" strokeWidth="0.5" />
      })}
      <polygon points={scorePolygon} fill="rgba(99,102,241,0.18)" stroke="#6366f1" strokeWidth="1.5" />
      {scores.map((s, i) => {
        const v = pt(i, Math.max(s, 2) / 100)
        return <circle key={i} cx={v.x.toFixed(1)} cy={v.y.toFixed(1)} r="3" fill="#6366f1" />
      })}
      {labels.map((label, i) => {
        const lx = cx + (r + labelOffset) * Math.cos(angles[i])
        const ly = cy + (r + labelOffset) * Math.sin(angles[i])
        const anchor = lx < cx - 5 ? "end" : lx > cx + 5 ? "start" : "middle"
        return (
          <text key={i} x={lx.toFixed(1)} y={ly.toFixed(1)} textAnchor={anchor}
            dominantBaseline="middle" fontSize="8" fill="#64748b">
            {label}
          </text>
        )
      })}
    </svg>
  )
}

// ─── helpers ────────────────────────────────────────────────────

function getCategoryScores(items: Item[]) {
  return QPA_CATEGORIES.map(cat => {
    const catItems = items.filter(i => i.category === cat.name)
    const effective = catItems.reduce((s, i) => s + (i.isNA ? 0 : i.potential), 0)
    const scored    = catItems.reduce((s, i) => s + (i.isNA ? 0 : i.score), 0)
    const pct       = effective > 0 ? Math.round(scored / effective * 1000) / 10 : 0
    return { name: cat.name, potential: cat.potential, effective, scored, pct }
  })
}

const resultBadge = {
  PASS: "bg-emerald-50 text-emerald-700 border-emerald-200",
  FAIL: "bg-rose-50 text-rose-700 border-rose-200",
  TBD:  "bg-slate-50 text-slate-500 border-slate-200",
} as const

const levelColor = {
  A: "text-emerald-700", B: "text-blue-700", C: "text-amber-700", D: "text-rose-700",
} as const

const findingStatusCls = {
  OPEN:        "bg-amber-50 text-amber-700 border-amber-200",
  IN_PROGRESS: "bg-blue-50 text-blue-700 border-blue-200",
  CLOSED:      "bg-emerald-50 text-emerald-700 border-emerald-200",
} as const
const findingStatusLabel = { OPEN: "미조치", IN_PROGRESS: "처리 중", CLOSED: "완료" } as const

// ─── SummaryTab ──────────────────────────────────────────────────

function SummaryTab({
  audit, items, canWrite, onStatusToggle,
}: {
  audit: Audit; items: Item[]; canWrite: boolean; onStatusToggle: () => void
}) {
  const catScores = getCategoryScores(items)
  const radarData = catScores.map(c => c.pct)
  const totals    = calcQpaScores(items.map(i => ({ potential: i.potential, score: i.score, isNA: i.isNA })))

  return (
    <div className="flex flex-col gap-5">
      {/* Header card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          <div><p className="text-xs text-slate-400">협력업체</p><p className="font-semibold text-slate-800">{audit.vendorName}</p></div>
          <div><p className="text-xs text-slate-400">위치</p><p className="font-semibold text-slate-800">{audit.location || "—"}</p></div>
          <div><p className="text-xs text-slate-400">품명</p><p className="font-semibold text-slate-800">{audit.partName || "—"}</p></div>
          <div><p className="text-xs text-slate-400">감사일</p><p className="font-semibold text-slate-800">{new Date(audit.auditDate).toLocaleDateString("ko-KR")}</p></div>
          <div><p className="text-xs text-slate-400">감사자</p><p className="font-semibold text-slate-800">{audit.auditorNames || "—"}</p></div>
          <div><p className="text-xs text-slate-400">템플릿</p><p className="font-semibold text-slate-800">LSC QPA 1.0 ({audit.templateVersion ?? "March 2026"})</p></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Category score table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-800">대분류별 점수</h3>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500">
                <th className="text-left px-4 py-2.5 font-medium">분류</th>
                <th className="text-center px-2 py-2.5 font-medium">만점</th>
                <th className="text-center px-2 py-2.5 font-medium">취득</th>
                <th className="text-center px-2 py-2.5 font-medium">달성률</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {catScores.map(c => (
                <tr key={c.name} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 text-slate-700">{c.name}</td>
                  <td className="px-2 py-2.5 text-center text-slate-500">{c.effective}</td>
                  <td className="px-2 py-2.5 text-center font-semibold text-slate-800">{c.scored}</td>
                  <td className="px-2 py-2.5 text-center">
                    <span className={`font-bold ${c.pct >= 70 ? "text-emerald-600" : "text-rose-600"}`}>{c.pct.toFixed(1)}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 border-t border-slate-200">
                <td className="px-4 py-3 font-semibold text-slate-800">합계</td>
                <td className="px-2 py-3 text-center text-slate-500">{totals.effectivePotential}</td>
                <td className="px-2 py-3 text-center font-bold text-slate-900">{totals.totalScore}</td>
                <td className="px-2 py-3 text-center">
                  <span className={`font-bold text-sm ${totals.totalPercent >= 70 ? "text-emerald-600" : "text-rose-600"}`}>
                    {totals.totalPercent.toFixed(1)}%
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Result + Level + Complete button */}
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className={`text-sm font-bold px-3 py-1 rounded-full border ${resultBadge[totals.result as keyof typeof resultBadge] ?? resultBadge.TBD}`}>
                {totals.result}
              </span>
              {totals.result !== "TBD" && (
                <span className={`text-sm font-bold ${levelColor[totals.level as keyof typeof levelColor] ?? "text-slate-700"}`}>
                  {totals.level}등급
                </span>
              )}
            </div>
            {canWrite && audit.status !== "Completed" && (
              <button
                onClick={onStatusToggle}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> 감사 완료 처리
              </button>
            )}
          </div>
        </div>

        {/* Radar chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-center">
          <RadarChart scores={radarData} />
        </div>
      </div>
    </div>
  )
}

// ─── ChecklistTab ─────────────────────────────────────────────────

function ChecklistTab({
  auditId, items, setItems, canWrite,
}: {
  auditId: string; items: Item[]; setItems: React.Dispatch<React.SetStateAction<Item[]>>; canWrite: boolean
}) {
  const [openCats, setOpenCats]     = useState<Set<string>>(new Set(QPA_CATEGORIES.map(c => c.name)))
  type FieldStatus = "saving" | "success" | "error"
  const [fieldStatus, setFieldStatus] = useState<Map<string, FieldStatus>>(new Map())
  const successTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  function toggleCat(cat: string) {
    setOpenCats(prev => { const n = new Set(prev); n.has(cat) ? n.delete(cat) : n.add(cat); return n })
  }

  function setStatus(key: string, status: FieldStatus | null) {
    setFieldStatus(prev => {
      const n = new Map(prev)
      if (status) n.set(key, status); else n.delete(key)
      return n
    })
  }

  const saveItem = useCallback(async (itemNo: number, field: keyof Item, patch: Partial<Item>) => {
    const key = `${itemNo}:${field}`
    const existingTimer = successTimers.current.get(key)
    if (existingTimer) { clearTimeout(existingTimer); successTimers.current.delete(key) }
    setStatus(key, "saving")
    try {
      const res = await fetch(`/api/qpa-audits/${auditId}/items/${itemNo}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      })
      if (!res.ok) throw new Error(`저장 실패 (${res.status})`)
      setStatus(key, "success")
      const t = setTimeout(() => { setStatus(key, null); successTimers.current.delete(key) }, 2000)
      successTimers.current.set(key, t)
    } catch {
      setStatus(key, "error")
    }
  }, [auditId])

  function updateItem(itemNo: number, patch: Partial<Item>) {
    setItems(prev => prev.map(i => i.itemNo === itemNo ? { ...i, ...patch } : i))
  }

  const categories = QPA_CATEGORIES.map(cat => ({
    name: cat.name,
    items: items.filter(i => i.category === cat.name),
  }))

  const field = "text-xs border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400 w-full"

  function statusBorder(status: FieldStatus | undefined) {
    if (status === "error") return "border-rose-400 focus:ring-rose-400 pr-6"
    if (status === "saving" || status === "success") return "pr-6"
    return ""
  }

  function StatusIcon({ status }: { status: FieldStatus | undefined }) {
    if (!status) return null
    return (
      <span className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" title={status === "error" ? "저장 실패, 다시 입력해 주세요" : undefined}>
        {status === "saving"  && <span className="block w-2.5 h-2.5 rounded-full border-2 border-indigo-300 border-t-indigo-500 animate-spin" />}
        {status === "success" && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
        {status === "error"   && <AlertCircle className="w-3.5 h-3.5 text-rose-500" />}
      </span>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {categories.map(cat => {
        const open     = openCats.has(cat.name)
        const subCats  = [...new Set(cat.items.map(i => i.subCategory))]
        const catScore = cat.items.reduce((s, i) => s + (i.isNA ? 0 : i.score), 0)
        const catPot   = cat.items.reduce((s, i) => s + (i.isNA ? 0 : i.potential), 0)
        const catPct   = catPot > 0 ? (catScore / catPot * 100).toFixed(1) : "—"

        return (
          <div key={cat.name} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <button
              type="button"
              onClick={() => toggleCat(cat.name)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
            >
              <span className="text-sm font-semibold text-slate-800">{cat.name}</span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500">{catScore} / {catPot}점 ({catPct}%)</span>
                {open ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
              </div>
            </button>

            {open && (
              <div className="border-t border-slate-100">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 border-b border-slate-100">
                      <th className="text-center px-2 py-2 w-8">No</th>
                      <th className="text-center px-2 py-2 w-5"></th>
                      <th className="text-left px-3 py-2">점검 항목</th>
                      <th className="text-center px-2 py-2 w-12">배점</th>
                      <th className="text-center px-2 py-2 w-20">점수</th>
                      <th className="text-center px-2 py-2 w-12">N/A</th>
                      <th className="text-left px-2 py-2 w-40">의견</th>
                      <th className="text-left px-2 py-2 w-40">근거</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {subCats.map(sub => {
                      const subItems  = cat.items.filter(i => i.subCategory === sub)
                      const subScore  = subItems.reduce((s, i) => s + (i.isNA ? 0 : i.score), 0)
                      const subPot    = subItems.reduce((s, i) => s + (i.isNA ? 0 : i.potential), 0)
                      return (
                        <>
                          <tr key={sub + "_header"} className="bg-slate-50/70">
                            <td colSpan={4} className="px-3 py-1.5 text-slate-500 font-medium">{sub}</td>
                            <td colSpan={4} className="px-2 py-1.5 text-right text-slate-500 font-semibold pr-4">
                              {subScore} / {subPot}점
                            </td>
                          </tr>
                          {subItems.map(item => (
                            <tr key={item.itemNo} className={`hover:bg-slate-50 ${item.isNA ? "opacity-50" : ""}`}>
                              <td className="text-center px-2 py-2 text-slate-400 font-mono">{item.itemNo}</td>
                              <td className="text-center px-2 py-2">
                                {item.isKey && <Star className="w-3 h-3 text-amber-500 fill-amber-400 mx-auto" />}
                              </td>
                              <td className="px-3 py-2 text-slate-700" title={item.criteria}>
                                {item.checkItem}
                              </td>
                              <td className="text-center px-2 py-2 text-slate-500">{item.potential}</td>
                              <td className="px-2 py-2">
                                <div className="relative">
                                  <input
                                    type="number"
                                    min={0}
                                    max={item.potential}
                                    disabled={!canWrite || item.isNA}
                                    value={item.isNA ? "" : item.score}
                                    onChange={e => {
                                      const v = Math.min(Math.max(parseInt(e.target.value) || 0, 0), item.potential)
                                      updateItem(item.itemNo, { score: v })
                                    }}
                                    onBlur={e => {
                                      if (!item.isNA) {
                                        const v = Math.min(Math.max(parseInt(e.target.value) || 0, 0), item.potential)
                                        saveItem(item.itemNo, "score", { score: v })
                                      }
                                    }}
                                    className={`${field} text-center ${statusBorder(fieldStatus.get(`${item.itemNo}:score`))}`}
                                    placeholder={item.isNA ? "N/A" : `0~${item.potential}`}
                                  />
                                  <StatusIcon status={fieldStatus.get(`${item.itemNo}:score`)} />
                                </div>
                              </td>
                              <td className="text-center px-2 py-2">
                                <input
                                  type="checkbox"
                                  checked={item.isNA}
                                  disabled={!canWrite}
                                  onChange={e => {
                                    const isNA = e.target.checked
                                    updateItem(item.itemNo, { isNA, score: isNA ? 0 : item.score })
                                    saveItem(item.itemNo, "isNA", { isNA, score: isNA ? 0 : item.score })
                                  }}
                                  className="accent-indigo-600"
                                />
                              </td>
                              <td className="px-2 py-2">
                                <div className="relative">
                                  <input
                                    type="text"
                                    disabled={!canWrite}
                                    value={item.comment}
                                    onChange={e => updateItem(item.itemNo, { comment: e.target.value })}
                                    onBlur={e => saveItem(item.itemNo, "comment", { comment: e.target.value })}
                                    className={`${field} ${statusBorder(fieldStatus.get(`${item.itemNo}:comment`))}`}
                                    placeholder="의견 입력"
                                  />
                                  <StatusIcon status={fieldStatus.get(`${item.itemNo}:comment`)} />
                                </div>
                              </td>
                              <td className="px-2 py-2">
                                <div className="relative">
                                  <input
                                    type="text"
                                    disabled={!canWrite}
                                    value={item.evidence}
                                    onChange={e => updateItem(item.itemNo, { evidence: e.target.value })}
                                    onBlur={e => saveItem(item.itemNo, "evidence", { evidence: e.target.value })}
                                    className={`${field} ${statusBorder(fieldStatus.get(`${item.itemNo}:evidence`))}`}
                                    placeholder="근거"
                                  />
                                  <StatusIcon status={fieldStatus.get(`${item.itemNo}:evidence`)} />
                                </div>
                              </td>
                            </tr>
                          ))}
                        </>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── FindingsTab ──────────────────────────────────────────────────

function FindingsTab({
  auditId, findings, setFindings, canWrite,
}: {
  auditId: string; findings: Finding[]; setFindings: React.Dispatch<React.SetStateAction<Finding[]>>; canWrite: boolean
}) {
  const [showAdd, setShowAdd]     = useState(false)
  const [adding,  setAdding]      = useState(false)
  const [editId,  setEditId]      = useState<string | null>(null)
  const [newF,    setNewF]        = useState({ category: "", finding: "", action: "", responsible: "", dueDate: "" })
  const [editF,   setEditF]       = useState<Finding | null>(null)

  async function addFinding(e: React.FormEvent) {
    e.preventDefault()
    if (!newF.category || !newF.finding) return
    setAdding(true)
    try {
      const res = await fetch(`/api/qpa-audits/${auditId}/findings`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newF),
      })
      if (res.ok) {
        const f = await res.json() as Finding
        setFindings(prev => [...prev, f])
        setNewF({ category: "", finding: "", action: "", responsible: "", dueDate: "" })
        setShowAdd(false)
      }
    } finally { setAdding(false) }
  }

  async function saveFinding() {
    if (!editF) return
    await fetch(`/api/qpa-audits/${auditId}/findings/${editF.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editF),
    })
    setFindings(prev => prev.map(f => f.id === editF.id ? editF : f))
    setEditId(null)
    setEditF(null)
  }

  async function deleteFinding(id: string) {
    if (!confirm("지적사항을 삭제하시겠습니까?")) return
    await fetch(`/api/qpa-audits/${auditId}/findings/${id}`, { method: "DELETE" })
    setFindings(prev => prev.filter(f => f.id !== id))
  }

  const field = "text-xs border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400 w-full"

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800">개선대책 목록 ({findings.length}건)</h3>
          {canWrite && (
            <button
              onClick={() => setShowAdd(v => !v)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              <Plus className="w-3.5 h-3.5" /> 지적사항 추가
            </button>
          )}
        </div>

        {showAdd && (
          <form onSubmit={addFinding} className="px-4 py-4 bg-indigo-50/40 border-b border-indigo-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700 block mb-1">분류</label>
              <input type="text" className={field} value={newF.category} onChange={e => setNewF(f => ({ ...f, category: e.target.value }))} placeholder="예: 3. 생산공정 관리" required />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700 block mb-1">지적사항 *</label>
              <textarea className={field + " resize-none"} rows={2} value={newF.finding} onChange={e => setNewF(f => ({ ...f, finding: e.target.value }))} placeholder="지적 내용 입력" required />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">개선 실시 내용</label>
              <input type="text" className={field} value={newF.action} onChange={e => setNewF(f => ({ ...f, action: e.target.value }))} placeholder="조치 내용" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">담당자</label>
              <input type="text" className={field} value={newF.responsible} onChange={e => setNewF(f => ({ ...f, responsible: e.target.value }))} placeholder="담당자" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">완료 일정</label>
              <input type="date" className={field} value={newF.dueDate} onChange={e => setNewF(f => ({ ...f, dueDate: e.target.value }))} />
            </div>
            <div className="flex items-end gap-2">
              <button type="submit" disabled={adding} className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                {adding ? "추가 중..." : "추가"}
              </button>
              <button type="button" onClick={() => setShowAdd(false)} className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg hover:bg-slate-50">
                취소
              </button>
            </div>
          </form>
        )}

        {findings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <CheckCircle2 className="w-8 h-8 text-slate-200" />
            <p className="text-sm text-slate-400">지적사항이 없습니다.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-100">
                  <th className="text-center px-2 py-2.5 w-8">No</th>
                  <th className="text-left px-3 py-2.5 w-28">분류</th>
                  <th className="text-left px-3 py-2.5">지적사항</th>
                  <th className="text-left px-3 py-2.5 w-44">개선 실시 내용</th>
                  <th className="text-center px-2 py-2.5 w-20">담당</th>
                  <th className="text-center px-2 py-2.5 w-24">일정</th>
                  <th className="text-center px-2 py-2.5 w-20">상태</th>
                  {canWrite && <th className="w-8"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {findings.map(f => {
                  const isEditing = editId === f.id
                  return (
                    <tr key={f.id} className="hover:bg-slate-50">
                      <td className="text-center px-2 py-2 text-slate-400">{f.seq}</td>
                      {isEditing && editF ? (
                        <>
                          <td className="px-2 py-2"><input className={field} value={editF.category} onChange={e => setEditF(v => v && { ...v, category: e.target.value })} /></td>
                          <td className="px-2 py-2"><textarea className={field + " resize-none"} rows={2} value={editF.finding} onChange={e => setEditF(v => v && { ...v, finding: e.target.value })} /></td>
                          <td className="px-2 py-2"><input className={field} value={editF.action} onChange={e => setEditF(v => v && { ...v, action: e.target.value })} /></td>
                          <td className="px-2 py-2"><input className={field} value={editF.responsible} onChange={e => setEditF(v => v && { ...v, responsible: e.target.value })} /></td>
                          <td className="px-2 py-2"><input type="date" className={field} value={editF.dueDate?.slice(0, 10) ?? ""} onChange={e => setEditF(v => v && { ...v, dueDate: e.target.value || null })} /></td>
                          <td className="px-2 py-2">
                            <select className={field} value={editF.status} onChange={e => setEditF(v => v && { ...v, status: e.target.value })}>
                              <option value="OPEN">미조치</option>
                              <option value="IN_PROGRESS">처리 중</option>
                              <option value="CLOSED">완료</option>
                            </select>
                          </td>
                          <td className="px-2 py-2">
                            <div className="flex gap-1">
                              <button onClick={saveFinding} className="px-2 py-1 text-[10px] bg-indigo-600 text-white rounded hover:bg-indigo-700">저장</button>
                              <button onClick={() => { setEditId(null); setEditF(null) }} className="px-2 py-1 text-[10px] border border-slate-200 rounded hover:bg-slate-50">취소</button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-3 py-2 text-slate-500">{f.category}</td>
                          <td className="px-3 py-2 text-slate-700">{f.finding}</td>
                          <td className="px-3 py-2 text-slate-500">{f.action || "—"}</td>
                          <td className="text-center px-2 py-2 text-slate-500">{f.responsible || "—"}</td>
                          <td className="text-center px-2 py-2 text-slate-500">
                            {f.dueDate ? new Date(f.dueDate).toLocaleDateString("ko-KR") : "—"}
                          </td>
                          <td className="text-center px-2 py-2">
                            <span className={`inline-block px-2 py-0.5 rounded-full border text-[10px] font-semibold ${findingStatusCls[f.status as keyof typeof findingStatusCls] ?? ""}`}>
                              {findingStatusLabel[f.status as keyof typeof findingStatusLabel] ?? f.status}
                            </span>
                          </td>
                          {canWrite && (
                            <td className="px-2 py-2">
                              <div className="flex gap-1">
                                <button
                                  onClick={() => { setEditId(f.id); setEditF({ ...f }) }}
                                  className="text-[10px] px-1.5 py-0.5 border border-slate-200 rounded hover:bg-slate-50"
                                >수정</button>
                                <button
                                  onClick={() => deleteFinding(f.id)}
                                  className="p-0.5 text-slate-400 hover:text-rose-500"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          )}
                        </>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main export ─────────────────────────────────────────────────

type Tab = "summary" | "checklist" | "findings"

export default function QpaDetailClient({
  audit: initial,
  canWrite,
}: {
  audit: Audit
  canWrite: boolean
}) {
  const [tab,      setTab]      = useState<Tab>("summary")
  const [items,    setItems]    = useState<Item[]>(initial.items)
  const [findings, setFindings] = useState<Finding[]>(initial.findings)
  const [audit,    setAudit]    = useState(initial)

  async function handleStatusToggle() {
    const res = await fetch(`/api/qpa-audits/${audit.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "Completed" }),
    })
    if (res.ok) setAudit(a => ({ ...a, status: "Completed" }))
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "summary",   label: "요약" },
    { key: "checklist", label: `체크리스트 (${items.length}항목)` },
    { key: "findings",  label: `개선대책 (${findings.length}건)` },
  ]

  return (
    <div className="flex flex-col gap-4">
      {/* Tab nav */}
      <div className="flex border-b border-slate-200">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t.key
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "summary"   && <SummaryTab   audit={audit} items={items} canWrite={canWrite} onStatusToggle={handleStatusToggle} />}
      {tab === "checklist" && <ChecklistTab auditId={audit.id} items={items} setItems={setItems} canWrite={canWrite} />}
      {tab === "findings"  && <FindingsTab  auditId={audit.id} findings={findings} setFindings={setFindings} canWrite={canWrite} />}
    </div>
  )
}
