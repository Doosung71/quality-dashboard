"use client"
import { useState, useRef } from "react"

type Author = { id: string; name: string; nickname: string | null; role: string }
type Reply = { id: string; content: string; author: Author; createdAt: string }
type FeedbackItem = {
  id: string
  content: string
  imageUrls: string | null
  author: Author
  createdAt: string
  replies: Reply[]
}

const ROLE_LABEL: Record<string, string> = {
  PRACTITIONER: "실무자",
  TEAM_LEAD: "팀장",
  DIRECTOR: "부문장",
  ADMIN: "관리자",
}

function authorLabel(a: Author) {
  const name = a.nickname || a.name
  return `${name} (${ROLE_LABEL[a.role] ?? a.role})`
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return "방금 전"
  if (m < 60) return `${m}분 전`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}시간 전`
  return new Date(iso).toLocaleDateString("ko-KR")
}

function parseUrls(raw: string | null): string[] {
  if (!raw) return []
  try { return JSON.parse(raw) } catch { return [] }
}

function canEdit(authorId: string, currentUserId: string) {
  return authorId === currentUserId
}

function canDelete(authorId: string, currentUserId: string, currentUserRole: string) {
  return authorId === currentUserId || currentUserRole === "DIRECTOR" || currentUserRole === "ADMIN"
}

function ImageGrid({ urls }: { urls: string[] }) {
  const [lightbox, setLightbox] = useState<string | null>(null)
  if (urls.length === 0) return null
  return (
    <>
      <div className="flex flex-wrap gap-2 mt-3">
        {urls.map((url, i) => (
          <button key={i} onClick={() => setLightbox(url)} className="focus:outline-none">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={`첨부 이미지 ${i + 1}`}
              className="h-24 w-auto rounded border object-cover hover:opacity-80 transition-opacity cursor-zoom-in"
            />
          </button>
        ))}
      </div>
      {lightbox && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="첨부 이미지" className="max-w-full max-h-full rounded shadow-xl" />
          <button
            className="absolute top-4 right-4 text-white text-2xl font-bold hover:text-zinc-300"
            onClick={() => setLightbox(null)}
          >
            ✕
          </button>
        </div>
      )}
    </>
  )
}

function ReplyItem({
  reply,
  feedbackId,
  currentUserId,
  currentUserRole,
  onDelete,
  onUpdate,
}: {
  reply: Reply
  feedbackId: string
  currentUserId: string
  currentUserRole: string
  onDelete: (id: string) => void
  onUpdate: (id: string, content: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(reply.content)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleSave() {
    if (!editText.trim()) return
    if (editText.trim() === reply.content) { setEditing(false); return }
    setSaving(true)
    const res = await fetch(`/api/feedback/${feedbackId}/reply/${reply.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: editText }),
    })
    if (res.ok) {
      onUpdate(reply.id, editText.trim())
      setEditing(false)
    }
    setSaving(false)
  }

  async function handleDelete() {
    if (!confirm("댓글을 삭제할까요?")) return
    setDeleting(true)
    const res = await fetch(`/api/feedback/${feedbackId}/reply/${reply.id}`, { method: "DELETE" })
    if (res.ok) onDelete(reply.id)
    else setDeleting(false)
  }

  return (
    <div className="text-sm group/reply">
      <div className="flex items-center gap-2">
        <span className="font-medium text-zinc-700">{authorLabel(reply.author)}</span>
        <span className="text-zinc-400 text-xs">{timeAgo(reply.createdAt)}</span>
        {!editing && (
          <div className="ml-auto flex gap-2 opacity-0 group-hover/reply:opacity-100 transition-opacity">
            {canEdit(reply.author.id, currentUserId) && (
              <button onClick={() => setEditing(true)} className="text-xs text-zinc-400 hover:text-zinc-700">수정</button>
            )}
            {canDelete(reply.author.id, currentUserId, currentUserRole) && (
              <button onClick={handleDelete} disabled={deleting} className="text-xs text-zinc-400 hover:text-rose-500 disabled:opacity-40">
                {deleting ? "…" : "삭제"}
              </button>
            )}
          </div>
        )}
      </div>
      {editing ? (
        <div className="flex gap-2 mt-1.5">
          <textarea
            className="flex-1 text-sm border rounded px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-zinc-400"
            rows={2}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            autoFocus
          />
          <div className="flex flex-col gap-1 shrink-0">
            <button
              onClick={handleSave}
              disabled={saving || !editText.trim()}
              className="text-xs px-3 py-1.5 rounded bg-zinc-800 text-white hover:bg-zinc-600 disabled:opacity-40"
            >
              {saving ? "…" : "저장"}
            </button>
            <button
              onClick={() => { setEditing(false); setEditText(reply.content) }}
              className="text-xs px-3 py-1.5 rounded border text-zinc-500 hover:bg-zinc-50"
            >
              취소
            </button>
          </div>
        </div>
      ) : (
        <p className="text-zinc-600 mt-0.5 leading-relaxed whitespace-pre-wrap">{editText}</p>
      )}
    </div>
  )
}

