"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Image from "next/image"
import {
  Pin, PinOff, Plus, X, Trash2, MessageSquare,
  ChevronRight, Megaphone, Send, CornerDownRight, Pencil, Check,
  Paperclip, FileText, Download, ZoomIn,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { Role } from "@/lib/generated/prisma/client"
import { EmojiPicker } from "./emoji-picker"
import { VisibilitySelector, VisibilityBadge } from "./visibility-selector"
import { MarkdownContent } from "@/components/ui/markdown-content"
import type { Visibility } from "@/lib/board-visibility"

// ─── 타입 ──────────────────────────────────────────────────

type Attachment = { url: string; name: string; size: number; contentType: string }
type Author = { id: string; name: string; nickname: string | null; department: string | null }
type DisplayMode = "REAL" | "NICKNAME" | "ANONYMOUS"

type Comment = {
  id: string; content: string; createdAt: string
  author: Author; parentId: string | null
  displayMode: DisplayMode
  visibility: Visibility
}

type CommentNode = Comment & { children: CommentNode[] }

type Post = {
  id: string; title: string; content: string
  category: "NOTICE" | "GENERAL"; pinned: boolean
  createdAt: string; author: Author
  displayMode: DisplayMode
  visibility: Visibility
  attachments: Attachment[]
  _count?: { comments: number }
  comments?: Comment[]
}

// ─── 트리 빌더 ─────────────────────────────────────────────

function buildTree(comments: Comment[]): CommentNode[] {
  const map = new Map<string, CommentNode>()
  const roots: CommentNode[] = []
  for (const c of comments) map.set(c.id, { ...c, children: [] })
  for (const c of comments) {
    const node = map.get(c.id)!
    if (c.parentId && map.has(c.parentId)) map.get(c.parentId)!.children.push(node)
    else roots.push(node)
  }
  return roots
}

// ─── 유틸 ──────────────────────────────────────────────────

function resolveDisplayName(author: Author, mode: DisplayMode) {
  if (mode === "ANONYMOUS") return "익명"
  if (mode === "NICKNAME") return author.nickname ?? author.name
  return author.name
}

function authorLabel(a: Author, mode?: DisplayMode) {
  return resolveDisplayName(a, mode ?? "REAL")
}

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return "방금 전"
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
  return new Date(iso).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })
}

function isImage(ct: string) { return ct.startsWith("image/") }
function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}

// ─── 첨부 파일 표시 ────────────────────────────────────────

