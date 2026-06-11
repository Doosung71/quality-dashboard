"use client"
import { useState, useRef } from "react"
import {
  Send, Paperclip, Pencil, Trash2, CornerDownRight,
  MessageSquare, X, ZoomIn, Smile,
} from "lucide-react"
import { EmojiPicker } from "@/components/board/emoji-picker"
import { cn } from "@/lib/utils"

// ─── 타입 ──────────────────────────────────────────────────

type Author = { id: string; name: string; nickname: string | null; role: string }
type Attachment = { url: string; name: string }
type Reply = {
  id: string; content: string; author: Author
  parentId: string | null; createdAt: string
  attachments?: Attachment[]
}
type ReplyNode = Reply & { children: ReplyNode[] }
type FeedbackItem = {
  id: string; content: string; imageUrls: string | null
  author: Author; createdAt: string; replies: Reply[]
}

// ─── 역할 설정 ─────────────────────────────────────────────

const ROLE_CFG: Record<string, { label: string; bg: string; fg: string; badge: string }> = {
  PRACTITIONER: { label: "실무자", bg: "bg-indigo-100",  fg: "text-indigo-700",  badge: "bg-indigo-50  text-indigo-600  border border-indigo-100"  },
  TEAM_LEAD:    { label: "팀장",   bg: "bg-violet-100",  fg: "text-violet-700",  badge: "bg-violet-50  text-violet-600  border border-violet-100"  },
  DIRECTOR:     { label: "부문장", bg: "bg-emerald-100", fg: "text-emerald-700", badge: "bg-emerald-50 text-emerald-700 border border-emerald-100" },
  ADMIN:        { label: "관리자", bg: "bg-rose-100",    fg: "text-rose-600",    badge: "bg-rose-50    text-rose-600    border border-rose-100"    },
}
function rc(role: string) {
  return ROLE_CFG[role] ?? { label: role, bg: "bg-slate-100", fg: "text-slate-600", badge: "bg-slate-50 text-slate-500 border border-slate-100" }
}

// ─── 유틸 ──────────────────────────────────────────────────

