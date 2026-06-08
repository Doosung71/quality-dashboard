"use client"

import { useRef, useState } from "react"
import { Paperclip, X, Loader2, FileText, Image, FileSpreadsheet, FileArchive } from "lucide-react"

export type AttachmentItem = {
  url: string
  name: string
  size: number
  contentType: string
}

interface AttachmentUploaderProps {
  attachments: AttachmentItem[]
  onChange: (attachments: AttachmentItem[]) => void
  context?: string   // 업로드 경로 prefix (예: "claims", "ncr")
  maxFiles?: number
  disabled?: boolean
}

function fileIcon(contentType: string) {
  if (contentType.startsWith("image/")) return <Image className="w-3.5 h-3.5 text-teal-500" />
  if (contentType.includes("spreadsheet") || contentType.includes("xlsx"))
    return <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
  if (contentType.includes("zip")) return <FileArchive className="w-3.5 h-3.5 text-amber-500" />
  return <FileText className="w-3.5 h-3.5 text-slate-500" />
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function AttachmentUploader({
  attachments,
  onChange,
  context = "attachment",
  maxFiles = 5,
  disabled = false,
}: AttachmentUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    if (attachments.length + files.length > maxFiles) {
      setError(`최대 ${maxFiles}개까지 첨부할 수 있습니다.`)
      return
    }
    setError("")
    setUploading(true)
    const uploaded: AttachmentItem[] = []
    for (const file of Array.from(files)) {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("context", context)
      try {
        const res = await fetch("/api/attachments/upload", { method: "POST", body: fd })
        const data = await res.json()
        if (!res.ok) { setError(data.error ?? "업로드 실패"); setUploading(false); return }
        uploaded.push(data as AttachmentItem)
      } catch {
        setError("업로드 중 오류가 발생했습니다.")
        setUploading(false)
        return
      }
    }
    onChange([...attachments, ...uploaded])
    setUploading(false)
    if (inputRef.current) inputRef.current.value = ""
  }

  function remove(idx: number) {
    onChange(attachments.filter((_, i) => i !== idx))
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={disabled || uploading || attachments.length >= maxFiles}
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {uploading
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <Paperclip className="w-3.5 h-3.5" />}
          {uploading ? "업로드 중…" : "파일 첨부"}
        </button>
        <span className="text-[10px] text-slate-400">
          PDF·이미지·Word·Excel·ZIP · 최대 20MB · {attachments.length}/{maxFiles}개
        </span>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.docx,.xlsx,.pptx,.txt,.zip"
          className="hidden"
          onChange={e => handleFiles(e.target.files)}
          disabled={disabled || uploading}
        />
      </div>

      {error && <p className="text-[11px] text-rose-600 font-medium">{error}</p>}

      {attachments.length > 0 && (
        <ul className="space-y-1.5">
          {attachments.map((att, i) => (
            <li key={i} className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5">
              {fileIcon(att.contentType)}
              <a
                href={att.url}
                target="_blank"
                rel="noreferrer"
                className="flex-1 text-[11px] font-medium text-slate-700 hover:text-slate-900 hover:underline truncate"
                title={att.name}
              >
                {att.name}
              </a>
              <span className="text-[10px] text-slate-400 shrink-0">{formatBytes(att.size)}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="text-slate-400 hover:text-rose-500 transition-colors"
                  title="삭제"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** 첨부파일 목록 표시 전용 (편집 불가) */
export function AttachmentList({ attachments }: { attachments: AttachmentItem[] }) {
  if (attachments.length === 0) return null
  return (
    <ul className="space-y-1.5">
      {attachments.map((att, i) => (
        <li key={i} className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5">
          {fileIcon(att.contentType)}
          <a
            href={att.url}
            target="_blank"
            rel="noreferrer"
            className="flex-1 text-[11px] font-medium text-slate-700 hover:text-slate-900 hover:underline truncate"
            title={att.name}
          >
            {att.name}
          </a>
          <span className="text-[10px] text-slate-400 shrink-0">{formatBytes(att.size)}</span>
        </li>
      ))}
    </ul>
  )
}
