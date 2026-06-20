"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { uploadPresigned } from "@vercel/blob/client"
import { Button } from "@/components/ui/button"
import { FileText, Plus, X, Sparkles, Loader2, Download } from "lucide-react"

// 허용 파일 타입
const ACCEPT_TYPES = "application/pdf,.pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.xlsx,application/vnd.ms-excel,.xls,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx,application/msword,.doc"

// 카테고리 옵션
const CATEGORY_OPTIONS = [
  { value: "", label: "카테고리 선택" },
  { value: "기검요청서", label: "기검요청서" },
  { value: "고객사양서", label: "고객사양서" },
  { value: "국제규격", label: "국제규격" },
  { value: "국내규격", label: "국내규격" },
  { value: "도면", label: "도면" },
  { value: "견적서", label: "견적서" },
  { value: "기타", label: "기타" },
]

type Doc = {
  id: string
  filename: string
  uploadedAt: string
  isAnalysis: boolean
  storagePath: string
  category: string | null
}
type Props = { tenderId: string; documents: Doc[]; canManage: boolean; canAnalyze: boolean; canDeleteFiles: boolean }
type FileEntry = { id: string; file: File | null; type: "analyze" | "ref"; category: string; startPage?: number; endPage?: number }
type FirstFile = { id: string; file: File; startPage?: number; endPage?: number }

// TDS 페이지 범위 클라이언트 검증 (fail-closed) — 서버 validatePageRange와 동일 규칙.
// 둘 다 비면 null(전체), 문제 있으면 에러 메시지 반환.
function validateRangeClient(startPage?: number, endPage?: number): string | null {
  const hasStart = startPage !== undefined
  const hasEnd = endPage !== undefined
  if (!hasStart && !hasEnd) return null
  if (hasStart !== hasEnd) return "TDS 페이지는 시작·끝을 모두 입력하거나 모두 비워주세요."
  if (!Number.isInteger(startPage) || !Number.isInteger(endPage) || (startPage as number) < 1 || (endPage as number) < 1)
    return "TDS 페이지 번호는 1 이상의 정수여야 합니다."
  if ((startPage as number) > (endPage as number)) return "TDS 시작 페이지가 끝 페이지보다 큽니다."
  return null
}

function makeEntryId() { return crypto.randomUUID() }
function makeBlobPath(file: File) {
  const name = file.name.toLowerCase()
  let ext = ".pdf"
  if (name.endsWith(".xlsx")) ext = ".xlsx"
  else if (name.endsWith(".xls")) ext = ".xls"
  else if (name.endsWith(".docx")) ext = ".docx"
  else if (name.endsWith(".doc")) ext = ".doc"
  return `tender-documents/${crypto.randomUUID()}${ext}`
}

const EMPTY_ENTRY = (): FileEntry => ({ id: makeEntryId(), file: null, type: "analyze", category: "" })

// 파일별 TDS 페이지 범위 입력 행 — 비우면 전체 추출
function TdsRangeRow({ startPage, endPage, disabled, onChange }: {
  startPage?: number
  endPage?: number
  disabled: boolean
  onChange: (start?: number, end?: number) => void
}) {
  const bothFilled = startPage !== undefined && endPage !== undefined
  const valid = bothFilled && (endPage as number) >= (startPage as number)
  const pages = valid ? (endPage as number) - (startPage as number) + 1 : null
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] font-bold text-indigo-400 shrink-0">TDS 페이지</span>
      <input type="number" min={1} placeholder="시작" value={startPage ?? ""} disabled={disabled}
        onChange={(e) => onChange(e.target.value === "" ? undefined : parseInt(e.target.value, 10), endPage)}
        className="w-14 border border-indigo-200 rounded px-1.5 py-0.5 text-[11px] text-indigo-800 bg-white text-center disabled:opacity-40" />
      <span className="text-[10px] text-indigo-300">~</span>
      <input type="number" min={1} placeholder="끝" value={endPage ?? ""} disabled={disabled}
        onChange={(e) => onChange(startPage, e.target.value === "" ? undefined : parseInt(e.target.value, 10))}
        className="w-14 border border-indigo-200 rounded px-1.5 py-0.5 text-[11px] text-indigo-800 bg-white text-center disabled:opacity-40" />
      <span className={`text-[10px] ${bothFilled && !valid ? "text-rose-500 font-bold" : "text-indigo-400"}`}>
        {pages ? `(${pages}페이지)` : bothFilled && !valid ? "범위 확인" : "비우면 전체"}
      </span>
    </div>
  )
}

