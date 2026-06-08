"use client"
import { useState, useRef } from "react"

type Author = { id: string; name: string; nickname: string | null; role: string }
type Reply = {
  id: string; content: string; author: Author
  parentId: string | null; createdAt: string
}
type ReplyNode = Reply & { children: ReplyNode[] }
type FeedbackItem = {
  id: string; content: string; imageUrls: string | null
  author: Author; createdAt: string; replies: Reply[]
}

const ROLE_LABEL: Record<string, string> = {
  PRACTITIONER: "실무자", TEAM_LEAD: "팀장", DIRECTOR: "부문장", ADMIN: "관리자",
}

function authorLabel(a: Author) {
  return `${a.nickname || a.name} (${ROLE_LABEL[a.role] ?? a.role})`
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

function canEdit(authorId: string, uid: string) { return authorId === uid }
function canDelete(authorId: string, uid: string, role: string) {
  return authorId === uid || role === "DIRECTOR" || role === "ADMIN"
}

function buildTree(replies: Reply[]): ReplyNode[] {
  const map = new Map<string, ReplyNode>()
  const roots: ReplyNode[] = []
  for (const r of replies) map.set(r.id, { ...r, children: [] })
  for (const r of replies) {
    const node = map.get(r.id)!
    if (r.parentId && map.has(r.parentId)) map.get(r.parentId)!.children.push(node)
    else roots.push(node)
  }
  return roots
}

function collectDescendants(id: string, replies: Reply[]): Set<string> {
  const result = new Set<string>([id])
  let changed = true
  while (changed) {
    changed = false
    for (const r of replies) {
      if (r.parentId && result.has(r.parentId) && !result.has(r.id)) {
        result.add(r.id); changed = true
      }
    }
  }
  return result
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
            <img src={url} alt={`첨부 이미지 ${i + 1}`} className="h-24 w-auto rounded border object-cover hover:opacity-80 transition-opacity cursor-zoom-in" />
          </button>
        ))}
      </div>
      {lightbox && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="첨부 이미지" className="max-w-full max-h-full rounded shadow-xl" />
          <button className="absolute top-4 right-4 text-white text-2xl font-bold hover:text-zinc-300" onClick={() => setLightbox(null)}>✕</button>
        </div>
      )}
    </>
  )
}

