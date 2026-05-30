"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { uploadPresigned } from "@vercel/blob/client"
import { Button } from "@/components/ui/button"

type Doc = { id: string; filename: string; uploadedAt: string; isAnalysis: boolean }
type Props = { tenderId: string; documents: Doc[]; canManage: boolean; canAnalyze: boolean; canDeleteFiles: boolean }

function makeBlobPath(file: File) {
  const ext = file.name.toLowerCase().endsWith(".pdf") ? ".pdf" : ""
  return `tender-documents/${crypto.randomUUID()}${ext}`
}

export default function FilesPanel({ tenderId, documents, canManage, canAnalyze, canDeleteFiles }: Props) {
  const router = useRouter()
  const analyzeRef = useRef<HTMLInputElement>(null)
  const reanalyzeRef = useRef<HTMLInputElement>(null)
  const attachRef = useRef<HTMLInputElement>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [reanalyzing, setReanalyzing] = useState(false)
  const [attaching, setAttaching] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)

  async function handleFirstAnalyze(files: FileList) {
    if (files.length === 0) return
    setAnalyzing(true)
    setElapsed(0)
    const start = Date.now()
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000)
    try {
      const docIds: string[] = []
      for (const file of Array.from(files)) {
        const blob = await uploadPresigned(makeBlobPath(file), file, {
          access: "private",
          handleUploadUrl: "/api/blob-upload",
        })
        const res = await fetch(`/api/tenders/${tenderId}/documents`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ blobUrl: blob.url, filename: file.name, isAnalysisSource: true }),
        })
        if (!res.ok) { alert("문서 등록 실패"); return }
        const { documentId } = await res.json() as { documentId: string }
        docIds.push(documentId)
      }
      const res = await fetch(`/api/tenders/${tenderId}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentIds: docIds }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        alert((d as { error?: string }).error ?? "분석 실패")
        return
      }
      const { truncated } = await res.json() as { truncated: boolean }
      router.push(`/tender/${tenderId}${truncated ? "?truncated=1" : ""}`)
      router.refresh()
    } catch {
      alert("네트워크 오류가 발생했습니다.")
    } finally {
      clearInterval(timer)
      setAnalyzing(false)
    }
  }

  async function handleReanalyze(file: File) {
    setReanalyzing(true)
    setElapsed(0)
    const start = Date.now()
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000)

    try {
      const blob = await uploadPresigned(makeBlobPath(file), file, {
        access: "private",
        handleUploadUrl: "/api/blob-upload",
      })
      const res = await fetch(`/api/tenders/${tenderId}/reanalyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blobUrl: blob.url, filename: file.name }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        alert((d as { error?: string }).error ?? "재분석 실패")
        return
      }
      const { truncated } = await res.json()
      router.push(`/tender/${tenderId}${truncated ? "?truncated=1" : ""}`)
      router.refresh()
    } catch {
      alert("네트워크 오류가 발생했습니다.")
    } finally {
      clearInterval(timer)
      setReanalyzing(false)
    }
  }

  async function handleAttach(file: File) {
    setAttaching(true)
    try {
      const blob = await uploadPresigned(makeBlobPath(file), file, {
        access: "private",
        handleUploadUrl: "/api/blob-upload",
      })
      const res = await fetch(`/api/tenders/${tenderId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blobUrl: blob.url, filename: file.name, isAnalysisSource: false }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        alert((d as { error?: string }).error ?? "첨부 실패")
        return
      }
      router.refresh()
    } catch {
      alert("네트워크 오류가 발생했습니다.")
    } finally {
      setAttaching(false)
    }
  }

  async function handleDelete(docId: string, filename: string) {
    if (!confirm(`"${filename}"을 삭제하시겠습니까?`)) return
    setDeletingId(docId)
    const res = await fetch(`/api/tenders/${tenderId}/documents/${docId}`, { method: "DELETE" })
    setDeletingId(null)

    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      alert((d as { error?: string }).error ?? "삭제 실패")
    } else {
      router.refresh()
    }
  }

  return (
    <section className="bg-white border rounded-lg p-4 space-y-4">
      <h2 className="text-sm font-semibold text-zinc-700">파일 관리</h2>

      <ul className="space-y-1">
        {documents.map((d) => (
          <li key={d.id} className="flex items-center gap-2 text-sm">
            <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${
              d.isAnalysis ? "bg-blue-100 text-blue-700" : "bg-zinc-100 text-zinc-500"
            }`}>
              {d.isAnalysis ? "분석" : "참고"}
            </span>
            <span className="text-zinc-700 truncate flex-1">{d.filename}</span>
            <span className="text-xs text-zinc-400 shrink-0">
              {new Date(d.uploadedAt).toLocaleDateString("ko-KR")}
            </span>
            {canDeleteFiles && (
              <button
                onClick={() => handleDelete(d.id, d.filename)}
                disabled={deletingId === d.id}
                className="text-xs text-red-400 hover:text-red-600 shrink-0 disabled:opacity-40"
              >
                삭제
              </button>
            )}
          </li>
        ))}
        {documents.length === 0 && (
          <li className="text-xs text-zinc-400">첨부된 파일이 없습니다.</li>
        )}
      </ul>

      <div className="flex gap-2 flex-wrap pt-1 border-t">
        {canAnalyze && (
          <div>
            <input
              ref={analyzeRef}
              type="file"
              accept="application/pdf"
              multiple
              className="hidden"
              onChange={(e) => { if (e.target.files?.length) handleFirstAnalyze(e.target.files); e.target.value = "" }}
            />
            <Button size="sm" disabled={analyzing}
              onClick={() => analyzeRef.current?.click()}>
              {analyzing ? `분석 중… ${elapsed}초` : "분석 시작"}
            </Button>
            {analyzing
              ? <p className="text-xs text-zinc-400 mt-1">PDF 텍스트 추출 + AI 분석 중입니다 (30~90초 소요)</p>
              : <p className="text-xs text-zinc-400 mt-1">Tender · 기검요청서 등 분석할 PDF를 선택하세요 (다중 선택 가능)</p>
            }
          </div>
        )}
        {canManage && (
          <div>
            <input
              ref={reanalyzeRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleReanalyze(f); e.target.value = "" }}
            />
            <Button size="sm" variant="outline" disabled={reanalyzing}
              onClick={() => reanalyzeRef.current?.click()}>
              {reanalyzing ? `재분석 중… ${elapsed}초` : "PDF 교체 후 재분석"}
            </Button>
            {reanalyzing && (
              <p className="text-xs text-zinc-400 mt-1">기존 분석 결과가 교체됩니다.</p>
            )}
          </div>
        )}

        <div>
          <input
            ref={attachRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAttach(f); e.target.value = "" }}
          />
          <Button size="sm" variant="outline" disabled={attaching}
            onClick={() => attachRef.current?.click()}>
            {attaching ? "업로드 중…" : "참고문서 첨부"}
          </Button>
        </div>
      </div>
    </section>
  )
}
