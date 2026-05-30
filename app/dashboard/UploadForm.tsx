"use client"
import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { uploadPresigned } from "@vercel/blob/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

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
    <section>
      <h2 className="text-sm font-semibold text-zinc-700 mb-3">새 입찰 등록</h2>
      <form onSubmit={handleSubmit} className="bg-white border rounded-lg p-4 space-y-3">
        <Input name="title" placeholder="입찰명" required disabled={isPending} />

        <div className="space-y-2">
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
                className="flex-1 text-left text-sm px-3 py-2 border rounded-md bg-white text-zinc-500 hover:bg-zinc-50 truncate min-w-0"
              >
                {entry.file ? entry.file.name : "PDF 선택…"}
              </button>
              <select
                value={entry.type}
                disabled={isPending}
                onChange={(e) => setType(entry.id, e.target.value as "analyze" | "ref")}
                className="text-sm border rounded-md px-2 py-2 bg-white text-zinc-700 shrink-0"
              >
                <option value="analyze">분석용</option>
                <option value="ref">참고</option>
              </select>
              {entries.length > 1 && (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => removeEntry(entry.id)}
                  className="text-zinc-400 hover:text-zinc-700 shrink-0 px-1 text-base leading-none"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>

        <button
          type="button"
          disabled={isPending}
          onClick={addEntry}
          className="text-xs text-zinc-400 hover:text-zinc-700 disabled:opacity-40"
        >
          + 파일 추가
        </button>

        {!hasAnyFile && (
          <p className="text-xs text-zinc-400">
            파일 없이 등록하면 수동으로 내용을 작성할 수 있습니다.
          </p>
        )}

        {isPending && (
          <div className="rounded-md bg-zinc-50 border px-4 py-3 space-y-3">
            <div className="space-y-1.5">
              <StepIndicator label="파일 업로드" done={step === "analyzing"} active={step === "uploading"} />
              {analyzeCount > 0 && (
                <StepIndicator label="Claude AI 분석" done={false} active={step === "analyzing"} />
              )}
            </div>
            <div className="space-y-1">
              <div className="h-2 bg-zinc-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-zinc-800 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-zinc-400">
                <span>{step === "uploading" ? "파일 업로드 중" : "AI 분석 중"}</span>
                <span>{Math.round(progress)}%</span>
              </div>
            </div>
            {step === "analyzing" && (
              <p className="text-xs text-zinc-400">
                AI 분석 중… {elapsed}초 경과 (문서 크기에 따라 30~120초 소요)
              </p>
            )}
          </div>
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}

        <Button type="submit" disabled={isPending} className="w-full">
          {submitLabel}
        </Button>
      </form>
    </section>
  )
}

function StepIndicator({ label, done, active }: { label: string; done: boolean; active: boolean }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${
        done ? "bg-green-500 text-white" : active ? "bg-zinc-800 text-white animate-pulse" : "bg-zinc-200 text-zinc-400"
      }`}>
        {done ? "✓" : active ? "…" : "·"}
      </span>
      <span className={done ? "text-zinc-400 line-through" : active ? "text-zinc-800 font-medium" : "text-zinc-400"}>
        {label}
      </span>
    </div>
  )
}
