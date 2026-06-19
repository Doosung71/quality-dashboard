"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import ComplyMark from "./ComplyMark"
import DeviationMark from "./DeviationMark"
import { Sparkles, Loader2, ChevronDown, ChevronUp } from "lucide-react"

// 펼친 상태에서 내용 길이에 맞게 높이 자동 조절되는 textarea
function AutoTextarea({ value, onChange, expanded, className }: {
  value: string; onChange: (v: string) => void; expanded: boolean; className?: string
}) {
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (expanded) {
      el.style.height = "auto"
      el.style.height = el.scrollHeight + "px"
    } else {
      el.style.height = ""
    }
  }, [value, expanded])

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => {
        onChange(e.target.value)
        if (expanded) {
          e.target.style.height = "auto"
          e.target.style.height = e.target.scrollHeight + "px"
        }
      }}
      rows={expanded ? undefined : 3}
      className={`w-full border rounded px-2 py-1 text-sm mt-0.5 transition-all duration-200 ${expanded ? "resize-none overflow-hidden" : "resize-none"} ${className ?? ""}`}
      style={expanded ? { minHeight: "7rem" } : undefined}
    />
  )
}

type ComplianceStatus = "COMPLY" | "NON_COMPLY" | "TBD"
type DeviationType = "DEVIATION" | "CLARIFICATION" | "ASSUMPTION"

type Req = {
  id: string
  category: string
  content: string
  sourcePage: number | null
  sourceText: string | null
  isRisk: boolean
  isVE: boolean
  isManual: boolean
  comply: ComplianceStatus | null
  remark: string | null
  deviationType: DeviationType | null
  deviationText: string | null
}

type EditFields = { category: string; content: string; isRisk: boolean; isVE: boolean; sourcePage: number | null }

type Props = { analysisId: string; requirements: Req[] }

const EMPTY_NEW = { category: "", content: "", isRisk: false, isVE: false }