function displayName(a: Author) { return a.nickname || a.name }

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return "방금 전"
  if (m < 60) return `${m}분 전`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}시간 전`
  return new Date(iso).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })
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

// ─── 아바타 ────────────────────────────────────────────────

function Avatar({ author, size = "md" }: { author: Author; size?: "sm" | "md" | "lg" }) {
  const { bg, fg } = rc(author.role)
  const cls = size === "lg" ? "w-9 h-9 text-sm" : size === "sm" ? "w-6 h-6 text-[10px]" : "w-7 h-7 text-xs"
  return (
    <div className={cn("rounded-full font-bold flex items-center justify-center shrink-0", cls, bg, fg)}>
      {displayName(author).slice(0, 1)}
    </div>
  )
}

// ─── 작성자 정보 줄 ────────────────────────────────────────

function AuthorLine({ author, createdAt, compact = false }: { author: Author; createdAt: string; compact?: boolean }) {
  const { label, badge } = rc(author.role)
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className={cn("font-semibold text-slate-900", compact ? "text-xs" : "text-sm")}>
        {displayName(author)}
      </span>
      <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none", badge)}>
        {label}
      </span>
      <span className="text-[10px] text-slate-400">{timeAgo(createdAt)}</span>
    </div>
  )
}

// ─── 이미지 그리드 ─────────────────────────────────────────

function ImageGrid({ urls }: { urls: string[] }) {
  const [lightbox, setLightbox] = useState<string | null>(null)
  if (urls.length === 0) return null
  return (
    <>
      <div className={cn("grid gap-2 mt-3",
        urls.length === 1 ? "grid-cols-1"
        : urls.length === 2 ? "grid-cols-2"
        : "grid-cols-3")}>
        {urls.map((url, i) => (
          <button key={i} onClick={() => setLightbox(url)}
            className="relative rounded-xl overflow-hidden bg-slate-100 group focus:outline-none"
            style={{ paddingTop: urls.length === 1 ? "45%" : "100%" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`첨부 이미지 ${i + 1}`}
              className="absolute inset-0 w-full h-full object-cover group-hover:opacity-90 transition-opacity" />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <ZoomIn className="w-5 h-5 text-white drop-shadow" />
            </div>
          </button>
        ))}
      </div>
      {lightbox && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="첨부 이미지" className="max-w-full max-h-[90vh] rounded-xl shadow-2xl" />
          <button
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/60 transition-colors"
            onClick={() => setLightbox(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </>
  )
}

// ─── 댓글 입력 폼 ──────────────────────────────────────────

function ReplyForm({
  feedbackId, parentId, currentUserInitial, onAdd, onCancel, autoFocus,
}: {
  feedbackId: string; parentId: string | null; currentUserInitial: string
  onAdd: (r: Reply) => void; onCancel?: () => void; autoFocus?: boolean
}) {
  const [text, setText] = useState("")
  const [posting, setPosting] = useState(false)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function insertEmoji(emoji: string) {
    const el = textareaRef.current
    if (!el) { setText(t => t + emoji); return }
    const s = el.selectionStart ?? text.length
    const e2 = el.selectionEnd ?? text.length
    const next = text.slice(0, s) + emoji + text.slice(e2)
    setText(next)
    setTimeout(() => { el.focus(); el.setSelectionRange(s + emoji.length, s + emoji.length) }, 0)
  }

  async function uploadFiles(files: File[]) {
    if (attachments.length + files.length > 3) { setUploadError("이미지는 최대 3장까지"); return }
    setUploading(true); setUploadError("")
    const newAttachments: Attachment[] = []
    for (const file of files) {
      const form = new FormData(); form.append("file", file)
      try {
        const res = await fetch("/api/feedback/image", { method: "POST", body: form })
        if (res.ok) {
          const { url } = await res.json()
          newAttachments.push({ url, name: file.name })
        } else {
          // fail-open: 업로드 실패해도 텍스트 댓글은 가능
          let msg = "이미지 업로드 실패"
          try { const d = await res.json(); msg = d.error ?? msg } catch { /* noop */ }
          setUploadError(msg)
        }
      } catch { setUploadError("네트워크 오류") }
    }
    setAttachments(prev => [...prev, ...newAttachments])
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ""
  }

  async function submit() {
    if (!text.trim()) return
    setPosting(true)
    const res = await fetch(`/api/feedback/${feedbackId}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text, parentId, attachments }),
    })
    if (res.ok) {
      onAdd(await res.json())
      setText(""); setAttachments([]); setUploadError("")
      onCancel?.()
    }
    setPosting(false)
  }

  return (
    <div className="flex gap-2.5 items-start">
      <div className="w-6 h-6 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-1.5">
        {currentUserInitial}
      </div>
      <div className="flex-1 min-w-0">
        <div className="relative">
          <textarea
            ref={textareaRef}
            className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 pr-16 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent bg-slate-50 placeholder:text-slate-400"
            rows={2}
            placeholder={parentId ? "답글을 입력하세요… (Enter 전송)" : "댓글을 입력하세요… (Enter 전송)"}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (text.trim()) submit() }
              if (e.key === "Escape") onCancel?.()
            }}
            autoFocus={autoFocus}
          />
          <div className="absolute right-8 bottom-1.5">
            <EmojiPicker onSelect={insertEmoji} />
          </div>
          <button
            onClick={submit}
            disabled={posting || !text.trim()}
            className="absolute right-2 bottom-1.5 p-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:bg-slate-300 transition-all">
            <Send className="w-3 h-3" />
          </button>
        </div>

        {/* 첨부 이미지 미리보기 */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {attachments.map((a, i) => (
              <div key={i} className="relative group/img">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.url} alt={a.name} className="h-14 w-auto rounded-lg border object-cover" />
                <button
                  onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))}
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity shadow-sm">
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 첨부 버튼 + 오류 */}
        <div className="flex items-center gap-2 mt-1">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading || attachments.length >= 3}
            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-indigo-500 transition-colors disabled:opacity-40">
            <Paperclip className="w-3 h-3" />
            {uploading ? "업로드 중…" : `이미지${attachments.length > 0 ? ` (${attachments.length}/3)` : ""}`}
          </button>
          {uploadError && <span className="text-[10px] text-rose-400">{uploadError}</span>}
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden"
            onChange={e => uploadFiles(Array.from(e.target.files ?? []))} />
        </div>
      </div>
      {onCancel && (
        <button onClick={onCancel}
          className="mt-1.5 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

// ─── 댓글 아이템 ───────────────────────────────────────────

function ReplyItem({
  node, feedbackId, depth, uid, role, currentUserInitial,
  onAdd, onRemove, onUpdate,
}: {
  node: ReplyNode; feedbackId: string; depth: number
  uid: string; role: string; currentUserInitial: string
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

  return (
    <div className={cn(deleting && "opacity-40 pointer-events-none")}>
      <div className="flex gap-2.5 group/reply">
        <Avatar author={node.author} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <AuthorLine author={node.author} createdAt={node.createdAt} compact />
            {!editing && !deleting && (
              <div className="ml-auto flex items-center gap-1.5 opacity-0 group-hover/reply:opacity-100 transition-opacity shrink-0">
                <button onClick={() => setReplying(v => !v)}
                  className="text-[10px] text-slate-400 hover:text-indigo-600 flex items-center gap-0.5 transition-colors px-1.5 py-0.5 rounded hover:bg-indigo-50">
                  <CornerDownRight className="w-3 h-3" /> 답글
                </button>
                {canEdit(node.author.id, uid) && (
                  <button onClick={() => setEditing(true)}
                    className="p-1 rounded text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 transition-colors">
                    <Pencil className="w-3 h-3" />
                  </button>
                )}
                {canDelete(node.author.id, uid, role) && (
                  <button onClick={handleDelete}
                    className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors">
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
          </div>

          {editing ? (
            <div className="flex gap-2 mt-1">
              <textarea
                className="flex-1 text-sm border border-indigo-200 rounded-xl px-2.5 py-1.5 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent bg-white"
                rows={2} value={editText}
                onChange={e => setEditText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSave() }
                  if (e.key === "Escape") setEditing(false)
                }}
                autoFocus
              />
              <div className="flex flex-col gap-1 shrink-0">
                <button onClick={handleSave} disabled={saving || !editText.trim()}
                  className="text-xs px-2.5 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors">
                  {saving ? "…" : "저장"}
                </button>
                <button onClick={() => { setEditing(false); setEditText(node.content) }}
                  className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors">
                  취소
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{editText}</p>
              {node.attachments && node.attachments.length > 0 && (
                <ImageGrid urls={node.attachments.map(a => a.url)} />
              )}
            </>
          )}
        </div>
      </div>

      {replying && (
        <div className="mt-2 ml-8 pl-3 border-l-2 border-indigo-100">
          <ReplyForm
            feedbackId={feedbackId}
            parentId={node.id}
            currentUserInitial={currentUserInitial}
            onAdd={r => { onAdd(r); setReplying(false) }}
            onCancel={() => setReplying(false)}
            autoFocus
          />
        </div>
      )}

      {node.children.length > 0 && (
        <ReplyTree
          nodes={node.children}
          feedbackId={feedbackId}
          depth={depth + 1}
          uid={uid} role={role}
          currentUserInitial={currentUserInitial}
          onAdd={onAdd} onRemove={onRemove} onUpdate={onUpdate}
        />
      )}
    </div>
  )
}

// ─── 댓글 트리 ─────────────────────────────────────────────

function ReplyTree({
  nodes, feedbackId, depth, uid, role, currentUserInitial, onAdd, onRemove, onUpdate,
}: {
  nodes: ReplyNode[]; feedbackId: string; depth: number
  uid: string; role: string; currentUserInitial: string
  onAdd: (r: Reply) => void
  onRemove: (id: string) => void
  onUpdate: (id: string, content: string) => void
}) {
  const vis = Math.min(depth, 3)
  return (
    <div className={cn("mt-2 space-y-3", vis > 0 && "ml-8 pl-3 border-l-2 border-slate-100")}>
      {nodes.map(node => (
        <ReplyItem
          key={node.id}
          node={node} feedbackId={feedbackId} depth={depth}
          uid={uid} role={role} currentUserInitial={currentUserInitial}
          onAdd={onAdd} onRemove={onRemove} onUpdate={onUpdate}
        />
      ))}
    </div>
  )
}

// ─── 피드백 카드 ───────────────────────────────────────────

function FeedbackCard({
  item, uid, role, currentUserInitial, onDelete, onUpdate,
}: {
  item: FeedbackItem; uid: string; role: string; currentUserInitial: string
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
    <div className={cn(
      "bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow group/card",
      deleting && "opacity-40 pointer-events-none"
    )}>
      {/* 헤더 */}
      <div className="flex items-start gap-3 px-5 pt-5 pb-0">
        <Avatar author={item.author} size="lg" />
        <div className="flex-1 min-w-0 pt-0.5">
          <AuthorLine author={item.author} createdAt={item.createdAt} />
        </div>
        {!editing && !deleting && (
          <div className="flex gap-0.5 opacity-0 group-hover/card:opacity-100 transition-opacity shrink-0">
            {canEdit(item.author.id, uid) && (
              <button onClick={() => setEditing(true)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 transition-colors">
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
            {canDelete(item.author.id, uid, role) && (
              <button onClick={handleDelete}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* 본문 */}
      <div className="px-5 pt-3 pb-3">
        {editing ? (
          <div className="space-y-2">
            <textarea
              className="w-full text-sm border border-indigo-200 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
              rows={4} value={editText} onChange={e => setEditText(e.target.value)} autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setEditing(false); setEditText(item.content) }}
                className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors">취소</button>
              <button onClick={handleSave} disabled={saving || !editText.trim()}
                className="text-xs px-4 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors">
                {saving ? "저장 중…" : "저장"}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">{editText}</p>
        )}
        <ImageGrid urls={parseUrls(item.imageUrls)} />
      </div>

      {/* 댓글 섹션 */}
      <div className="border-t border-slate-50 px-5 pt-3 pb-4 space-y-3">
        {/* 댓글 수 표시 + 달기 버튼 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>{allReplies.length > 0 ? `댓글 ${allReplies.length}` : "댓글"}</span>
          </div>
          {!showReplyForm && (
            <button onClick={() => setShowReplyForm(true)}
              className="text-xs text-slate-400 hover:text-indigo-600 flex items-center gap-1 transition-colors px-2 py-1 rounded-lg hover:bg-indigo-50">
              <CornerDownRight className="w-3 h-3" /> 댓글 달기
            </button>
          )}
        </div>

        {/* 댓글 트리 */}
        {tree.length > 0 && (
          <ReplyTree
            nodes={tree} feedbackId={item.id} depth={0}
            uid={uid} role={role} currentUserInitial={currentUserInitial}
            onAdd={addReply} onRemove={removeReply} onUpdate={updateReply}
          />
        )}

        {/* 댓글 입력폼 */}
        {showReplyForm && (
          <ReplyForm
            feedbackId={item.id}
            parentId={null}
            currentUserInitial={currentUserInitial}
            onAdd={r => { addReply(r); setShowReplyForm(false) }}
            onCancel={() => setShowReplyForm(false)}
            autoFocus
          />
        )}
      </div>
    </div>
  )
}

// ─── 메인 컴포넌트 ─────────────────────────────────────────

export default function FeedbackBoard({
  initial, currentUserId, currentUserRole, currentUserName,
}: {
  initial: FeedbackItem[]
  currentUserId: string
  currentUserRole: string
  currentUserName: string
}) {
  const [items, setItems] = useState(initial)
  const [text, setText] = useState("")
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const currentUserInitial = (currentUserName || "나").slice(0, 1)

  function insertEmoji(emoji: string) {
    const el = textareaRef.current
    if (!el) { setText(t => t + emoji); return }
    const s = el.selectionStart ?? text.length
    const e2 = el.selectionEnd ?? text.length
    const next = text.slice(0, s) + emoji + text.slice(e2)
    setText(next)
    setTimeout(() => { el.focus(); el.setSelectionRange(s + emoji.length, s + emoji.length) }, 0)
  }

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
      try { const d = await res.json(); setError(d.error ?? "오류가 발생했습니다") } catch { setError("오류가 발생했습니다") }
    }
    setPosting(false)
  }

  function handleDelete(id: string) { setItems(prev => prev.filter(i => i.id !== id)) }
  function handleUpdate(id: string, content: string) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, content } : i))
  }

  return (
    <div className="space-y-5">
      {/* ── 작성 폼 ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
        {/* 안내 배너 */}
        <div className="flex items-start gap-3 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3">
          <Smile className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
          <p className="text-xs text-indigo-700 leading-relaxed">
            불편한 사항이나 오류가 있으면 <strong>화면 캡처를 첨부</strong>해 주세요.
            모든 의견을 검토하여 다음 업데이트에 반영합니다. (PNG·JPG·WebP, 최대 3장)
          </p>
        </div>

        {/* 현재 사용자 + 텍스트 영역 */}
        <div className="flex gap-3">
          <div className={cn(
            "rounded-full font-bold flex items-center justify-center shrink-0 mt-1 w-8 h-8 text-xs",
            rc(currentUserRole).bg, rc(currentUserRole).fg
          )}>
            {currentUserInitial}
          </div>
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              className="w-full text-sm border border-slate-200 rounded-xl px-3.5 py-3 pr-10 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent bg-slate-50 placeholder:text-slate-400"
              rows={3}
              placeholder="시스템을 사용하면서 불편한 점, 오류, 개선 아이디어를 남겨주세요…"
              value={text}
              onChange={e => setText(e.target.value)}
              onPaste={handlePaste}
            />
            <div className="absolute right-2.5 bottom-2.5">
              <EmojiPicker onSelect={insertEmoji} />
            </div>
          </div>
        </div>

        {/* 첨부 이미지 미리보기 */}
        {uploadedUrls.length > 0 && (
          <div className="flex flex-wrap gap-2 ml-11">
            {uploadedUrls.map((url, i) => (
              <div key={i} className="relative group/img">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`첨부 ${i + 1}`} className="h-20 w-auto rounded-xl border object-cover" />
                <button onClick={() => setUploadedUrls(prev => prev.filter(u => u !== url))}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 text-white text-xs flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity shadow-sm">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 액션 바 */}
        <div className="flex items-center gap-2 ml-11">
          <button type="button" onClick={() => fileRef.current?.click()}
            disabled={uploading || uploadedUrls.length >= 3}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 border border-slate-200 hover:border-indigo-300 px-3 py-1.5 rounded-lg transition-all disabled:opacity-40">
            <Paperclip className="w-3.5 h-3.5" />
            {uploading ? "업로드 중…" : "파일 첨부"}
            {uploadedUrls.length > 0 && <span className="text-slate-400">({uploadedUrls.length}/3)</span>}
          </button>
          {!uploading && uploadedUrls.length < 3 && (
            <span className="text-xs text-slate-400 hidden sm:inline">
              또는 입력창에 <kbd className="bg-slate-100 border border-slate-200 rounded px-1 py-0.5 font-mono text-[10px]">Ctrl+V</kbd> 붙여넣기
            </span>
          )}
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple className="hidden"
            onChange={handleImageSelect} />
          <button onClick={submit} disabled={posting || !text.trim()}
            className="ml-auto flex items-center gap-1.5 text-sm px-4 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors font-medium">
            <Send className="w-3.5 h-3.5" />
            {posting ? "등록 중…" : "등록"}
          </button>
        </div>
        {error && <p className="text-xs text-rose-500 ml-11">{error}</p>}
      </div>

      {/* ── 피드백 목록 ── */}
      {items.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm">아직 피드백이 없습니다.</p>
          <p className="text-xs mt-1">첫 번째로 의견을 남겨보세요!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map(item => (
            <FeedbackCard
              key={item.id} item={item}
              uid={currentUserId} role={currentUserRole}
              currentUserInitial={currentUserInitial}
              onDelete={handleDelete} onUpdate={handleUpdate}
            />
          ))}
        </div>
      )}
    </div>
  )
}