function ReplyForm({
  feedbackId, parentId, onAdd, onCancel, autoFocus,
}: {
  feedbackId: string; parentId: string | null
  onAdd: (r: Reply) => void; onCancel?: () => void; autoFocus?: boolean
}) {
  const [text, setText] = useState("")
  const [posting, setPosting] = useState(false)

  async function submit() {
    if (!text.trim()) return
    setPosting(true)
    const res = await fetch(`/api/feedback/${feedbackId}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text, parentId }),
    })
    if (res.ok) {
      onAdd(await res.json())
      setText("")
      onCancel?.()
    }
    setPosting(false)
  }

  return (
    <div className="flex gap-2 items-start">
      <textarea
        className="flex-1 text-sm border rounded px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-zinc-400"
        rows={2}
        placeholder={parentId ? "답글을 입력하세요..." : "댓글을 입력하세요..."}
        value={text}
        onChange={(e) => setText(e.target.value)}
        autoFocus={autoFocus}
      />
      <div className="flex flex-col gap-1 shrink-0">
        <button onClick={submit} disabled={posting || !text.trim()} className="text-xs px-3 py-1.5 rounded bg-zinc-800 text-white hover:bg-zinc-600 disabled:opacity-40">
          {posting ? "…" : "등록"}
        </button>
        {onCancel && (
          <button onClick={onCancel} className="text-xs px-3 py-1.5 rounded border text-zinc-500 hover:bg-zinc-50">취소</button>
        )}
      </div>
    </div>
  )
}

function ReplyItem({
  node, feedbackId, depth, uid, role,
  onAdd, onRemove, onUpdate,
}: {
  node: ReplyNode; feedbackId: string; depth: number
  uid: string; role: string
  onAdd: (r: Reply) => void
  onRemove: (id: string) => void
  onUpdate: (id: string, content: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(node.content)
  const [replying, setReplying] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleSave() {
    if (!editText.trim() || editText.trim() === node.content) { setEditing(false); return }
    setSaving(true)
    const res = await fetch(`/api/feedback/${feedbackId}/reply/${node.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: editText }),
    })
    if (res.ok) { onUpdate(node.id, editText.trim()); setEditing(false) }
    setSaving(false)
  }

  async function handleDelete() {
    if (!confirm("댓글을 삭제할까요? 달린 대댓글도 모두 삭제됩니다.")) return
    setDeleting(true)
    const res = await fetch(`/api/feedback/${feedbackId}/reply/${node.id}`, { method: "DELETE" })
    if (res.ok) {
      const { deleted } = await res.json() as { deleted: string[] }
      deleted.forEach(id => onRemove(id))
    } else { setDeleting(false) }
  }

  const indent = depth > 0

  return (
    <div>
      <div className={`text-sm group/reply ${indent ? "" : ""}`}>
        <div className="flex items-center gap-2 flex-wrap">
          {indent && <span className="text-zinc-300 text-xs mr-0.5">↳</span>}
          <span className="font-medium text-zinc-700">{authorLabel(node.author)}</span>
          <span className="text-zinc-400 text-xs">{timeAgo(node.createdAt)}</span>
          {!editing && !deleting && (
            <div className="ml-auto flex gap-2 opacity-0 group-hover/reply:opacity-100 transition-opacity">
              <button onClick={() => setReplying(v => !v)} className="text-xs text-zinc-400 hover:text-indigo-600">
                {replying ? "취소" : "답글"}
              </button>
              {canEdit(node.author.id, uid) && (
                <button onClick={() => setEditing(true)} className="text-xs text-zinc-400 hover:text-zinc-700">수정</button>
              )}
              {canDelete(node.author.id, uid, role) && (
                <button onClick={handleDelete} className="text-xs text-zinc-400 hover:text-rose-500">삭제</button>
              )}
            </div>
          )}
          {deleting && <span className="ml-auto text-xs text-zinc-300">삭제 중…</span>}
        </div>

        {editing ? (
          <div className="flex gap-2 mt-1.5">
            <textarea
              className="flex-1 text-sm border rounded px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-zinc-400"
              rows={2} value={editText} onChange={(e) => setEditText(e.target.value)} autoFocus
            />
            <div className="flex flex-col gap-1 shrink-0">
              <button onClick={handleSave} disabled={saving || !editText.trim()} className="text-xs px-3 py-1.5 rounded bg-zinc-800 text-white disabled:opacity-40">
                {saving ? "…" : "저장"}
              </button>
              <button onClick={() => { setEditing(false); setEditText(node.content) }} className="text-xs px-3 py-1.5 rounded border text-zinc-500">취소</button>
            </div>
          </div>
        ) : (
          <p className="text-zinc-600 mt-0.5 leading-relaxed whitespace-pre-wrap">{editText}</p>
        )}
      </div>

      {/* 답글 작성 폼 */}
      {replying && (
        <div className="mt-2 ml-5 pl-3 border-l-2 border-indigo-100">
          <ReplyForm
            feedbackId={feedbackId}
            parentId={node.id}
            onAdd={(r) => { onAdd(r); setReplying(false) }}
            onCancel={() => setReplying(false)}
            autoFocus
          />
        </div>
      )}

      {/* 자식 댓글 */}
      {node.children.length > 0 && (
        <ReplyTree
          nodes={node.children}
          feedbackId={feedbackId}
          depth={depth + 1}
          uid={uid} role={role}
          onAdd={onAdd} onRemove={onRemove} onUpdate={onUpdate}
        />
      )}
    </div>
  )
}

function ReplyTree({
  nodes, feedbackId, depth, uid, role, onAdd, onRemove, onUpdate,
}: {
  nodes: ReplyNode[]; feedbackId: string; depth: number
  uid: string; role: string
  onAdd: (r: Reply) => void
  onRemove: (id: string) => void
  onUpdate: (id: string, content: string) => void
}) {
  const visualDepth = Math.min(depth, 3)
  return (
    <div className={visualDepth > 0 ? "mt-2 ml-4 pl-3 border-l-2 border-zinc-100 space-y-3" : "space-y-3"}>
      {nodes.map(node => (
        <ReplyItem
          key={node.id}
          node={node} feedbackId={feedbackId} depth={depth}
          uid={uid} role={role}
          onAdd={onAdd} onRemove={onRemove} onUpdate={onUpdate}
        />
      ))}
    </div>
  )
}

