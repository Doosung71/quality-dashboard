"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { uploadPresigned } from "@vercel/blob/client"
import { Button } from "@/components/ui/button"
import { FileText, Plus, X, Sparkles, Loader2 } from "lucide-react"

type Doc = { id: string; filename: string; uploadedAt: string; isAnalysis: boolean }
type Props = { tenderId: string; documents: Doc[]; canManage: boolean; canAnalyze: boolean; canDeleteFiles: boolean }
type FileEntry = { id: string; file: File | null; type: "analyze" | "ref" }

function makeEntryId() { return crypto.randomUUID() }
function makeBlobPath(file: File) {
  const ext = file.name.toLowerCase().endsWith(".pdf") ? ".pdf" : ""
  return `tender-documents/${crypto.randomUUID()}${ext}`
}

const EMPTY_ENTRY = (): FileEntry => ({ id: makeEntryId(), file: null, type: "analyze" })

export default function FilesPanel({ tenderId, documents, canManage, canAnalyze, canDeleteFiles }: Props) {
  const router = useRouter()
  const analyzeRef = useRef<HTMLInputElement>(null)
  const fileRefs = useRef<Map<string, HTMLInputElement>>(new Map())

  // 최초 분석 (canAnalyze)
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeElapsed, setAnalyzeElapsed] = useState(0)

  // 새 버전 분석 추가 (canManage) — 인라인 폼
  const [showReanalyzeForm, setShowReanalyzeForm] = useState(false)
  const [entries, setEntries] = useState<FileEntry[]>([EMPTY_ENTRY()])
  const [searchWeb, setSearchWeb] = useState(false)
  const [reanalyzing, setReanalyzing] = useState(false)
  const [reanalyzeElapsed, setReanalyzeElapsed] = useState(0)
  const [reanalyzeProgress, setReanalyzeProgress] = useState(0)

  const [deletingId, setDeletingId] = useState<string | null>(null)

  // ── 최초 분석 ─────────────────────────────────────────
  async function handleFirstAnalyze(files: FileList) {
    if (files.length === 0) return
    setAnalyzing(true); setAnalyzeElapsed(0)
    const start = Date.now()
    const timer = setInterval(() => setAnalyzeElapsed(Math.floor((Date.now() - start) / 1000)), 1000)
    try {
      const docIds: string[] = []
      for (const file of Array.from(files)) {
        const blob = await uploadPresigned(makeBlobPath(file), file, { access: "private", handleUploadUrl: "/api/blob-upload" })
        const res = await fetch(`/api/tenders/${tenderId}/documents`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ blobUrl: blob.url, filename: file.name, isAnalysisSource: true }),
        })
        if (!res.ok) { alert("문서 등록 실패"); return }
        docIds.push((await res.json() as { documentId: string }).documentId)
      }
      const res = await fetch(`/api/tenders/${tenderId}/analyze`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentIds: docIds }),
      })
      if (!res.ok) { alert((await res.json().catch(() => ({}))).error ?? "분석 실패"); return }
      const { truncated } = await res.json() as { truncated: boolean }
      router.push(`/tender/${tenderId}${truncated ? "?truncated=1" : ""}`); router.refresh()
    } catch { alert("네트워크 오류가 발생했습니다.") }
    finally { clearInterval(timer); setAnalyzing(false) }
  }

  // ── 새 버전 분석 폼 ────────────────────────────────────
  function addEntry() { setEntries((p) => [...p, EMPTY_ENTRY()]) }
  function removeEntry(id: string) { setEntries((p) => p.filter((e) => e.id !== id)) }
  function setFile(id: string, file: File | null) { setEntries((p) => p.map((e) => e.id === id ? { ...e, file } : e)) }
  function setType(id: string, type: "analyze" | "ref") { setEntries((p) => p.map((e) => e.id === id ? { ...e, type } : e)) }
  function resetForm() { setEntries([EMPTY_ENTRY()]); setSearchWeb(false); setReanalyzeProgress(0); setShowReanalyzeForm(false) }

  async function handleReanalyze() {
    const analyzeEntries = entries.filter((e) => e.file && e.type === "analyze")
    const refEntries = entries.filter((e) => e.file && e.type === "ref")
    if (analyzeEntries.length === 0 && refEntries.length === 0) { alert("파일을 하나 이상 선택해주세요."); return }

    setReanalyzing(true); setReanalyzeElapsed(0); setReanalyzeProgress(5)
    const start = Date.now()
    const timer = setInterval(() => setReanalyzeElapsed(Math.floor((Date.now() - start) / 1000)), 1000)
    const progressTimer = setInterval(() => setReanalyzeProgress((p) => p < 85 ? p + 0.8 : p), 600)

    try {
      // 참고용 파일 먼저 업로드 (별도 document 등록)
      for (const entry of refEntries) {
        if (!entry.file) continue
        const blob = await uploadPresigned(makeBlobPath(entry.file), entry.file, { access: "private", handleUploadUrl: "/api/blob-upload" })
        await fetch(`/api/tenders/${tenderId}/documents`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ blobUrl: blob.url, filename: entry.file.name, isAnalysisSource: false }),
        })
      }

      // 분석용 파일이 없으면 참고 파일만 추가하고 종료
      if (analyzeEntries.length === 0) {
        router.refresh(); resetForm(); return
      }

      // 분석용 파일 업로드 후 재분석
      const analyzeFiles: { blobUrl: string; filename: string }[] = []
      for (const entry of analyzeEntries) {
        if (!entry.file) continue
        const blob = await uploadPresigned(makeBlobPath(entry.file), entry.file, { access: "private", handleUploadUrl: "/api/blob-upload" })
        analyzeFiles.push({ blobUrl: blob.url, filename: entry.file.name })
      }

      const res = await fetch(`/api/tenders/${tenderId}/reanalyze`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: analyzeFiles, searchWeb }),
      })
      if (!res.ok) { alert((await res.json().catch(() => ({}))).error ?? "재분석 실패"); return }
      const { truncated } = await res.json()
      setReanalyzeProgress(100)
      router.push(`/tender/${tenderId}${truncated ? "?truncated=1" : ""}`); router.refresh()
      resetForm()
    } catch { alert("네트워크 오류가 발생했습니다.") }
    finally { clearInterval(timer); clearInterval(progressTimer); setReanalyzing(false) }
  }

  // ── 파일 삭제 ──────────────────────────────────────────
  async function handleDelete(docId: string, filename: string) {
    if (!confirm(`"${filename}"을 삭제하시겠습니까?`)) return
    setDeletingId(docId)
    const res = await fetch(`/api/tenders/${tenderId}/documents/${docId}`, { method: "DELETE" })
    setDeletingId(null)
    if (!res.ok) alert((await res.json().catch(() => ({}))).error ?? "삭제 실패")
    else router.refresh()
  }

  const hasAnyFile = entries.some((e) => e.file)

  return (
    <section className="bg-white border rounded-lg p-4 space-y-4">
      <h2 className="text-sm font-semibold text-zinc-700">파일 관리</h2>

      {/* 등록된 파일 목록 */}
      <ul className="space-y-1">
        {documents.map((d) => (
          <li key={d.id} className="flex items-center gap-2 text-sm">
            <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${d.isAnalysis ? "bg-blue-100 text-blue-700" : "bg-zinc-100 text-zinc-500"}`}>
              {d.isAnalysis ? "분석" : "참고"}
            </span>
            <span className="text-zinc-700 truncate flex-1">{d.filename}</span>
            <span className="text-xs text-zinc-400 shrink-0">{new Date(d.uploadedAt).toLocaleDateString("ko-KR")}</span>
            {canDeleteFiles && (
              <button onClick={() => handleDelete(d.id, d.filename)} disabled={deletingId === d.id}
                className="text-xs text-red-400 hover:text-red-600 shrink-0 disabled:opacity-40">삭제</button>
            )}
          </li>
        ))}
        {documents.length === 0 && <li className="text-xs text-zinc-400">첨부된 파일이 없습니다.</li>}
      </ul>

      <div className="pt-1 border-t space-y-3">

        {/* 최초 분석 버튼 */}
        {canAnalyze && (
          <div>
            <input ref={analyzeRef} type="file" accept="application/pdf" multiple className="hidden"
              onChange={(e) => { if (e.target.files?.length) handleFirstAnalyze(e.target.files); e.target.value = "" }} />
            <Button size="sm" disabled={analyzing} onClick={() => analyzeRef.current?.click()}>
              {analyzing ? `분석 중… ${analyzeElapsed}초` : "분석 시작"}
            </Button>
            <p className="text-xs text-zinc-400 mt-1">
              {analyzing ? "PDF 텍스트 추출 + AI 분석 중입니다 (30~90초 소요)" : "Tender · 기검요청서 등 분석할 PDF를 선택하세요"}
            </p>
          </div>
        )}

        {/* 새 버전 분석 추가 — 인라인 폼 */}
        {canManage && !showReanalyzeForm && (
          <Button size="sm" variant="outline" onClick={() => setShowReanalyzeForm(true)}>
            새 버전 분석 추가
          </Button>
        )}

        {canManage && showReanalyzeForm && (
          <div className="border border-slate-200 rounded-xl p-3 space-y-3 bg-slate-50/50">
            <p className="text-xs font-bold text-slate-700">새 버전 분석 파일 선택</p>

            {/* 파일 엔트리 목록 */}
            <div className="space-y-2">
              {entries.map((entry) => (
                <div key={entry.id} className="flex items-center gap-2">
                  <input
                    ref={(el) => { if (el) fileRefs.current.set(entry.id, el); else fileRefs.current.delete(entry.id) }}
                    type="file" accept="application/pdf" className="hidden" disabled={reanalyzing}
                    onChange={(e) => { setFile(entry.id, e.target.files?.[0] ?? null); e.target.value = "" }}
                  />
                  <button type="button" disabled={reanalyzing}
                    onClick={() => fileRefs.current.get(entry.id)?.click()}
                    className="flex-1 text-left text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 truncate transition-colors text-slate-500 font-medium flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{entry.file ? entry.file.name : "PDF 파일 선택..."}</span>
                  </button>
                  <select value={entry.type} disabled={reanalyzing}
                    onChange={(e) => setType(entry.id, e.target.value as "analyze" | "ref")}
                    className="text-xs border border-slate-200 rounded-lg px-2 py-2 bg-slate-50 font-bold text-slate-700 shrink-0 cursor-pointer">
                    <option value="analyze">분석용</option>
                    <option value="ref">참고용</option>
                  </select>
                  {entries.length > 1 && (
                    <button type="button" disabled={reanalyzing} onClick={() => removeEntry(entry.id)}
                      className="text-slate-400 hover:text-slate-700 shrink-0 p-1 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* + 파일 추가 */}
            <button type="button" disabled={reanalyzing} onClick={addEntry}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 bg-indigo-50 px-2.5 py-1.5 rounded-lg border border-indigo-100/50 transition-all disabled:opacity-40">
              <Plus className="w-3.5 h-3.5" /> 파일 추가
            </button>

            {/* 웹 검색 체크박스 */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={searchWeb} disabled={reanalyzing}
                onChange={(e) => setSearchWeb(e.target.checked)}
                className="w-3.5 h-3.5 accent-slate-950 cursor-pointer" />
              <span className="text-[10px] font-bold text-slate-500">실시간 외부 웹 검색 포함 (하이브리드 AI 분석)</span>
            </label>

            {/* 진행 표시 */}
            {reanalyzing && (
              <div className="space-y-1.5">
                <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-slate-950 rounded-full transition-all duration-500" style={{ width: `${reanalyzeProgress}%` }} />
                </div>
                <p className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> AI 분석 중… {reanalyzeElapsed}초 경과
                </p>
              </div>
            )}

            {/* 버튼 */}
            <div className="flex gap-2">
              <button type="button" disabled={reanalyzing || !hasAnyFile} onClick={handleReanalyze}
                className="flex items-center gap-1.5 text-xs font-extrabold bg-slate-950 hover:bg-slate-800 text-white px-4 py-2 rounded-lg transition-all disabled:opacity-40">
                {reanalyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                {reanalyzing ? "분석 중…" : "분석 시작"}
              </button>
              <button type="button" disabled={reanalyzing} onClick={resetForm}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 px-3 py-2 rounded-lg transition-colors disabled:opacity-40">
                취소
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