export default function FilesPanel({ tenderId, documents, canManage, canAnalyze, canDeleteFiles }: Props) {
  const router = useRouter()
  const analyzeRef = useRef<HTMLInputElement>(null)
  const fileRefs = useRef<Map<string, HTMLInputElement>>(new Map())

  // 최초 분석 (canAnalyze)
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeElapsed, setAnalyzeElapsed] = useState(0)
  const [firstCategory, setFirstCategory] = useState("")
  const [firstFiles, setFirstFiles] = useState<FirstFile[]>([])

  // 새 버전 분석 추가 (canManage) — 인라인 폼
  const [showReanalyzeForm, setShowReanalyzeForm] = useState(false)
  const [entries, setEntries] = useState<FileEntry[]>([EMPTY_ENTRY()])
  const [searchWeb, setSearchWeb] = useState(false)
  const [reanalyzing, setReanalyzing] = useState(false)
  const [reanalyzeElapsed, setReanalyzeElapsed] = useState(0)
  const [reanalyzeProgress, setReanalyzeProgress] = useState(0)

  const [deletingId, setDeletingId] = useState<string | null>(null)

  // ── 최초 분석 ─────────────────────────────────────────
  function addFirstFiles(files: FileList | null) {
    if (!files) return
    const added: FirstFile[] = Array.from(files).map((file) => ({ id: makeEntryId(), file }))
    setFirstFiles((prev) => [...prev, ...added])
  }
  function setFirstRange(id: string, startPage?: number, endPage?: number) {
    setFirstFiles((p) => p.map((ff) => ff.id === id ? { ...ff, startPage, endPage } : ff))
  }
  function removeFirstFile(id: string) { setFirstFiles((p) => p.filter((ff) => ff.id !== id)) }

  async function handleFirstAnalyze() {
    if (firstFiles.length === 0 || analyzing) return
    // 클라이언트 검증 (fail-closed) — 잘못된 범위면 업로드 전에 차단
    for (const ff of firstFiles) {
      const err = validateRangeClient(ff.startPage, ff.endPage)
      if (err) { alert(`"${ff.file.name}": ${err}`); return }
    }
    setAnalyzing(true); setAnalyzeElapsed(0)
    const start = Date.now()
    const timer = setInterval(() => setAnalyzeElapsed(Math.floor((Date.now() - start) / 1000)), 1000)
    try {
      const docIds: string[] = []
      const ranges: { documentId: string; startPage: number; endPage: number }[] = []
      for (const ff of firstFiles) {
        const blob = await uploadPresigned(makeBlobPath(ff.file), ff.file, { access: "private", handleUploadUrl: "/api/blob-upload" })
        const res = await fetch(`/api/tenders/${tenderId}/documents`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ blobUrl: blob.url, filename: ff.file.name, isAnalysisSource: true, category: firstCategory || null }),
        })
        if (!res.ok) { alert("문서 등록 실패"); return }
        const documentId = (await res.json() as { documentId: string }).documentId
        docIds.push(documentId)
        if (ff.startPage && ff.endPage) ranges.push({ documentId, startPage: ff.startPage, endPage: ff.endPage })
      }
      const res = await fetch(`/api/tenders/${tenderId}/analyze`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentIds: docIds, ranges }),
      })
      if (!res.ok) { alert((await res.json().catch(() => ({}))).error ?? "분석 실패"); return }
      const { truncated } = await res.json() as { truncated: boolean }
      setFirstFiles([])
      router.push(`/tender/${tenderId}${truncated ? "?truncated=1" : ""}`); router.refresh()
    } catch { alert("네트워크 오류가 발생했습니다.") }
    finally { clearInterval(timer); setAnalyzing(false) }
  }

  // ── 새 버전 분석 폼 ────────────────────────────────────
  function addEntry() { setEntries((p) => [...p, EMPTY_ENTRY()]) }
  function removeEntry(id: string) { setEntries((p) => p.filter((e) => e.id !== id)) }
  function setFile(id: string, file: File | null) { setEntries((p) => p.map((e) => e.id === id ? { ...e, file } : e)) }
  function setType(id: string, type: "analyze" | "ref") { setEntries((p) => p.map((e) => e.id === id ? { ...e, type } : e)) }
  function setCategory(id: string, category: string) { setEntries((p) => p.map((e) => e.id === id ? { ...e, category } : e)) }
  function setRange(id: string, startPage?: number, endPage?: number) { setEntries((p) => p.map((e) => e.id === id ? { ...e, startPage, endPage } : e)) }
  function resetForm() { setEntries([EMPTY_ENTRY()]); setSearchWeb(false); setReanalyzeProgress(0); setShowReanalyzeForm(false) }

  async function handleReanalyze() {
    const analyzeEntries = entries.filter((e) => e.file && e.type === "analyze")
    const refEntries = entries.filter((e) => e.file && e.type === "ref")
    if (analyzeEntries.length === 0 && refEntries.length === 0) { alert("파일을 하나 이상 선택해주세요."); return }

    // TDS 범위 클라이언트 검증 (fail-closed) — 분석용 파일만
    for (const entry of analyzeEntries) {
      const err = validateRangeClient(entry.startPage, entry.endPage)
      if (err) { alert(`"${entry.file?.name}": ${err}`); return }
    }

    setReanalyzing(true); setReanalyzeElapsed(0); setReanalyzeProgress(5)
    const start = Date.now()
    const timer = setInterval(() => setReanalyzeElapsed(Math.floor((Date.now() - start) / 1000)), 1000)
    const progressTimer = setInterval(() => setReanalyzeProgress((p) => p < 85 ? p + 0.8 : p), 600)

    try {
      // 참고용 파일 먼저 업로드
      for (const entry of refEntries) {
        if (!entry.file) continue
        const blob = await uploadPresigned(makeBlobPath(entry.file), entry.file, { access: "private", handleUploadUrl: "/api/blob-upload" })
        await fetch(`/api/tenders/${tenderId}/documents`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ blobUrl: blob.url, filename: entry.file.name, isAnalysisSource: false, category: entry.category || null }),
        })
      }

      if (analyzeEntries.length === 0) {
        router.refresh(); resetForm(); return
      }

      const analyzeFiles: { blobUrl: string; filename: string; startPage?: number; endPage?: number }[] = []
      for (const entry of analyzeEntries) {
        if (!entry.file) continue
        const blob = await uploadPresigned(makeBlobPath(entry.file), entry.file, { access: "private", handleUploadUrl: "/api/blob-upload" })
        analyzeFiles.push({
          blobUrl: blob.url,
          filename: entry.file.name,
          ...(entry.startPage && entry.endPage ? { startPage: entry.startPage, endPage: entry.endPage } : {}),
        })
        // 분석용도 category 저장 (reanalyze 라우트가 별도 document 생성하므로 여기선 등록 생략)
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
            {d.category && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-violet-50 text-violet-600 shrink-0 border border-violet-100">
                {d.category}
              </span>
            )}
            <span className="text-zinc-700 truncate flex-1">{d.filename}</span>
            <span className="text-xs text-zinc-400 shrink-0">{new Date(d.uploadedAt).toLocaleDateString("ko-KR")}</span>
            {/* 다운로드 버튼 */}
            <a
              href={`/api/blob/serve?url=${encodeURIComponent(d.storagePath)}`}
              download={d.filename}
              className="text-zinc-400 hover:text-zinc-700 shrink-0 transition-colors"
              title="다운로드"
            >
              <Download className="w-3.5 h-3.5" />
            </a>
            {canDeleteFiles && (
              <button onClick={() => handleDelete(d.id, d.filename)} disabled={deletingId === d.id}
                className="text-xs text-red-400 hover:text-red-600 shrink-0 disabled:opacity-40">삭제</button>
            )}
          </li>
        ))}
        {documents.length === 0 && <li className="text-xs text-zinc-400">첨부된 파일이 없습니다.</li>}
      </ul>

      <div className="pt-1 border-t space-y-3">

        {/* 최초 분석 */}
        {canAnalyze && (
          <div className="space-y-2">
            {/* 카테고리 선택 */}
            <select
              value={firstCategory}
              onChange={(e) => setFirstCategory(e.target.value)}
              disabled={analyzing}
              className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-700 w-full"
            >
              {CATEGORY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            {/* 스테이징된 분석 파일 — PDF는 TDS 페이지 범위 지정 가능 */}
            {firstFiles.length > 0 && (
              <ul className="space-y-2">
                {firstFiles.map((ff) => (
                  <li key={ff.id} className="bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span className="text-xs text-indigo-800 font-medium flex-1 truncate">{ff.file.name}</span>
                      <button onClick={() => removeFirstFile(ff.id)} disabled={analyzing}
                        className="text-indigo-300 hover:text-indigo-600 disabled:opacity-40 transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {ff.file.name.toLowerCase().endsWith(".pdf") && (
                      <div className="pl-5">
                        <TdsRangeRow startPage={ff.startPage} endPage={ff.endPage} disabled={analyzing}
                          onChange={(s, e) => setFirstRange(ff.id, s, e)} />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <input ref={analyzeRef} type="file" accept={ACCEPT_TYPES} multiple className="hidden"
              onChange={(e) => { addFirstFiles(e.target.files); e.target.value = "" }} />
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" variant="outline" disabled={analyzing} onClick={() => analyzeRef.current?.click()}>
                <Plus className="w-3.5 h-3.5 mr-1" /> 분석 파일 추가
              </Button>
              {firstFiles.length > 0 && (
                <Button size="sm" disabled={analyzing} onClick={handleFirstAnalyze}>
                  {analyzing ? `분석 중… ${analyzeElapsed}초` : `${firstFiles.length}개 파일로 분석 시작`}
                </Button>
              )}
            </div>
            <p className="text-xs text-zinc-400">
              {analyzing
                ? "파일 추출 + AI 분석 중입니다 (30~90초 소요)"
                : firstFiles.length > 0
                  ? "PDF는 TDS 페이지 범위를 지정할 수 있습니다 (비우면 전체)"
                  : "PDF·Excel·Word 파일을 선택하세요"}
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
                <div key={entry.id} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <input
                      ref={(el) => { if (el) fileRefs.current.set(entry.id, el); else fileRefs.current.delete(entry.id) }}
                      type="file" accept={ACCEPT_TYPES} className="hidden" disabled={reanalyzing}
                      onChange={(e) => { setFile(entry.id, e.target.files?.[0] ?? null); e.target.value = "" }}
                    />
                    <button type="button" disabled={reanalyzing}
                      onClick={() => fileRefs.current.get(entry.id)?.click()}
                      className="flex-1 text-left text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 truncate transition-colors text-slate-500 font-medium flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{entry.file ? entry.file.name : "파일 선택 (PDF·Excel·Word)..."}</span>
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
                  {/* 카테고리 선택 */}
                  <select
                    value={entry.category}
                    disabled={reanalyzing}
                    onChange={(e) => setCategory(entry.id, e.target.value)}
                    className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-600 w-full"
                  >
                    {CATEGORY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  {/* TDS 페이지 범위 — 분석용 PDF에만 노출 */}
                  {entry.type === "analyze" && entry.file?.name.toLowerCase().endsWith(".pdf") && (
                    <TdsRangeRow startPage={entry.startPage} endPage={entry.endPage} disabled={reanalyzing}
                      onChange={(s, e) => setRange(entry.id, s, e)} />
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
