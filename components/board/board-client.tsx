"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Pin, PinOff, Plus, X, Trash2, MessageSquare,
  ChevronRight, Megaphone, Send, CornerDownRight, Pencil, Check,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { Role } from "@/lib/generated/prisma/client"

// ─── 타입 ──────────────────────────────────────────────────

type Author = { id: string; name: string; nickname: string | null; department: string | null }

type Comment = {
  id: string; content: string; createdAt: string
  author: Author; parentId: string | null
  replies: Comment[]
}

type Post = {
  id: string; title: string; content: string
  category: "NOTICE" | "GENERAL"; pinned: boolean
  createdAt: string; author: Author
  _count?: { comments: number }
  comments?: Comment[]
}

// ─── 유틸 ──────────────────────────────────────────────────

function authorLabel(a: Author) { return a.nickname ?? a.name }

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60)   return "방금 전"
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
  return new Date(iso).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })
}

// ─── 댓글 단일 컴포넌트 ────────────────────────────────────

function CommentItem({
  comment, postId, currentUserId, isPrivileged,
  onDelete, onReply, onEdited,
}: {
  comment: Comment; postId: string; currentUserId: string; isPrivileged: boolean
  onDelete: (commentId: string) => void
  onReply: (parentId: string, parentAuthor: string) => void
  onEdited: () => void
}) {
  const canAct = (authorId: string) => authorId === currentUserId || isPrivileged

  // 댓글 인라인 편집 상태
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState("")

  function startEdit(id: string, content: string) {
    setEditingId(id); setEditText(content)
  }
  function cancelEdit() { setEditingId(null); setEditText("") }

  async function submitEdit(commentId: string) {
    if (!editText.trim()) return
    await fetch(`/api/board/${postId}/comments/${commentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: editText }),
    })
    cancelEdit(); onEdited()
  }

  function renderActions(id: string, authorId: string, content: string, isReply = false) {
    if (editingId === id) return null
    return (
      <div className="flex items-center gap-3 mt-1">
        {!isReply && (
          <button onClick={() => onReply(id, authorLabel(comment.author))}
            className="text-[10px] text-slate-400 hover:text-indigo-600 flex items-center gap-1 transition-colors">
            <CornerDownRight className="w-3 h-3" /> 답글
          </button>
        )}
        {canAct(authorId) && (
          <>
            <button onClick={() => startEdit(id, content)}
              className="text-[10px] text-slate-400 hover:text-indigo-500 flex items-center gap-1 transition-colors opacity-0 group-hover:opacity-100">
              <Pencil className="w-3 h-3" /> 수정
            </button>
            <button onClick={() => onDelete(id)}
              className="text-[10px] text-slate-400 hover:text-rose-500 flex items-center gap-1 transition-colors opacity-0 group-hover:opacity-100">
              <Trash2 className="w-3 h-3" /> 삭제
            </button>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* 댓글 본체 */}
      <div className="group flex gap-3">
        <div className="w-7 h-7 rounded-full bg-slate-700 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
          {authorLabel(comment.author).slice(0, 1)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-900">{authorLabel(comment.author)}</span>
            {comment.author.department && <span className="text-[10px] text-slate-400">{comment.author.department}</span>}
            <span className="text-[10px] text-slate-400">{timeAgo(comment.createdAt)}</span>
          </div>

          {editingId === comment.id ? (
            <div className="mt-1 space-y-1.5">
              <textarea
                autoFocus
                value={editText}
                onChange={e => setEditText(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitEdit(comment.id) } if (e.key === "Escape") cancelEdit() }}
                rows={3}
                className="w-full border border-indigo-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
              />
              <div className="flex gap-2">
                <button onClick={() => submitEdit(comment.id)}
                  className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                  <Check className="w-3 h-3" /> 저장
                </button>
                <button onClick={cancelEdit}
                  className="text-xs text-slate-400 hover:text-slate-600 px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
                  취소
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-700 mt-0.5 leading-relaxed whitespace-pre-wrap">{comment.content}</p>
          )}
          {renderActions(comment.id, comment.author.id, comment.content)}
        </div>
      </div>

      {/* 대댓글 */}
      {comment.replies.length > 0 && (
        <div className="ml-10 space-y-2 border-l-2 border-slate-100 pl-3">
          {comment.replies.map(reply => (
            <div key={reply.id} className="group flex gap-2.5">
              <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                {authorLabel(reply.author).slice(0, 1)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-900">{authorLabel(reply.author)}</span>
                  {reply.author.department && <span className="text-[10px] text-slate-400">{reply.author.department}</span>}
                  <span className="text-[10px] text-slate-400">{timeAgo(reply.createdAt)}</span>
                </div>

                {editingId === reply.id ? (
                  <div className="mt-1 space-y-1.5">
                    <textarea
                      autoFocus
                      value={editText}
                      onChange={e => setEditText(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitEdit(reply.id) } if (e.key === "Escape") cancelEdit() }}
                      rows={2}
                      className="w-full border border-indigo-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                    />
                    <div className="flex gap-2">
                      <button onClick={() => submitEdit(reply.id)}
                        className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                        <Check className="w-3 h-3" /> 저장
                      </button>
                      <button onClick={cancelEdit}
                        className="text-xs text-slate-400 hover:text-slate-600 px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
                        취소
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-700 mt-0.5 leading-relaxed whitespace-pre-wrap">{reply.content}</p>
                )}
                {renderActions(reply.id, reply.author.id, reply.content, true)}
              </div>
            </div>
          ))}
        </div>
      )}
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

  // 새 글 작성 폼
  const [showNewPost, setShowNewPost] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newContent, setNewContent] = useState("")
  const [newCategory, setNewCategory] = useState<"GENERAL" | "NOTICE">("GENERAL")
  const [newPinned, setNewPinned] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // 게시글 인라인 편집 상태
  const [editingPost, setEditingPost] = useState(false)
  const [editTitle, setEditTitle] = useState("")
  const [editContent, setEditContent] = useState("")
  const [postSaving, setPostSaving] = useState(false)

  // 댓글 입력
  const [commentText, setCommentText] = useState("")
  const [replyTo, setReplyTo] = useState<{ parentId: string; authorName: string } | null>(null)
  const [commentSubmitting, setCommentSubmitting] = useState(false)

  // 목록 로드
  const loadPosts = useCallback(async () => {
    const res = await fetch("/api/board")
    if (res.ok) setPosts(await res.json())
  }, [])

  useEffect(() => { loadPosts() }, [loadPosts])

  // 상세 로드
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

  // 새 글 제출
  async function handlePostSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim() || !newContent.trim()) return
    setSubmitting(true)
    const res = await fetch("/api/board", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle, content: newContent, category: newCategory, pinned: newPinned }),
    })
    if (res.ok) {
      const created = await res.json() as Post
      setNewTitle(""); setNewContent(""); setNewCategory("GENERAL"); setNewPinned(false)
      setShowNewPost(false)
      await loadPosts()
      setSelectedId(created.id)
    }
    setSubmitting(false)
  }

  // 게시글 편집 시작
  function startEditPost(post: Post) {
    setEditTitle(post.title); setEditContent(post.content); setEditingPost(true)
  }
  function cancelEditPost() { setEditingPost(false) }

  // 게시글 수정 저장
  async function handleSavePost() {
    if (!selectedId || !editTitle.trim() || !editContent.trim()) return
    setPostSaving(true)
    await fetch(`/api/board/${selectedId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: editTitle.trim(), content: editContent.trim() }),
    })
    setEditingPost(false)
    loadDetail(selectedId)
    loadPosts()
    setPostSaving(false)
  }

  // 게시글 삭제
  async function handleDeletePost(id: string) {
    if (!confirm("게시글을 삭제하시겠습니까?")) return
    await fetch(`/api/board/${id}`, { method: "DELETE" })
    setSelectedId(null)
    loadPosts()
  }

  // 핀 토글
  async function handleTogglePin(id: string, pinned: boolean) {
    await fetch(`/api/board/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned: !pinned }),
    })
    loadPosts()
    if (selectedId === id) loadDetail(id)
  }

  // 댓글 제출
  async function handleCommentSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!commentText.trim() || !selectedId) return
    setCommentSubmitting(true)
    await fetch(`/api/board/${selectedId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: commentText, parentId: replyTo?.parentId ?? null }),
    })
    setCommentText(""); setReplyTo(null)
    loadDetail(selectedId)
    loadPosts()
    setCommentSubmitting(false)
  }

  // 댓글 삭제
  async function handleDeleteComment(commentId: string) {
    if (!selectedId) return
    await fetch(`/api/board/${selectedId}/comments/${commentId}`, { method: "DELETE" })
    loadDetail(selectedId)
    loadPosts()
  }

  const commentCount = detail?.comments?.reduce((acc, c) => acc + 1 + (c.replies?.length ?? 0), 0) ?? 0

  return (
    <div className="flex gap-0 h-[calc(100vh-56px)] overflow-hidden">

      {/* ── 좌측: 게시글 목록 ── */}
      <div className="w-72 shrink-0 bg-white border-r border-slate-100 flex flex-col">
        {/* 헤더 */}
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800">품질부문 게시판</h2>
          <button
            onClick={() => setShowNewPost(v => !v)}
            className={cn(
              "flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-all",
              showNewPost
                ? "bg-slate-100 text-slate-600"
                : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
            )}
          >
            {showNewPost ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {showNewPost ? "취소" : "새 글"}
          </button>
        </div>

        {/* 글 목록 */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
          {posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <MessageSquare className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-xs">아직 게시글이 없습니다.</p>
            </div>
          ) : posts.map(post => {
            const isActive = post.id === selectedId
            return (
              <button
                key={post.id}
                onClick={() => setSelectedId(post.id)}
                className={cn(
                  "w-full text-left px-4 py-3 transition-all",
                  isActive ? "bg-indigo-50 border-l-2 border-indigo-500" : "hover:bg-slate-50 border-l-2 border-transparent"
                )}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  {post.category === "NOTICE" && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-600">공지</span>
                  )}
                  {post.pinned && <Pin className="w-3 h-3 text-amber-500 shrink-0" />}
                  <span className="text-xs font-semibold text-slate-800 line-clamp-1 flex-1">{post.title}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>{authorLabel(post.author)}</span>
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
          })}
        </div>
      </div>

      {/* ── 우측: 상세 / 새 글 작성 ── */}
      <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">

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
                      className="rounded border-slate-300 text-rose-500 focus:ring-rose-400"
                    />
                    <Megaphone className="w-3.5 h-3.5 text-rose-500" /> 공지
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
              <textarea
                placeholder="내용을 입력하세요..."
                value={newContent}
                onChange={e => setNewContent(e.target.value)}
                required
                rows={4}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent resize-none"
              />
              <div className="flex justify-end">
                <button
                  type="submit" disabled={submitting}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5 disabled:opacity-50 transition-all shadow-sm"
                >
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
            {/* 게시글 본문 */}
            <div className="bg-white border-b border-slate-100 px-6 py-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {detail.category === "NOTICE" && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-600 flex items-center gap-1">
                        <Megaphone className="w-3 h-3" /> 공지
                      </span>
                    )}
                    {detail.pinned && <Pin className="w-3.5 h-3.5 text-amber-500" />}
                    <h2 className="text-lg font-bold text-slate-900 leading-tight">{detail.title}</h2>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span className="font-medium text-slate-600">{authorLabel(detail.author)}</span>
                    {detail.author.department && <span>{detail.author.department}</span>}
                    <span>{new Date(detail.createdAt).toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "short" })}</span>
                    <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{commentCount}개</span>
                  </div>
                </div>

                {/* 액션 버튼 */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {isPrivileged && !editingPost && (
                    <button
                      onClick={() => handleTogglePin(detail.id, detail.pinned)}
                      className={cn(
                        "p-1.5 rounded-lg transition-colors",
                        detail.pinned ? "text-amber-500 bg-amber-50 hover:bg-amber-100" : "text-slate-400 hover:text-amber-500 hover:bg-amber-50"
                      )}
                      title={detail.pinned ? "고정 해제" : "상단 고정"}
                    >
                      {detail.pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                    </button>
                  )}
                  {(detail.author.id === currentUserId || isPrivileged) && !editingPost && (
                    <button
                      onClick={() => startEditPost(detail)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 transition-colors"
                      title="게시글 수정"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  )}
                  {(detail.author.id === currentUserId || isPrivileged) && !editingPost && (
                    <button
                      onClick={() => handleDeletePost(detail.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                      title="게시글 삭제"
                    >
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
                  <div className="flex gap-2">
                    <button onClick={handleSavePost} disabled={postSaving}
                      className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-all">
                      <Check className="w-4 h-4" /> {postSaving ? "저장 중..." : "저장"}
                    </button>
                    <button onClick={cancelEditPost}
                      className="text-sm text-slate-500 hover:text-slate-800 px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap bg-slate-50/50 rounded-xl px-4 py-4 border border-slate-100 mt-2">
                  {detail.content}
                </div>
              )}
            </div>

            {/* 댓글 섹션 */}
            <div className="px-6 py-5 space-y-5">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" /> 댓글 {commentCount > 0 && `(${commentCount})`}
              </h3>

              {/* 댓글 목록 */}
              <div className="space-y-5">
                {(detail.comments ?? []).length === 0 ? (
                  <p className="text-xs text-slate-400 italic">첫 번째 댓글을 남겨보세요.</p>
                ) : detail.comments!.map(comment => (
                  <CommentItem
                    key={comment.id}
                    comment={comment}
                    postId={detail.id}
                    currentUserId={currentUserId}
                    isPrivileged={isPrivileged}
                    onDelete={handleDeleteComment}
                    onReply={(parentId, authorName) => {
                      setReplyTo({ parentId, authorName })
                      setCommentText(`@${authorName} `)
                    }}
                    onEdited={() => loadDetail(detail.id)}
                  />
                ))}
              </div>

              {/* 댓글 입력 */}
              <form onSubmit={handleCommentSubmit} className="space-y-2 pt-2 border-t border-slate-100">
                {replyTo && (
                  <div className="flex items-center gap-2 bg-indigo-50 px-3 py-1.5 rounded-lg text-xs text-indigo-700">
                    <CornerDownRight className="w-3.5 h-3.5" />
                    <span>{replyTo.authorName}님에게 답글 작성 중</span>
                    <button type="button" onClick={() => { setReplyTo(null); setCommentText("") }}
                      className="ml-auto text-indigo-400 hover:text-indigo-700">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                <div className="flex gap-2">
                  <div className="w-7 h-7 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-1">
                    {currentUserName.slice(0, 1)}
                  </div>
                  <div className="flex-1 flex gap-2">
                    <textarea
                      value={commentText}
                      onChange={e => setCommentText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault()
                          if (commentText.trim()) handleCommentSubmit(e as unknown as React.FormEvent)
                        }
                      }}
                      placeholder={replyTo ? `@${replyTo.authorName}에게 답글...` : "댓글을 입력하세요 (Enter 전송, Shift+Enter 줄바꿈)"}
                      rows={2}
                      className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent resize-none"
                    />
                    <button
                      type="submit" disabled={!commentText.trim() || commentSubmitting}
                      className="self-end px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl disabled:opacity-40 transition-all"
                    >
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