function ReplyThread({
  feedbackId,
  replies: initial,
  currentUserId,
  currentUserRole,
}: {
  feedbackId: string
  replies: Reply[]
  currentUserId: string
  currentUserRole: string
}) {
  const [replies, setReplies] = useState(initial)
  const [open, setOpen] = useState(false)
  const [text, setText] = useState("")
  const [posting, setPosting] = useState(false)

  async function submit() {
    if (!text.trim()) return
    setPosting(true)
    const res = await fetch(`/api/feedback/${feedbackId}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text }),
    })
    if (res.ok) {
      const reply = await res.json()
      setReplies((prev) => [...prev, reply])
      setText("")
      setOpen(false)
    }
    setPosting(false)
  }

  function handleDelete(id: string) {
    setReplies((prev) => prev.filter((r) => r.id !== id))
  }

  function handleUpdate(id: string, content: string) {
    setReplies((prev) => prev.map((r) => (r.id === id ? { ...r, content } : r)))
  }

  return (
    <div className="mt-3 ml-4 border-l-2 border-zinc-100 pl-4 space-y-2">
      {replies.map((r) => (
        <ReplyItem
          key={r.id}
          reply={r}
          feedbackId={feedbackId}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
          onDelete={handleDelete}
          onUpdate={handleUpdate}
        />
      ))}
      {open ? (
        <div className="flex gap-2 items-start pt-1">
          <textarea
            className="flex-1 text-sm border rounded px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-zinc-400"
            rows={2}
            placeholder="댓글을 입력하세요..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            autoFocus
          />
          <div className="flex flex-col gap-1 shrink-0">
            <button
              onClick={submit}
              disabled={posting || !text.trim()}
              className="text-xs px-3 py-1.5 rounded bg-zinc-800 text-white hover:bg-zinc-600 disabled:opacity-40"
            >
              {posting ? "…" : "등록"}
            </button>
            <button onClick={() => { setOpen(false); setText("") }} className="text-xs px-3 py-1.5 rounded border text-zinc-500 hover:bg-zinc-50">
              취소
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setOpen(true)} className="text-xs text-zinc-400 hover:text-zinc-700 pt-1">
          댓글 달기
        </button>
      )}
    </div>
  )
}

function FeedbackCard({
  item,
  currentUserId,
  currentUserRole,
  onDelete,
  onUpdate,
}: {
  item: FeedbackItem
  currentUserId: string
  currentUserRole: string
  onDelete: (id: string) => void
  onUpdate: (id: string, content: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(item.content)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleSave() {
    if (!editText.trim()) return
    if (editText.trim() === item.content) { setEditing(false); return }
    setSaving(true)
    const res = await fetch(`/api/feedback/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: editText }),
    })
    if (res.ok) {
      onUpdate(item.id, editText.trim())
      setEditing(false)
    }
    setSaving(false)
  }

  async function handleDelete() {
    if (!confirm("피드백을 삭제할까요? 달린 댓글도 모두 삭제됩니다.")) return
    setDeleting(true)
    const res = await fetch(`/api/feedback/${item.id}`, { method: "DELETE" })
    if (res.ok) onDelete(item.id)
    else setDeleting(false)
  }

  return (
    <div className="bg-white border rounded-xl p-5 group/card">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-medium text-zinc-800">{authorLabel(item.author)}</span>
        <span className="text-xs text-zinc-400">{timeAgo(item.createdAt)}</span>
        {!editing && (
          <div className="ml-auto flex gap-3 opacity-0 group-hover/card:opacity-100 transition-opacity">
            {canEdit(item.author.id, currentUserId) && (
              <button onClick={() => setEditing(true)} className="text-xs text-zinc-400 hover:text-zinc-700">수정</button>
            )}
            {canDelete(item.author.id, currentUserId, currentUserRole) && (
              <button onClick={handleDelete} disabled={deleting} className="text-xs text-zinc-400 hover:text-rose-500 disabled:opacity-40">
                {deleting ? "삭제 중…" : "삭제"}
              </button>
            )}
          </div>
        )}
      </div>

      {editing ? (
        <div className="space-y-2">
          <textarea
            className="w-full text-sm border rounded-lg px-3 py-2.5 resize-none focus:outline-none focus:ring-1 focus:ring-zinc-400"
            rows={4}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            autoFocus
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setEditing(false); setEditText(item.content) }}
              className="text-xs px-3 py-1.5 rounded border text-zinc-500 hover:bg-zinc-50"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !editText.trim()}
              className="text-xs px-4 py-1.5 rounded bg-zinc-800 text-white hover:bg-zinc-700 disabled:opacity-40"
            >
              {saving ? "저장 중…" : "저장"}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-zinc-700 leading-relaxed whitespace-pre-wrap">{editText}</p>
      )}

      <ImageGrid urls={parseUrls(item.imageUrls)} />
      <ReplyThread
        feedbackId={item.id}
        replies={item.replies}
        currentUserId={currentUserId}
        currentUserRole={currentUserRole}
      />
    </div>
  )
}