export default function RequirementsEdit({ analysisId, requirements: initial }: Props) {
  const router = useRouter()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<EditFields>({
    category: "", content: "", isRisk: false, isVE: false, sourcePage: null,
  })
  const [showAdd, setShowAdd] = useState(false)
  const [newReq, setNewReq] = useState(EMPTY_NEW)
  const [busy, setBusy] = useState(false)
  const [complyMap, setComplyMap] = useState<Record<string, ComplianceStatus | null>>(
    () => Object.fromEntries(initial.map((r) => [r.id, r.comply]))
  )
  const [searchWebAdd, setSearchWebAdd] = useState(false)
  const [searchWebEdit, setSearchWebEdit] = useState(false)
  const [suggesting, setSuggesting] = useState(false)
  const [expandedAdd, setExpandedAdd] = useState(false)
  const [expandedEdit, setExpandedEdit] = useState(false)

  async function suggestContent(
    category: string, hint: string, searchWeb: boolean,
    onResult: (c: string) => void, onExpand: () => void
  ) {
    if (!category.trim()) { alert("분류를 먼저 입력하세요."); return }
    setSuggesting(true)
    try {
      const res = await fetch(`/api/analysis/${analysisId}/requirements/suggest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, hint, searchWeb }),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); alert((d as {error?:string}).error ?? "AI 제안 실패"); return }
      const { content } = await res.json() as { content: string }
      onResult(content)
      onExpand()
    } catch { alert("네트워크 오류가 발생했습니다.") }
    finally { setSuggesting(false) }
  }

  async function apiCall(url: string, method: string, body?: object) {
    setBusy(true)
    const res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
    setBusy(false)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      alert((d as { error?: string }).error ?? "오류가 발생했습니다.")
      return false
    }
    router.refresh()
    return true
  }

  function startEdit(r: Req) {
    setEditingId(r.id)
    setEditValues({ category: r.category, content: r.content, isRisk: r.isRisk, isVE: r.isVE, sourcePage: r.sourcePage } satisfies EditFields)
  }

  async function saveEdit(id: string) {
    const ok = await apiCall(`/api/requirements/${id}`, "PATCH", editValues)
    if (ok) setEditingId(null)
  }

  async function deleteReq(id: string) {
    if (!confirm("이 요구사항을 삭제하시겠습니까?")) return
    await apiCall(`/api/requirements/${id}`, "DELETE")
  }

  async function addReq() {
    const body = {
      category: newReq.category,
      content: newReq.content,
      isRisk: newReq.isRisk,
      isVE: newReq.isVE,
    }
    const ok = await apiCall(`/api/analysis/${analysisId}/requirements`, "POST", body)
    if (ok) { setShowAdd(false); setNewReq(EMPTY_NEW) }
  }

  return (
    <div className="space-y-2">
      <ul className="space-y-2">
        {initial.map((r) =>
          editingId === r.id ? (
            <li key={r.id} className="border rounded-lg p-3 bg-zinc-50 space-y-2">
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs text-zinc-500">분류</label>
                  <input className="w-full border rounded px-2 py-1 text-sm mt-0.5"
                    value={editValues.category}
                    onChange={(e) => setEditValues((v) => ({ ...v, category: e.target.value }))} />
                </div>
                <div className="w-20">
                  <label className="text-xs text-zinc-500">페이지</label>
                  <input className="w-full border rounded px-2 py-1 text-sm mt-0.5" type="number"
                    value={editValues.sourcePage ?? ""}
                    onChange={(e) => setEditValues((v) => ({ ...v, sourcePage: e.target.value ? parseInt(e.target.value) : null }))} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-zinc-500">내용</label>
                    <button type="button" onClick={() => setExpandedEdit((v) => !v)}
                      className="flex items-center gap-0.5 text-[10px] text-zinc-400 hover:text-zinc-700 transition-colors">
                      {expandedEdit ? <><ChevronUp className="w-3 h-3" />접기</> : <><ChevronDown className="w-3 h-3" />펼치기</>}
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1 cursor-pointer select-none">
                      <input type="checkbox" checked={searchWebEdit} disabled={suggesting}
                        onChange={(e) => setSearchWebEdit(e.target.checked)}
                        className="w-3 h-3 accent-slate-950" />
                      <span className="text-[10px] text-zinc-400 font-medium">웹 검색 포함</span>
                    </label>
                    <button type="button" disabled={suggesting}
                      onClick={() => suggestContent(editValues.category, editValues.content, searchWebEdit, (c) => setEditValues((v) => ({ ...v, content: c })), () => setExpandedEdit(true))}
                      className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 disabled:opacity-40 transition-all">
                      {suggesting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      AI 제안
                    </button>
                  </div>
                </div>
                <AutoTextarea
                  value={editValues.content}
                  onChange={(c) => setEditValues((v) => ({ ...v, content: c }))}
                  expanded={expandedEdit} />
              </div>
              <div className="flex gap-4 text-sm">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={editValues.isRisk} onChange={(e) => setEditValues((v) => ({ ...v, isRisk: e.target.checked }))} />
                  <span className="text-red-600">RISK</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={editValues.isVE} onChange={(e) => setEditValues((v) => ({ ...v, isVE: e.target.checked }))} />
                  <span className="text-blue-600">VE</span>
                </label>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => saveEdit(r.id)} disabled={busy}>저장</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>취소</Button>
              </div>
            </li>
          ) : (
            <li key={r.id} className="border-b last:border-0 pb-2 last:pb-0 flex gap-2 items-start group">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs px-1.5 py-0.5 bg-zinc-100 rounded text-zinc-500">{r.category}</span>
                  {r.isRisk && <span className="text-xs px-1.5 py-0.5 bg-red-100 rounded text-red-600">RISK</span>}
                  {r.isVE && <span className="text-xs px-1.5 py-0.5 bg-blue-100 rounded text-blue-600">VE</span>}
                  {r.isManual && <span className="text-xs px-1.5 py-0.5 bg-amber-50 border border-amber-200 rounded text-amber-700">✏ 수동 추가</span>}
                  {r.sourcePage && <span className="text-xs text-zinc-400">p.{r.sourcePage}</span>}
                </div>
                <p className="text-sm text-zinc-800">{r.content}</p>
                <ComplyMark
                  requirementId={r.id}
                  initialComply={r.comply}
                  initialRemark={r.remark}
                  canEdit={true}
                  onComplyChange={(status) =>
                    setComplyMap((prev) => ({ ...prev, [r.id]: status }))
                  }
                />
                <DeviationMark
                  requirementId={r.id}
                  initialType={r.deviationType}
                  initialText={r.deviationText}
                  canEdit={true}
                  complyStatus={complyMap[r.id] ?? null}
                />
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <Button size="sm" variant="ghost" className="text-xs h-7 px-2" onClick={() => startEdit(r)}>편집</Button>
                <Button size="sm" variant="ghost" className="text-xs h-7 px-2 text-red-400 hover:text-red-600"
                  onClick={() => deleteReq(r.id)} disabled={busy}>삭제</Button>
              </div>
            </li>
          )
        )}
      </ul>

      {showAdd ? (
        <div className="border rounded-lg p-3 bg-zinc-50 space-y-2 mt-2">
          <p className="text-sm font-medium text-zinc-700">요구사항 추가</p>
          <div>
            <label className="text-xs text-zinc-500">분류</label>
            <input className="w-full border rounded px-2 py-1 text-sm mt-0.5" placeholder="예: 케이블, QA"
              value={newReq.category} onChange={(e) => setNewReq((v) => ({ ...v, category: e.target.value }))} />
          </div>
          <div>
            <div className="flex items-center justify-between mb-0.5">
              <div className="flex items-center gap-2">
                <label className="text-xs text-zinc-500">내용</label>
                <button type="button" onClick={() => setExpandedAdd((v) => !v)}
                  className="flex items-center gap-0.5 text-[10px] text-zinc-400 hover:text-zinc-700 transition-colors">
                  {expandedAdd ? <><ChevronUp className="w-3 h-3" />접기</> : <><ChevronDown className="w-3 h-3" />펼치기</>}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1 cursor-pointer select-none">
                  <input type="checkbox" checked={searchWebAdd} disabled={suggesting}
                    onChange={(e) => setSearchWebAdd(e.target.checked)}
                    className="w-3 h-3 accent-slate-950" />
                  <span className="text-[10px] text-zinc-400 font-medium">웹 검색 포함</span>
                </label>
                <button type="button" disabled={suggesting}
                  onClick={() => suggestContent(newReq.category, newReq.content, searchWebAdd, (c) => setNewReq((v) => ({ ...v, content: c })), () => setExpandedAdd(true))}
                  className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 disabled:opacity-40 transition-all">
                  {suggesting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  AI 제안
                </button>
              </div>
            </div>
            <AutoTextarea
              value={newReq.content}
              onChange={(c) => setNewReq((v) => ({ ...v, content: c }))}
              expanded={expandedAdd} />
          </div>
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={newReq.isRisk} onChange={(e) => setNewReq((v) => ({ ...v, isRisk: e.target.checked }))} />
              <span className="text-red-600">RISK</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={newReq.isVE} onChange={(e) => setNewReq((v) => ({ ...v, isVE: e.target.checked }))} />
              <span className="text-blue-600">VE</span>
            </label>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={addReq} disabled={busy || !newReq.category.trim() || !newReq.content.trim()}>추가</Button>
            <Button size="sm" variant="ghost" onClick={() => { setShowAdd(false); setNewReq(EMPTY_NEW) }}>취소</Button>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="outline" className="w-full mt-2" onClick={() => setShowAdd(true)}>
          + 요구사항 추가
        </Button>
      )}
    </div>
  )
}