function FeedbackCard({
  item, uid, role, onDelete, onUpdate,
}: {
  item: FeedbackItem; uid: string; role: string
  onDelete: (id: string) => void
  onUpdate: (id: string, content: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(item.content)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [allReplies, setAllReplies] = useState<Reply[]>(item.replies)
  const [showReplyForm, setShowReplyForm] = useState(false)

  const tree = buildTree(allReplies)

  function addReply(r: Reply) { setAllReplies(prev => [...prev, r]) }

  function removeReply(id: string) {
    setAllReplies(prev => {
      const toRemove = collectDescendants(id, prev)
      return prev.filter(r => !toRemove.has(r.id))
    })
  }

  function updateReply(id: string, content: string) {
    setAllReplies(prev => prev.map(r => r.id === id ? { ...r, content } : r))
  }

  async function handleSave() {
    if (!editText.trim() || editText.trim() === item.content) { setEditing(false); return }
    setSaving(true)
    const res = await fetch(`/api/feedback/${item.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: editText }),
    })
    if (res.ok) { onUpdate(item.id, editText.trim()); setEditing(false) }
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
      {/* 헤더 */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-medium text-zinc-800">{authorLabel(item.author)}</span>
        <span className="text-xs text-zinc-400">{timeAgo(item.createdAt)}</span>
        {!editing && !deleting && (
          <div className="ml-auto flex gap-3 opacity-0 group-hover/card:opacity-100 transition-opacity">
            {canEdit(item.author.id, uid) && (
              <button onClick={() => setEditing(true)} className="text-xs text-zinc-400 hover:text-zinc-700">수정</button>
            )}
            {canDelete(item.author.id, uid, role) && (
              <button onClick={handleDelete} className="text-xs text-zinc-400 hover:text-rose-500">삭제</button>
            )}
          </div>
        )}
        {deleting && <span className="ml-auto text-xs text-zinc-300">삭제 중…</span>}
      </div>

      {/* 본문 */}
      {editing ? (
        <div className="space-y-2">
          <textarea
            className="w-full text-sm border rounded-lg px-3 py-2.5 resize-none focus:outline-none focus:ring-1 focus:ring-zinc-400"
            rows={4} value={editText} onChange={(e) => setEditText(e.target.value)} autoFocus
          />
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setEditing(false); setEditText(item.content) }} className="text-xs px-3 py-1.5 rounded border text-zinc-500 hover:bg-zinc-50">취소</button>
            <button onClick={handleSave} disabled={saving || !editText.trim()} className="text-xs px-4 py-1.5 rounded bg-zinc-800 text-white hover:bg-zinc-700 disabled:opacity-40">
              {saving ? "저장 중…" : "저장"}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-zinc-700 leading-relaxed whitespace-pre-wrap">{editText}</p>
      )}

      <ImageGrid urls={parseUrls(item.imageUrls)} />

      {/* 댓글 섹션 */}
      <div className="mt-4 pt-3 border-t border-zinc-50">
        {/* 기존 댓글 트리 */}
        {tree.length > 0 && (
          <div className="mb-3">
            <ReplyTree
              nodes={tree} feedbackId={item.id} depth={0}
              uid={uid} role={role}
              onAdd={addReply} onRemove={removeReply} onUpdate={updateReply}
            />
          </div>
        )}

        {/* 댓글 달기 버튼 / 폼 */}
        {showReplyForm ? (
          <div className="mt-2">
            <ReplyForm
              feedbackId={item.id}
              parentId={null}
              onAdd={(r) => { addReply(r); setShowReplyForm(false) }}
              onCancel={() => setShowReplyForm(false)}
              autoFocus
            />
          </div>
        ) : (
          <button onClick={() => setShowReplyForm(true)} className="text-xs text-zinc-400 hover:text-zinc-700 mt-1">
            댓글 달기
          </button>
        )}
      </div>
    </div>
  )
}

export default function FeedbackBoard({
  initial, currentUserId, currentUserRole,
}: {
  initial: FeedbackItem[]; currentUserId: string; currentUserRole: string
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
    if (uploadedUrls.length + files.length > 3) { setError("이미지는 최대 3장까지 첨부할 수 있습니다"); return }
    setUploading(true); setError("")
    const newUrls: string[] = []
    try {
      for (const file of files) {
        const form = new FormData(); form.append("file", file)
        const res = await fetch("/api/feedback/image", { method: "POST", body: form })
        if (res.ok) { const { url } = await res.json(); newUrls.push(url) }
        else {
          let msg = "이미지 업로드에 실패했습니다"
          try { const d = await res.json(); msg = d.error ?? msg } catch { /* non-JSON */ }
          setError(msg); break
        }
      }
    } catch { setError("네트워크 오류가 발생했습니다.") }
    finally { setUploadedUrls(prev => [...prev, ...newUrls]); setUploading(false) }
  }

  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    await uploadFiles(Array.from(e.target.files ?? []))
    if (fileRef.current) fileRef.current.value = ""
  }

  async function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const imgs = Array.from(e.clipboardData.items).filter(i => i.type.startsWith("image/"))
    if (imgs.length === 0) return
    e.preventDefault()
    await uploadFiles(imgs.map(i => i.getAsFile()).filter(Boolean) as File[])
  }

  async function submit() {
    if (!text.trim()) return
    setPosting(true); setError("")
    const res = await fetch("/api/feedback", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text, imageUrls: uploadedUrls }),
    })
    if (res.ok) {
      const newItem = await res.json()
      setItems(prev => [newItem, ...prev])
      setText(""); setUploadedUrls([])
    } else {
      const d = await res.json(); setError(d.error ?? "오류가 발생했습니다")
    }
    setPosting(false)
  }

  function handleDelete(id: string) { setItems(prev => prev.filter(i => i.id !== id)) }
  function handleUpdate(id: string, content: string) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, content } : i))
  }

  return (
    <div className="space-y-6">
      {/* 작성 폼 */}
      <div className="bg-white border rounded-xl p-5 space-y-3">
        <p className="text-sm font-semibold text-zinc-800">피드백 작성</p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-xs text-blue-800 leading-relaxed">
          불편한 사항이나 오류가 있으면 <strong>화면 캡처를 첨부</strong>해 주세요. 개선에 큰 도움이 됩니다. (PNG·JPG·WebP, 최대 3장)
        </div>
        <textarea
          className="w-full text-sm border rounded-lg px-3 py-2.5 resize-none focus:outline-none focus:ring-1 focus:ring-zinc-400"
          rows={3}
          placeholder="예: ○○ 화면에서 버튼을 눌렀을 때 오류가 발생합니다. 아래 캡처 참고해주세요."
          value={text} onChange={(e) => setText(e.target.value)} onPaste={handlePaste}
        />
        {uploadedUrls.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {uploadedUrls.map((url, i) => (
              <div key={i} className="relative group/img">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`첨부 ${i + 1}`} className="h-20 w-auto rounded border object-cover" />
                <button onClick={() => setUploadedUrls(prev => prev.filter(u => u !== url))}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity">✕</button>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center gap-3 flex-wrap">
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading || uploadedUrls.length >= 3}
            className="text-sm px-4 py-2 rounded-lg border border-zinc-300 text-zinc-600 hover:bg-zinc-50 disabled:opacity-40 flex items-center gap-1.5">
            {uploading ? "업로드 중…" : "📎 파일로 첨부"}
            {uploadedUrls.length > 0 && <span className="text-xs text-zinc-400">({uploadedUrls.length}/3)</span>}
          </button>
          {!uploading && uploadedUrls.length < 3 && (
            <span className="text-xs text-zinc-400">
              또는 위 입력창에 <kbd className="bg-zinc-100 border border-zinc-300 rounded px-1 py-0.5 font-mono text-[11px]">Ctrl+V</kbd> 로 스크린샷 붙여넣기
            </span>
          )}
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple className="hidden" onChange={handleImageSelect} />
          <button onClick={submit} disabled={posting || !text.trim()} className="text-sm px-5 py-2 rounded-lg bg-zinc-900 text-white hover:bg-zinc-700 disabled:opacity-40">
            {posting ? "등록 중…" : "피드백 등록"}
          </button>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>

      {/* 피드백 목록 */}
      {items.length === 0 ? (
        <p className="text-sm text-zinc-400 text-center py-8">아직 피드백이 없습니다. 첫 번째로 의견을 남겨보세요!</p>
      ) : (
        <div className="space-y-4">
          {items.map(item => (
            <FeedbackCard
              key={item.id} item={item}
              uid={currentUserId} role={currentUserRole}
              onDelete={handleDelete} onUpdate={handleUpdate}
            />
          ))}
        </div>
      )}
    </div>
  )
}