export default function FeedbackBoard({
  initial,
  currentUserId,
  currentUserRole,
}: {
  initial: FeedbackItem[]
  currentUserId: string
  currentUserRole: string
}) {
  const [items, setItems] = useState(initial)
  const [text, setText] = useState("")
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)

  async function uploadFiles(files: File[]) {
    if (files.length === 0) return
    if (uploadedUrls.length + files.length > 3) {
      setError("이미지는 최대 3장까지 첨부할 수 있습니다")
      return
    }
    setUploading(true)
    setError("")
    const newUrls: string[] = []
    try {
      for (const file of files) {
        const form = new FormData()
        form.append("file", file)
        const res = await fetch("/api/feedback/image", { method: "POST", body: form })
        if (res.ok) {
          const { url } = await res.json()
          newUrls.push(url)
        } else {
          let errMsg = "이미지 업로드에 실패했습니다"
          try { const d = await res.json(); errMsg = d.error ?? errMsg } catch { /* non-JSON */ }
          setError(errMsg)
          break
        }
      }
    } catch {
      setError("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.")
    } finally {
      setUploadedUrls((prev) => [...prev, ...newUrls])
      setUploading(false)
    }
  }

  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    await uploadFiles(Array.from(e.target.files ?? []))
    if (fileRef.current) fileRef.current.value = ""
  }

  async function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const imageItems = Array.from(e.clipboardData.items).filter((item) => item.type.startsWith("image/"))
    if (imageItems.length === 0) return
    e.preventDefault()
    const files = imageItems.map((item) => item.getAsFile()).filter(Boolean) as File[]
    await uploadFiles(files)
  }

  function removeImage(url: string) {
    setUploadedUrls((prev) => prev.filter((u) => u !== url))
  }

  async function submit() {
    if (!text.trim()) return
    setPosting(true)
    setError("")
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text, imageUrls: uploadedUrls }),
    })
    if (res.ok) {
      const item = await res.json()
      setItems((prev) => [item, ...prev])
      setText("")
      setUploadedUrls([])
    } else {
      const d = await res.json()
      setError(d.error ?? "오류가 발생했습니다")
    }
    setPosting(false)
  }

  function handleDelete(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  function handleUpdate(id: string, content: string) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, content } : i)))
  }

  return (
    <div className="space-y-6">
      {/* 피드백 작성 폼 */}
      <div className="bg-white border rounded-xl p-5 space-y-3">
        <p className="text-sm font-semibold text-zinc-800">피드백 작성</p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-xs text-blue-800 leading-relaxed">
          불편한 사항이나 오류가 있으면 <strong>화면 캡처를 첨부</strong>해 주세요.
          개선에 큰 도움이 됩니다. (PNG·JPG·WebP, 최대 3장)
        </div>
        <textarea
          className="w-full text-sm border rounded-lg px-3 py-2.5 resize-none focus:outline-none focus:ring-1 focus:ring-zinc-400"
          rows={3}
          placeholder="예: ○○ 화면에서 버튼을 눌렀을 때 오류가 발생합니다. 아래 캡처 참고해주세요."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onPaste={handlePaste}
        />

        {uploadedUrls.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {uploadedUrls.map((url, i) => (
              <div key={i} className="relative group/img">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`첨부 ${i + 1}`} className="h-20 w-auto rounded border object-cover" />
                <button
                  onClick={() => removeImage(url)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading || uploadedUrls.length >= 3}
            className="text-sm px-4 py-2 rounded-lg border border-zinc-300 text-zinc-600 hover:bg-zinc-50 disabled:opacity-40 flex items-center gap-1.5"
          >
            {uploading ? "업로드 중…" : "📎 파일로 첨부"}
            {uploadedUrls.length > 0 && <span className="text-xs text-zinc-400">({uploadedUrls.length}/3)</span>}
          </button>
          {!uploading && uploadedUrls.length < 3 && (
            <span className="text-xs text-zinc-400">
              또는 위 입력창에 <kbd className="bg-zinc-100 border border-zinc-300 rounded px-1 py-0.5 font-mono text-[11px]">Ctrl+V</kbd> 로 스크린샷 붙여넣기
            </span>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            multiple
            className="hidden"
            onChange={handleImageSelect}
          />
          <button
            onClick={submit}
            disabled={posting || !text.trim()}
            className="text-sm px-5 py-2 rounded-lg bg-zinc-900 text-white hover:bg-zinc-700 disabled:opacity-40"
          >
            {posting ? "등록 중…" : "피드백 등록"}
          </button>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>

      {/* 피드백 목록 */}
      {items.length === 0 ? (
        <p className="text-sm text-zinc-400 text-center py-8">
          아직 피드백이 없습니다. 첫 번째로 의견을 남겨보세요!
        </p>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <FeedbackCard
              key={item.id}
              item={item}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
              onDelete={handleDelete}
              onUpdate={handleUpdate}
            />
          ))}
        </div>
      )}
    </div>
  )
}
