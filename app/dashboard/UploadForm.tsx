"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { uploadPresigned } from "@vercel/blob/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  PlusCircle, 
  Upload, 
  FileText, 
  FileCheck, 
  Sparkles, 
  Loader2, 
  X,
  Plus
} from "lucide-react"

type FileEntry = { id: string; file: File | null; type: "analyze" | "ref" }
type Step = "idle" | "uploading" | "analyzing" | "done"

function makeEntryId() { return crypto.randomUUID() }
function makeBlobPath(file: File) {
  const ext = file.name.toLowerCase().endsWith(".pdf") ? ".pdf" : ""
  return `tender-documents/${crypto.randomUUID()}${ext}`
}

export default function UploadForm() {
  const router = useRouter()

  const [entries, setEntries] = useState<FileEntry[]>(() => [
    { id: makeEntryId(), file: null, type: "analyze" },
  ])
  const [step, setStep] = useState<Step>("idle")
  const [progress, setProgress] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [analyzeStart, setAnalyzeStart] = useState(0)
  const [error, setError] = useState<string>()
  const fileRefs = useRef<Map<string, HTMLInputElement>>(new Map())

  const isPending = step === "uploading" || step === "analyzing"
  const analyzeCount = entries.filter((e) => e.type === "analyze" && e.file).length
  const hasAnyFile = entries.some((e) => e.file)

  useEffect(() => {
    if (step !== "analyzing" || analyzeStart === 0) return
    const t = setInterval(
      () => setElapsed(Math.floor((Date.now() - analyzeStart) / 1000)),
      1000,
    )
    return () => clearInterval(t)
  }, [step, analyzeStart])

  useEffect(() => {
    if (step === "idle" || step === "done") return
    const target = step === "uploading" ? 25 : 88
    const increment = step === "uploading" ? 3 : 0.6
    const interval = step === "uploading" ? 150 : 600
    const t = setInterval(() => {
      setProgress((prev) => {
        if (prev >= target) { clearInterval(t); return prev }
        return Math.min(prev + increment, target)
      })
    }, interval)
    return () => clearInterval(t)
  }, [step])

  function addEntry() {
    setEntries((prev) => [...prev, { id: makeEntryId(), file: null, type: "analyze" }])
  }

  function removeEntry(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id))
  }

  function setFile(id: string, file: File | null) {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, file } : e)))
  }

  function setType(id: string, type: "analyze" | "ref") {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, type } : e)))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(undefined)
    setProgress(5)

    const titleEl = e.currentTarget.elements.namedItem("title") as HTMLInputElement
    const title = titleEl.value.trim()
    if (!title) { setError("입찰명을 입력해주세요."); return }

    try {
      setStep("uploading")

      const tenderRes = await fetch("/api/tenders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      })
      if (!tenderRes.ok) {
        const { error: msg } = await tenderRes.json()
        setError(msg ?? "입찰 생성 실패")
        setStep("idle"); setProgress(0); return
      }
      const { tenderId } = await tenderRes.json()

      const filesToUpload = entries.filter((e) => e.file)
      const analyzeDocumentIds: string[] = []

      for (const entry of filesToUpload) {
        if (!entry.file) continue
        const blob = await uploadPresigned(makeBlobPath(entry.file), entry.file, {
          access: "private",
          handleUploadUrl: "/api/blob-upload",
        })
        const docRes = await fetch(`/api/tenders/${tenderId}/documents`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            blobUrl: blob.url,
            filename: entry.file.name,
            isAnalysisSource: entry.type === "analyze",
          }),
        })
        if (!docRes.ok) {
          const { error: msg } = await docRes.json()
          setError(msg ?? "파일 등록 실패")
          setStep("idle"); setProgress(0); return
        }
        const { documentId } = await docRes.json()
        if (entry.type === "analyze") analyzeDocumentIds.push(documentId)
      }

      if (analyzeDocumentIds.length === 0) {
        setProgress(100); setStep("done")
        router.push(`/tender/${tenderId}`)
        router.refresh()
        return
      }

      setElapsed(0)
      setAnalyzeStart(Date.now())
      setStep("analyzing")
      setProgress(30)

      const analyzeRes = await fetch(`/api/tenders/${tenderId}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentIds: analyzeDocumentIds }),
      })
      if (!analyzeRes.ok) {
        const data = analyzeRes.headers.get("content-type")?.includes("application/json")
          ? await analyzeRes.json() : {}
        setError((data as { error?: string }).error ?? "분석 실패")
        setStep("idle"); setProgress(0); return
      }

      const { truncated } = await analyzeRes.json()
      setProgress(100); setStep("done")
      router.push(truncated ? `/tender/${tenderId}?truncated=1` : `/tender/${tenderId}`)
      router.refresh()
    } catch {
      setError("네트워크 오류가 발생했습니다. 다시 시도해주세요.")
      setStep("idle"); setProgress(0)
    }
  }

  const submitLabel = isPending
    ? (step === "uploading" ? "파일 업로드 중…" : "Claude AI 분석 중…")
    : analyzeCount > 0 ? "업로드 및 분석 시작"
    : hasAnyFile ? "업로드 시작"
    : "등록"

  return (
    <section className="space-y-4 text-xs">
      <h2 className="text-xs font-extrabold text-slate-400 tracking-wider uppercase flex items-center gap-1.5 border-b border-slate-100 pb-2">
        <Upload className="w-4 h-4 text-slate-400" />
        새 입찰 등록 & 분석
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 입찰명 입력란 */}
        <div className="space-y-1">
          <label className="font-bold text-slate-600 block">입찰 사업명</label>
          <Input 
            name="title" 
            placeholder="예: 대만 펑묘 220kV 해저케이블 공급 및 포설" 
            required 
            disabled={isPending} 
            className="rounded-xl border-slate-200 focus:ring-slate-950 focus:border-slate-950 text-xs px-3 py-2 bg-slate-50/50"
          />
        </div>

        {/* 파일 선택 리스트 */}
        <div className="space-y-2.5">
          <label className="font-bold text-slate-600 block">분석 대상 문서 (PDF)</label>
          {entries.map((entry) => (
            <div key={entry.id} className="flex items-center gap-2">
              <input
                ref={(el) => {
                  if (el) fileRefs.current.set(entry.id, el)
                  else fileRefs.current.delete(entry.id)
                }}
                type="file"
                accept="application/pdf"
                className="hidden"
                disabled={isPending}
                onChange={(e) => setFile(entry.id, e.target.files?.[0] ?? null)}
              />
              
              <button
                type="button"
                disabled={isPending}
                onClick={() => fileRefs.current.get(entry.id)?.click()}
                className="flex-1 text-left text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 truncate min-w-0 transition-colors text-slate-500 font-medium shadow-inner flex items-center gap-1.5"
              >
                <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="truncate">{entry.file ? entry.file.name : "PDF 입찰규격서 선택..."}</span>
              </button>
              
              <select
                value={entry.type}
                disabled={isPending}
                onChange={(e) => setType(entry.id, e.target.value as "analyze" | "ref")}
                className="text-xs border border-slate-200 rounded-xl px-2 py-2 bg-slate-50 focus:outline-none font-bold text-slate-700 shrink-0 cursor-pointer"
              >
                <option value="analyze">분석용</option>
                <option value="ref">참고용</option>
              </select>
              
              {entries.length > 1 && (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => removeEntry(entry.id)}
                  className="text-slate-400 hover:text-slate-700 shrink-0 p-1 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all"
                  title="제거"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* 파일 추가 버튼 */}
        <button
          type="button"
          disabled={isPending}
          onClick={addEntry}
          className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 bg-indigo-50 px-2.5 py-1.5 rounded-lg border border-indigo-100/50 transition-all disabled:opacity-40"
        >
          <Plus className="w-3.5 h-3.5" />
          파일 추가
        </button>

        {!hasAnyFile && (
          <p className="text-[10px] text-slate-400 italic">
            💡 PDF 문서 없이 등록할 경우, 수동으로 요구 조건을 하나씩 기입할 수 있습니다.
          </p>
        )}

        {/* 진행률 인디케이터 (Vercel Blob Upload & Claude AI RAG Analysis) */}
        {isPending && (
          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-3.5 animate-slide-in shadow-inner">
            <div className="space-y-1.5">
              <StepIndicator label="입찰 문서 보안 업로드" done={step === "analyzing"} active={step === "uploading"} />
              {analyzeCount > 0 && (
                <StepIndicator label="Claude AI 독소조항 자동 판독" done={false} active={step === "analyzing"} />
              )}
            </div>
            
            <div className="space-y-1">
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden shadow-inner">
                <div
                  className="h-full bg-slate-950 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-bold text-slate-400">
                <span>{step === "uploading" ? "파일 서버 전송 중..." : "AI RAG 조항 분석 중..."}</span>
                <span>{Math.round(progress)}%</span>
              </div>
            </div>

            {step === "analyzing" && (
              <p className="text-[10px] text-slate-400 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin text-slate-500" />
                {elapsed}초 경과 (일반적으로 30~60초가 소요됩니다)
              </p>
            )}
          </div>
        )}

        {error && <p className="text-xs text-rose-600 font-bold">{error}</p>}

        <Button 
          type="submit" 
          disabled={isPending} 
          className="w-full bg-slate-950 hover:bg-slate-800 text-white font-extrabold rounded-xl py-2.5 shadow-sm transition-all"
        >
          {isPending ? (
            <span className="flex items-center justify-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {submitLabel}
            </span>
          ) : (
            <span className="flex items-center justify-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              {submitLabel}
            </span>
          )}
        </Button>
      </form>
    </section>
  )
}

function StepIndicator({ label, done, active }: { label: string; done: boolean; active: boolean }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold flex-shrink-0 shadow ${
        done ? "bg-emerald-500 text-white" : active ? "bg-slate-950 text-white animate-pulse" : "bg-slate-200 text-slate-400"
      }`}>
        {done ? "✓" : active ? "…" : "·"}
      </span>
      <span className={done ? "text-slate-400 line-through font-medium" : active ? "text-slate-900 font-extrabold" : "text-slate-400"}>
        {label}
      </span>
    </div>
  )
}