function AttachmentList({ attachments, preview = false }: { attachments: Attachment[]; preview?: boolean }) {
  const [lightbox, setLightbox] = useState<string | null>(null)
  if (!attachments.length) return null

  const images = attachments.filter(a => isImage(a.contentType))
  const files  = attachments.filter(a => !isImage(a.contentType))

  return (
    <div className="space-y-3">
      {images.length > 0 && (
        <div className={cn("grid gap-2", images.length === 1 ? "grid-cols-1" : images.length === 2 ? "grid-cols-2" : "grid-cols-3")}>
          {images.map((img, i) => (
            <div key={i} className="relative rounded-xl overflow-hidden bg-slate-100 group cursor-pointer"
              style={{ paddingTop: images.length === 1 ? "40%" : "100%" }}
              onClick={() => !preview && setLightbox(img.url)}>
              <Image src={img.url} alt={img.name} fill className="object-cover" sizes="400px" />
              {!preview && (
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                  <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {files.length > 0 && (
        <div className="space-y-1.5">
          {files.map((f, i) => (
            <a key={i} href={f.url} target="_blank" rel="noopener noreferrer" download={f.name}
              className="flex items-center gap-3 px-3 py-2 bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-100 transition-colors group">
              <FileText className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="flex-1 text-xs font-medium text-slate-700 truncate">{f.name}</span>
              <span className="text-[10px] text-slate-400">{fmtSize(f.size)}</span>
              <Download className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 transition-colors" />
            </a>
          ))}
        </div>
      )}
      {lightbox && (
        <div className="fixed inset-0 z-100 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}>
          <div className="relative max-w-4xl max-h-[90vh] w-full">
            <Image src={lightbox} alt="preview" width={1200} height={900}
              className="object-contain rounded-xl max-h-[85vh] w-auto mx-auto" />
            <button onClick={() => setLightbox(null)}
              className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg hover:bg-slate-100 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── 작성자 표시 선택기 ────────────────────────────────────

function DisplayModeSelector({ value, onChange, compact = false }: {
  value: DisplayMode; onChange: (m: DisplayMode) => void; compact?: boolean
}) {
  const options: { v: DisplayMode; label: string }[] = [
    { v: "REAL",      label: "실명"   },
    { v: "NICKNAME",  label: "닉네임" },
    { v: "ANONYMOUS", label: "익명"   },
  ]
  return (
    <div className={cn("flex items-center gap-2", compact ? "flex-row" : "")}>
      {!compact && <span className="text-[10px] text-slate-500 font-semibold shrink-0">작성자 표시</span>}
      <div className="flex gap-1">
        {options.map(o => (
          <button key={o.v} type="button" onClick={() => onChange(o.v)}
            className={cn(
              "px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all",
              value === o.v
                ? o.v === "ANONYMOUS"
                  ? "bg-slate-700 border-slate-700 text-white"
                  : "bg-indigo-600 border-indigo-600 text-white"
                : "bg-white border-slate-200 text-slate-500 hover:border-slate-400"
            )}>
            {o.v === "ANONYMOUS" ? "🕵️ " + o.label : o.v === "NICKNAME" ? "🏷️ " + o.label : "👤 " + o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── 댓글 아이템 (재귀 지원) ────────────────────────────────

function CommentItem({
  node, postId, depth, currentUserId, currentUserName, isPrivileged, onRefresh,
}: {
  node: CommentNode; postId: string; depth: number
  currentUserId: string; currentUserName: string; isPrivileged: boolean
  onRefresh: () => void
}) {
  const canAct = node.author.id === currentUserId || isPrivileged
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(node.content)
  const [editVis, setEditVis] = useState<Visibility>(node.visibility)
  const [replyOpen, setReplyOpen] = useState(false)
  const [replyText, setReplyText] = useState("")
  const [replyMode, setReplyMode] = useState<DisplayMode>("REAL")
  const [replyVis, setReplyVis] = useState<Visibility>("ALL")
  const [editSaving, setEditSaving] = useState(false)
  const [replySubmitting, setReplySubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function submitEdit() {
    if (!editText.trim()) return
    setEditSaving(true)
    await fetch(`/api/board/${postId}/comments/${node.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: editText, visibility: editVis }),
    })
    setIsEditing(false)
    setEditSaving(false)
    onRefresh()
  }

  async function handleDelete() {
    if (!confirm("댓글을 삭제하시겠습니까? 달린 대댓글도 모두 삭제됩니다.")) return
    setDeleting(true)
    await fetch(`/api/board/${postId}/comments/${node.id}`, { method: "DELETE" })
    onRefresh()
  }

  async function submitReply() {
    if (!replyText.trim()) return
    setReplySubmitting(true)
    await fetch(`/api/board/${postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: replyText, parentId: node.id, displayMode: replyMode, visibility: replyVis }),
    })
    setReplyText("")
    setReplyOpen(false)
    setReplySubmitting(false)
    onRefresh()
  }

  // 깊이별 아바타 스타일
  const avatarClass = depth === 0
    ? "w-7 h-7 bg-slate-700 text-white text-[10px]"
    : depth === 1
    ? "w-6 h-6 bg-indigo-100 text-indigo-700 text-[9px]"
    : "w-6 h-6 bg-emerald-100 text-emerald-700 text-[9px]"

  return (
    <div className={deleting ? "opacity-40 pointer-events-none" : ""}>
      {/* 댓글 본문 */}
      <div className="group flex gap-3">
        <div className={cn("rounded-full font-bold flex items-center justify-center shrink-0 mt-0.5", avatarClass)}>
          {authorLabel(node.author, node.displayMode).slice(0, 1)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-900">{authorLabel(node.author, node.displayMode)}</span>
            {node.displayMode !== "ANONYMOUS" && node.author.department && (
              <span className="text-[10px] text-slate-400">{node.author.department}</span>
            )}
            <span className="text-[10px] text-slate-400">{timeAgo(node.createdAt)}</span>
          </div>

          {isEditing ? (
            <div className="mt-1 space-y-1.5">
              <textarea
                autoFocus
                value={editText}
                onChange={e => setEditText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitEdit() }
                  if (e.key === "Escape") setIsEditing(false)
                }}
                rows={3}
                className="w-full border border-indigo-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
              />
              <VisibilitySelector value={editVis} onChange={setEditVis} compact />
              <div className="flex gap-2">
                <button onClick={submitEdit} disabled={editSaving}
                  className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition-colors">
                  <Check className="w-3 h-3" /> {editSaving ? "저장 중..." : "저장"}
                </button>
                <button onClick={() => { setIsEditing(false); setEditText(node.content) }}
                  className="text-xs text-slate-400 hover:text-slate-600 px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
                  취소
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{node.content}</p>
              <VisibilityBadge visibility={node.visibility} />
            </div>
          )}

          {!isEditing && !deleting && (
            <div className="flex items-center gap-3 mt-1">
              <button
                onClick={() => setReplyOpen(v => !v)}
                className="text-[10px] text-slate-400 hover:text-indigo-600 flex items-center gap-1 transition-colors">
                <CornerDownRight className="w-3 h-3" /> {replyOpen ? "취소" : "답글"}
              </button>
              {canAct && (
                <>
                  <button
                    onClick={() => { setIsEditing(true); setEditText(node.content); setEditVis(node.visibility) }}
                    className="text-[10px] text-slate-400 hover:text-indigo-500 flex items-center gap-1 transition-colors opacity-0 group-hover:opacity-100">
                    <Pencil className="w-3 h-3" /> 수정
                  </button>
                  <button
                    onClick={handleDelete}
                    className="text-[10px] text-slate-400 hover:text-rose-500 flex items-center gap-1 transition-colors opacity-0 group-hover:opacity-100">
                    <Trash2 className="w-3 h-3" /> 삭제
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 인라인 답글 폼 */}
      {replyOpen && (
        <div className="ml-10 mt-2 pl-3 border-l-2 border-indigo-100">
          <div className="flex items-center gap-3 mb-1.5 flex-wrap">
            <DisplayModeSelector value={replyMode} onChange={setReplyMode} compact />
            <VisibilitySelector value={replyVis} onChange={setReplyVis} compact />
          </div>
          <div className="flex gap-2">
            <div className="w-6 h-6 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-1">
              {currentUserName.slice(0, 1)}
            </div>
            <div className="flex-1 flex gap-2">
              <textarea
                autoFocus
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (replyText.trim()) submitReply() }
                  if (e.key === "Escape") { setReplyOpen(false); setReplyText("") }
                }}
                placeholder={`${authorLabel(node.author, node.displayMode)}님에게 답글 (Enter 전송)`}
                rows={2}
                className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
              />
              <button
                onClick={submitReply}
                disabled={!replyText.trim() || replySubmitting}
                className="self-end px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl disabled:opacity-40 transition-all">
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 하위 댓글 재귀 렌더링 */}
      {node.children.length > 0 && (
        <CommentTree
          nodes={node.children}
          postId={postId}
          depth={depth + 1}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          isPrivileged={isPrivileged}
          onRefresh={onRefresh}
        />
      )}
    </div>
  )
}

// ─── 댓글 트리 (재귀 컨테이너) ─────────────────────────────

function CommentTree({
  nodes, postId, depth, currentUserId, currentUserName, isPrivileged, onRefresh,
}: {
  nodes: CommentNode[]; postId: string; depth: number
  currentUserId: string; currentUserName: string; isPrivileged: boolean
  onRefresh: () => void
}) {
  const visualDepth = Math.min(depth, 3)
  return (
    <div className={cn("mt-3 space-y-4", visualDepth > 0 && "ml-10 border-l-2 border-slate-100 pl-3")}>
      {nodes.map(node => (
        <CommentItem
          key={node.id}
          node={node}
          postId={postId}
          depth={depth}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          isPrivileged={isPrivileged}
          onRefresh={onRefresh}
        />
      ))}
    </div>
  )
}

// ─── 메인 컴포넌트 ─────────────────────────────────────────

interface BoardClientProps {
  currentUserId: string
  currentUserRole: Role
  currentUserName: string
}

export function BoardClient({ currentUserId, currentUserRole, currentUserName }: BoardClientProps) {
  const isPrivileged = currentUserRole === "ADMIN" || currentUserRole === "DIRECTOR"

  const [posts, setPosts] = useState<Post[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<Post | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [listTab, setListTab] = useState<"ALL" | "NOTICE" | "GENERAL">("ALL")

  // 새 글 작성 폼
  const [showNewPost, setShowNewPost] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newContent, setNewContent] = useState("")
  const [newCategory, setNewCategory] = useState<"GENERAL" | "NOTICE">("GENERAL")
  const [newPinned, setNewPinned] = useState(false)
  const [newDisplayMode, setNewDisplayMode] = useState<DisplayMode>("REAL")
  const [newVisibility, setNewVisibility] = useState<Visibility>("ALL")
  const [submitting, setSubmitting] = useState(false)

  // 파일 첨부 (새 글)
  const [pendingFiles, setPendingFiles] = useState<Attachment[]>([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 게시글 인라인 편집
  const [editingPost, setEditingPost] = useState(false)
  const [editTitle, setEditTitle] = useState("")
  const [editContent, setEditContent] = useState("")
  const [editAttachments, setEditAttachments] = useState<Attachment[]>([])
  const [editVisibility, setEditVisibility] = useState<Visibility>("ALL")
  const [postSaving, setPostSaving] = useState(false)
  const editFileRef = useRef<HTMLInputElement>(null)

  // 댓글 입력 (최상위 댓글만)
  const [commentText, setCommentText] = useState("")
  const [commentDisplayMode, setCommentDisplayMode] = useState<DisplayMode>("REAL")
  const [commentVisibility, setCommentVisibility] = useState<Visibility>("ALL")
  const [commentSubmitting, setCommentSubmitting] = useState(false)
  const commentInputRef = useRef<HTMLTextAreaElement>(null)

  const loadPosts = useCallback(async () => {
    const res = await fetch("/api/board")
    if (res.ok) setPosts(await res.json())
  }, [])

  useEffect(() => { loadPosts() }, [loadPosts])

  const loadDetail = useCallback(async (id: string) => {
    setLoadingDetail(true)
    const res = await fetch(`/api/board/${id}`)
    if (res.ok) setDetail(await res.json())
    setLoadingDetail(false)
  }, [])

  useEffect(() => {
    if (selectedId) loadDetail(selectedId)
    else setDetail(null)
    setEditingPost(false)
  }, [selectedId, loadDetail])

  async function handlePostSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim() || !newContent.trim()) return
    setSubmitting(true)
    const res = await fetch("/api/board", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle, content: newContent, category: newCategory, pinned: newPinned, attachments: pendingFiles, displayMode: newDisplayMode, visibility: newVisibility }),
    })
    if (res.ok) {
      const created = await res.json() as Post
      setNewTitle(""); setNewContent(""); setNewCategory("GENERAL"); setNewPinned(false); setPendingFiles([]); setNewDisplayMode("REAL"); setNewVisibility("ALL")
      setShowNewPost(false)
      await loadPosts()
      setSelectedId(created.id)
    }
    setSubmitting(false)
  }

  async function uploadFiles(files: FileList, setter: (a: Attachment[]) => void, current: Attachment[]) {
    setUploading(true)
    const uploaded: Attachment[] = []
    for (const file of Array.from(files)) {
      const form = new FormData(); form.append("file", file)
      const res = await fetch("/api/board/upload", { method: "POST", body: form })
      if (res.ok) uploaded.push(await res.json())
    }
    setter([...current, ...uploaded])
    setUploading(false)
  }

  function startEditPost(post: Post) {
    setEditTitle(post.title)
    setEditContent(post.content)
    setEditAttachments(post.attachments ?? [])
    setEditVisibility(post.visibility ?? "ALL")
    setEditingPost(true)
  }

  async function handleSavePost() {
    if (!selectedId || !editTitle.trim() || !editContent.trim()) return
    setPostSaving(true)
    await fetch(`/api/board/${selectedId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: editTitle.trim(), content: editContent.trim(), attachments: editAttachments, visibility: editVisibility }),
    })
    setEditingPost(false)
    loadDetail(selectedId)
    loadPosts()
    setPostSaving(false)
  }

  async function handleDeletePost(id: string) {
    if (!confirm("게시글을 삭제하시겠습니까?")) return
    await fetch(`/api/board/${id}`, { method: "DELETE" })
    setSelectedId(null)
    loadPosts()
  }

  async function handleTogglePin(id: string, pinned: boolean) {
    await fetch(`/api/board/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned: !pinned }),
    })
    loadPosts()
    if (selectedId === id) loadDetail(id)
  }

  async function handleToggleCategory(id: string, category: "NOTICE" | "GENERAL") {
    await fetch(`/api/board/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: category === "NOTICE" ? "GENERAL" : "NOTICE" }),
    })
    loadPosts()
    if (selectedId === id) loadDetail(id)
  }

  async function handleCommentSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!commentText.trim() || !selectedId) return
    setCommentSubmitting(true)
    await fetch(`/api/board/${selectedId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: commentText, parentId: null, displayMode: commentDisplayMode, visibility: commentVisibility }),
    })
    setCommentText("")
    loadDetail(selectedId)
    loadPosts()
    setCommentSubmitting(false)
  }

  function insertEmoji(emoji: string) {
    const el = commentInputRef.current
    if (!el) { setCommentText(t => t + emoji); return }
    const start = el.selectionStart ?? commentText.length
    const end = el.selectionEnd ?? commentText.length
    const next = commentText.slice(0, start) + emoji + commentText.slice(end)
    setCommentText(next)
    setTimeout(() => { el.focus(); el.setSelectionRange(start + emoji.length, start + emoji.length) }, 0)
  }

  const commentCount = detail?.comments?.length ?? 0
  const showRight = !!selectedId || showNewPost

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden">

      {/* ── 좌측: 게시글 목록 ── */}
      <div className={`flex w-full lg:w-72 shrink-0 bg-white border-r border-slate-100 flex-col${showRight ? " max-lg:hidden" : ""}`}>
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800">품질부문 게시판</h2>
          <button
            onClick={() => setShowNewPost(v => !v)}
            className={cn(
              "flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-all",
              showNewPost ? "bg-slate-100 text-slate-600" : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
            )}
          >
            {showNewPost ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {showNewPost ? "취소" : "새 글"}
          </button>
        </div>

        <div className="flex border-b border-slate-100 shrink-0">
          {(["ALL", "NOTICE", "GENERAL"] as const).map(tab => (
            <button key={tab} onClick={() => setListTab(tab)}
              className={cn(
                "flex-1 py-2 text-xs font-semibold transition-all",
                listTab === tab
                  ? tab === "NOTICE"
                    ? "text-amber-700 border-b-2 border-amber-500 bg-amber-50/50"
                    : "text-indigo-700 border-b-2 border-indigo-500"
                  : "text-slate-400 hover:text-slate-700"
              )}>
              {tab === "ALL" ? "전체" : tab === "NOTICE" ? "📢 공지" : "💬 일반"}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {(() => {
            const filtered = posts.filter(p => listTab === "ALL" ? true : p.category === listTab)
            if (filtered.length === 0) return (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <MessageSquare className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-xs">{listTab === "NOTICE" ? "등록된 공지가 없습니다." : "아직 게시글이 없습니다."}</p>
              </div>
            )
            return filtered.map(post => {
              const isActive = post.id === selectedId
              const isNotice = post.category === "NOTICE"
              return (
                <button
                  key={post.id}
                  onClick={() => setSelectedId(post.id)}
                  className={cn(
                    "w-full text-left px-4 py-3 transition-all border-b border-slate-50",
                    isActive
                      ? isNotice ? "bg-amber-50 border-l-2 border-amber-500" : "bg-indigo-50 border-l-2 border-indigo-500"
                      : isNotice
                        ? "bg-amber-50/30 hover:bg-amber-50 border-l-2 border-amber-200"
                        : "hover:bg-slate-50 border-l-2 border-transparent"
                  )}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    {isNotice && <Megaphone className="w-3 h-3 text-amber-500 shrink-0" />}
                    {post.pinned && <Pin className="w-3 h-3 text-amber-500 shrink-0" />}
                    <span className={cn("text-xs line-clamp-1 flex-1", isNotice ? "font-bold text-amber-900" : "font-semibold text-slate-800")}>{post.title}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span>{authorLabel(post.author, post.displayMode as DisplayMode)}</span>
                      <VisibilityBadge visibility={post.visibility} />
                    </div>
                    <div className="flex items-center gap-2">
                      {(post._count?.comments ?? 0) > 0 && (
                        <span className="flex items-center gap-0.5">
                          <MessageSquare className="w-3 h-3" />{post._count?.comments}
                        </span>
                      )}
                      <span>{timeAgo(post.createdAt)}</span>
                    </div>
                  </div>
                </button>
              )
            })
          })()}
        </div>
      </div>

      {/* ── 우측: 상세 / 새 글 작성 ── */}
      <div className={`flex flex-1 flex-col bg-slate-50 overflow-hidden${!showRight ? " max-lg:hidden" : ""}`}>

        {/* 모바일 뒤로가기 */}
        <div className="lg:hidden flex items-center gap-2 px-4 py-2 bg-white border-b border-slate-100 shrink-0">
          <button
            onClick={() => { setSelectedId(null); setShowNewPost(false); setEditingPost(false) }}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors">
            <ChevronRight className="w-4 h-4 rotate-180" /> 목록으로
          </button>
          {showNewPost && <span className="text-xs text-slate-400">새 게시글 작성</span>}
        </div>

        {/* 새 글 작성 폼 */}
        {showNewPost && (
          <div className="shrink-0 bg-white border-b border-slate-200 px-6 py-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4 text-indigo-500" /> 새 게시글 작성
            </h3>
            <form onSubmit={handlePostSubmit} className="space-y-3">
              <div className="flex gap-3 items-center">
                <input
                  type="text"
                  placeholder="제목을 입력하세요"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  required
                  className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                />
                {isPrivileged && (
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 cursor-pointer">
                    <input type="checkbox" checked={newCategory === "NOTICE"}
                      onChange={e => setNewCategory(e.target.checked ? "NOTICE" : "GENERAL")}
                      className="rounded border-slate-300 text-amber-500 focus:ring-amber-400"
                    />
                    <Megaphone className="w-3.5 h-3.5 text-amber-500" /> 공지
                  </label>
                )}
                {isPrivileged && (
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 cursor-pointer">
                    <input type="checkbox" checked={newPinned}
                      onChange={e => setNewPinned(e.target.checked)}
                      className="rounded border-slate-300 text-amber-500 focus:ring-amber-400"
                    />
                    <Pin className="w-3.5 h-3.5 text-amber-500" /> 고정
                  </label>
                )}
              </div>

              <div className="flex flex-wrap gap-4">
                <DisplayModeSelector value={newDisplayMode} onChange={setNewDisplayMode} />
                <VisibilitySelector value={newVisibility} onChange={setNewVisibility} compact />
              </div>
              <textarea
                placeholder="내용을 입력하세요..."
                value={newContent}
                onChange={e => setNewContent(e.target.value)}
                required
                rows={4}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent resize-none"
              />

              {pendingFiles.length > 0 && (
                <div className="border border-slate-200 rounded-xl p-3">
                  <AttachmentList attachments={pendingFiles} preview />
                  <div className="flex flex-wrap gap-1 mt-2">
                    {pendingFiles.map((f, i) => (
                      <span key={i} className="flex items-center gap-1 text-[10px] bg-slate-100 px-2 py-0.5 rounded-full text-slate-600">
                        {f.name}
                        <button type="button" onClick={() => setPendingFiles(prev => prev.filter((_, j) => j !== i))}>
                          <X className="w-3 h-3 hover:text-rose-500" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.docx,.xlsx,.pptx,.txt" className="hidden"
                    onChange={e => e.target.files && uploadFiles(e.target.files, setPendingFiles, pendingFiles)} />
                  <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
                    className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 border border-slate-200 hover:border-indigo-300 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50">
                    <Paperclip className="w-3.5 h-3.5" /> {uploading ? "업로드 중..." : "파일 첨부"}
                  </button>
                  <span className="text-[10px] text-slate-400">이미지·PDF·Office (최대 10MB)</span>
                </div>
                <button
                  type="submit" disabled={submitting || uploading}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5 disabled:opacity-50 transition-all shadow-sm">
                  <Send className="w-3.5 h-3.5" /> {submitting ? "등록 중..." : "게시글 등록"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 게시글 상세 */}
        {!selectedId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3">
            <ChevronRight className="w-10 h-10 opacity-20" />
            <p className="text-sm">좌측에서 게시글을 선택하세요.</p>
          </div>
        ) : loadingDetail ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : detail && (
          <div className="flex-1 overflow-y-auto">
            {/* 공지 배너 */}
            {detail.category === "NOTICE" && (
              <div className="bg-linear-to-r from-amber-400 to-orange-300 px-6 py-3 flex items-center gap-2.5">
                <Megaphone className="w-5 h-5 text-white shrink-0" />
                <div>
                  <span className="text-xs font-black text-white/80 uppercase tracking-widest">공지사항</span>
                  <p className="text-sm font-bold text-white leading-tight mt-0.5">{detail.title}</p>
                </div>
                {detail.pinned && <Pin className="w-4 h-4 text-white/70 ml-auto shrink-0" />}
              </div>
            )}

            {/* 게시글 본문 */}
            <div className={cn("border-b border-slate-100 px-6 py-6", detail.category === "NOTICE" ? "bg-amber-50/30" : "bg-white")}>
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="space-y-1.5 flex-1 min-w-0">
                  {detail.category !== "NOTICE" && (
                    <h2 className="text-lg font-bold text-slate-900 leading-tight">{detail.title}</h2>
                  )}
                  <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                    <span className="font-medium text-slate-600">{authorLabel(detail.author, detail.displayMode as DisplayMode)}</span>
                    {detail.displayMode !== "ANONYMOUS" && detail.author.department && <span>{detail.author.department}</span>}
                    <VisibilityBadge visibility={detail.visibility} />
                    <span>{new Date(detail.createdAt).toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "short" })}</span>
                    <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{commentCount}개</span>
                  </div>
                </div>

                {/* 액션 버튼 */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {isPrivileged && !editingPost && (
                    <button
                      onClick={() => handleToggleCategory(detail.id, detail.category)}
                      className={cn(
                        "flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors",
                        detail.category === "NOTICE"
                          ? "text-amber-700 bg-amber-100 hover:bg-amber-200"
                          : "text-slate-500 hover:text-amber-700 hover:bg-amber-50 border border-slate-200"
                      )}>
                      <Megaphone className="w-3.5 h-3.5" />
                      {detail.category === "NOTICE" ? "공지 해제" : "공지로 변경"}
                    </button>
                  )}
                  {isPrivileged && !editingPost && (
                    <button
                      onClick={() => handleTogglePin(detail.id, detail.pinned)}
                      className={cn(
                        "p-1.5 rounded-lg transition-colors",
                        detail.pinned ? "text-amber-500 bg-amber-50 hover:bg-amber-100" : "text-slate-400 hover:text-amber-500 hover:bg-amber-50"
                      )}>
                      {detail.pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                    </button>
                  )}
                  {(detail.author.id === currentUserId || isPrivileged) && !editingPost && (
                    <button
                      onClick={() => startEditPost(detail)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                  )}
                  {(detail.author.id === currentUserId || isPrivileged) && !editingPost && (
                    <button
                      onClick={() => handleDeletePost(detail.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* 본문 — 일반 뷰 또는 인라인 편집 */}
              {editingPost ? (
                <div className="space-y-3 mt-2">
                  <input
                    autoFocus
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    className="w-full border border-indigo-300 rounded-lg px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    placeholder="제목"
                  />
                  <textarea
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                    rows={6}
                    className="w-full border border-indigo-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                    placeholder="내용"
                  />
                  <VisibilitySelector value={editVisibility} onChange={setEditVisibility} compact />
                  {editAttachments.length > 0 && (
                    <div className="border border-slate-200 rounded-xl p-3 space-y-2">
                      <AttachmentList attachments={editAttachments} preview />
                      <div className="flex flex-wrap gap-1">
                        {editAttachments.map((f, i) => (
                          <span key={i} className="flex items-center gap-1 text-[10px] bg-slate-100 px-2 py-0.5 rounded-full text-slate-600">
                            {f.name}
                            <button type="button" onClick={() => setEditAttachments(prev => prev.filter((_, j) => j !== i))}>
                              <X className="w-3 h-3 hover:text-rose-500" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <input ref={editFileRef} type="file" multiple accept="image/*,.pdf,.docx,.xlsx,.pptx,.txt" className="hidden"
                        onChange={e => e.target.files && uploadFiles(e.target.files, setEditAttachments, editAttachments)} />
                      <button type="button" onClick={() => editFileRef.current?.click()} disabled={uploading}
                        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 border border-slate-200 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50">
                        <Paperclip className="w-3.5 h-3.5" /> 파일 추가
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleSavePost} disabled={postSaving || uploading}
                        className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-all">
                        <Check className="w-4 h-4" /> {postSaving ? "저장 중..." : "저장"}
                      </button>
                      <button onClick={() => setEditingPost(false)}
                        className="text-sm text-slate-500 hover:text-slate-800 px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
                        취소
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 mt-2">
                  <div className="bg-slate-50/50 rounded-xl px-4 py-4 border border-slate-100 [&_p]:!text-sm [&_p]:!text-slate-700 [&_li]:!text-sm [&_li]:!text-slate-700 [&_td]:!text-sm [&_td]:!text-slate-700 [&_th]:!text-sm [&_blockquote]:!border-amber-300 [&_blockquote]:!bg-amber-50 [&_blockquote]:!rounded-r-lg [&_blockquote]:!py-2 [&_blockquote]:!not-italic [&_blockquote_p]:!text-amber-800 [&_h2]:!text-sm [&_h2]:!text-slate-800 [&_h3]:!text-sm [&_h3]:!text-slate-700">
                    <MarkdownContent content={detail.content} />
                  </div>
                  {(detail.attachments?.length ?? 0) > 0 && (
                    <AttachmentList attachments={detail.attachments} />
                  )}
                </div>
              )}
            </div>

            {/* 댓글 섹션 */}
            <div className="px-6 py-5 space-y-5">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" /> 댓글 {commentCount > 0 && `(${commentCount})`}
              </h3>

              {/* 댓글 트리 */}
              <div className="space-y-5">
                {(detail.comments ?? []).length === 0 ? (
                  <p className="text-xs text-slate-400 italic">첫 번째 댓글을 남겨보세요.</p>
                ) : (
                  <CommentTree
                    nodes={buildTree(detail.comments!)}
                    postId={detail.id}
                    depth={0}
                    currentUserId={currentUserId}
                    currentUserName={currentUserName}
                    isPrivileged={isPrivileged}
                    onRefresh={() => { loadDetail(detail.id); loadPosts() }}
                  />
                )}
              </div>

              {/* 최상위 댓글 입력폼 */}
              <form onSubmit={handleCommentSubmit} className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-4 flex-wrap">
                  <DisplayModeSelector value={commentDisplayMode} onChange={setCommentDisplayMode} compact />
                  <VisibilitySelector value={commentVisibility} onChange={setCommentVisibility} compact />
                </div>
                <div className="flex gap-2">
                  <div className="w-7 h-7 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-1">
                    {currentUserName.slice(0, 1)}
                  </div>
                  <div className="flex-1 flex gap-2">
                    <div className="flex-1 relative">
                      <textarea
                        ref={commentInputRef}
                        value={commentText}
                        onChange={e => setCommentText(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault()
                            if (commentText.trim()) handleCommentSubmit(e as unknown as React.FormEvent)
                          }
                        }}
                        placeholder="댓글을 입력하세요 (Enter 전송, Shift+Enter 줄바꿈)"
                        rows={2}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent resize-none"
                      />
                      <div className="absolute right-2 bottom-2">
                        <EmojiPicker onSelect={insertEmoji} />
                      </div>
                    </div>
                    <button
                      type="submit" disabled={!commentText.trim() || commentSubmitting}
                      className="self-end px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl disabled:opacity-40 transition-all">
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
