"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { upload } from "@vercel/blob/client"
import { UploadCloud, FileText, Zap, Loader2 } from "lucide-react"

type Doc = { id: string; filename: string; uploadedAt: string }

export default function ContractUploadForm({
  projectId,
  documents,
  latestAnalysisId,
  hasAnalysis,
  hasTender,
}: {
  projectId: string
  documents: Doc[]
  latestAnalysisId: string | null
  hasAnalysis: boolean
  hasTender: boolean
}) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [selectedDocId, setSelectedDocId] = useState(documents[0]?.id ?? "")
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "done" | "error">("idle")
  const [analyzeState, setAnalyzeState] = useState<"idle" | "loading" | "done" | "error">("idle")
  const [message, setMessage] = useState("")

  async function handleUpload() {
    if (!file) return
    setUploadState("uploading")
    setMessage("")
    try {
      const pathname = `contract-documents/${projectId}/${Date.now()}_${file.name}`
      const blob = await upload(pathname, file, {
        access: "public",
        handleUploadUrl: "/api/blob-upload",
      })
      const res = await fetch(`/api/awarded-projects/${projectId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, storagePath: blob.url }),
      })
      if (!res.ok) throw new Error("문서 등록 실패")
      const { id } = await res.json() as { id: string }
      setSelectedDocId(id)
      setFile(null)
      setUploadState("done")
      setMessage("계약서가 업로드되었습니다.")
      router.refresh()
    } catch (e) {
      setUploadState("error")
      setMessage((e as Error).message)
    }
  }

  async function handleAnalyze() {
    if (!selectedDocId) return
    setAnalyzeState("loading")
    setMessage("")
    try {
      const res = await fetch(`/api/awarded-projects/${projectId}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: selectedDocId }),
      })
      if (!res.ok) {
        const j = await res.json() as { error?: string }
        throw new Error(j.error ?? "분석 실패")
      }
      const { gapCount, riskCount } = await res.json() as { gapCount: number; riskCount: number }
      setAnalyzeState("done")
      setMessage(`분석 완료 — 갭 ${gapCount}건 (리스크 ${riskCount}건)`)
      router.refresh()
    } catch (e) {
      setAnalyzeState("error")
      setMessage((e as Error).message)
    }
  }

  return (
    <section className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
      <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
        <UploadCloud className="w-4 h-4 text-emerald-500" />
        계약서 업로드 &amp; 갭 분석
      </h2>

      {/* 기존 문서 목록 */}
      {documents.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-600 mb-2">업로드된 계약서</p>
          <div className="space-y-1">
            {documents.map(d => (
              <label key={d.id} className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="radio"
                  name="docId"
                  value={d.id}
                  checked={selectedDocId === d.id}
                  onChange={() => setSelectedDocId(d.id)}
                  className="accent-emerald-600"
                />
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-700">{d.filename}</span>
                <span className="text-slate-400">{new Date(d.uploadedAt).toLocaleDateString("ko-KR")}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* 새 파일 선택 */}
      <div>
        <p className="text-xs font-medium text-slate-600 mb-2">새 계약서 추가</p>
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={e => setFile(e.target.files?.[0] ?? null)}
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 text-xs border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            {file ? file.name : "PDF 선택..."}
          </button>
          {file && (
            <button
              onClick={handleUpload}
              disabled={uploadState === "uploading"}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-slate-800 text-white rounded-lg hover:bg-slate-900 disabled:opacity-50 transition-colors"
            >
              {uploadState === "uploading" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
              업로드
            </button>
          )}
        </div>
      </div>

      {/* 분석 실행 */}
      {selectedDocId && (
        <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
          <button
            onClick={handleAnalyze}
            disabled={analyzeState === "loading"}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {analyzeState === "loading" ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> AI 분석 중...</>
            ) : (
              <><Zap className="w-3.5 h-3.5" /> {hasAnalysis ? "재분석" : hasTender ? "AI 갭 분석 시작" : "AI 리스크 분석 시작"}</>
            )}
          </button>
          <p className="text-xs text-slate-400">
            {hasTender ? "입찰 요구사항과 계약서를 비교해 차이를 추출합니다." : "계약서에서 이행 리스크와 요구사항을 추출합니다."}
          </p>
        </div>
      )}

      {message && (
        <p className={`text-xs ${analyzeState === "error" || uploadState === "error" ? "text-rose-600" : "text-emerald-600"}`}>
          {message}
        </p>
      )}
    </section>
  )
}
