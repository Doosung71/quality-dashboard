"use client"

import { useState, useTransition } from "react"

type Reply = {
  id: string
  authorName: string
  content: string
  createdAt: string
}

type CommentItem = {
  id: string
  authorName: string
  content: string
  createdAt: string
  replies: Reply[]
}

type Props = {
  analysisId: string
  initialComments: CommentItem[]
}

export default function CommentSection({ analysisId, initialComments }: Props) {
  const [comments, setComments] = useState<CommentItem[]>(initialComments)
  const [newContent, setNewContent] = useState("")
  const [replyTarget, setReplyTarget] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  async function postComment(content: string, parentId: string | null) {
    const res = await fetch(`/api/analysis/${analysisId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, parentId }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error ?? "댓글 작성 실패")
    }
    return res.json()
  }

  function handleSubmitRoot(e: React.FormEvent) {
    e.preventDefault()
    if (!newContent.trim()) return
    setError(null)
    startTransition(async () => {
      try {
        const data = await postComment(newContent.trim(), null)
        const c = data.comment
        setComments((prev) => [
          ...prev,
          {
            id: c.id,
            authorName: c.author.name,
            content: c.content,
            createdAt: c.createdAt,
            replies: [],
          },
        ])
        setNewContent("")
      } catch (err) {
        setError(err instanceof Error ? err.message : "오류가 발생했습니다.")
      }
    })
  }

  function handleSubmitReply(e: React.FormEvent, parentId: string) {
    e.preventDefault()
    if (!replyContent.trim()) return
    setError(null)
    startTransition(async () => {
      try {
        const data = await postComment(replyContent.trim(), parentId)
        const c = data.comment
        setComments((prev) =>
          prev.map((cm) =>
            cm.id === parentId
              ? {
                  ...cm,
                  replies: [
                    ...cm.replies,
                    {
                      id: c.id,
                      authorName: c.author.name,
                      content: c.content,
                      createdAt: c.createdAt,
                    },
                  ],
                }
              : cm
          )
        )
        setReplyContent("")
        setReplyTarget(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : "오류가 발생했습니다.")
      }
    })
  }

  return (
    <section className="bg-white border rounded-lg p-4">
      <h2 className="text-sm font-semibold text-zinc-700 mb-4">
        코멘트 ({comments.reduce((n, c) => n + 1 + c.replies.length, 0)})
      </h2>

      {comments.length === 0 && (
        <p className="text-sm text-zinc-400 mb-4">등록된 코멘트가 없습니다.</p>
      )}

      <ul className="space-y-4 mb-4">
        {comments.map((cm) => (
          <li key={cm.id}>
            <div className="flex gap-3">
              <div className="w-1 rounded bg-zinc-200 self-stretch shrink-0" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-zinc-700">{cm.authorName}</span>
                  <span className="text-xs text-zinc-400">
                    {new Date(cm.createdAt).toLocaleString("ko-KR")}
                  </span>
                </div>
                <p className="text-sm text-zinc-800 mt-0.5 whitespace-pre-wrap">{cm.content}</p>
                <button
                  onClick={() =>
                    setReplyTarget(replyTarget === cm.id ? null : cm.id)
                  }
                  className="text-xs text-zinc-400 hover:text-zinc-600 mt-1"
                >
                  {replyTarget === cm.id ? "취소" : "답글"}
                </button>

                {/* 답글 목록 */}
                {cm.replies.length > 0 && (
                  <ul className="mt-2 space-y-2 pl-3 border-l border-zinc-100">
                    {cm.replies.map((r) => (
                      <li key={r.id}>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-zinc-700">{r.authorName}</span>
                          <span className="text-xs text-zinc-400">
                            {new Date(r.createdAt).toLocaleString("ko-KR")}
                          </span>
                        </div>
                        <p className="text-sm text-zinc-800 mt-0.5 whitespace-pre-wrap">{r.content}</p>
                      </li>
                    ))}
                  </ul>
                )}

                {/* 답글 입력 */}
                {replyTarget === cm.id && (
                  <form
                    onSubmit={(e) => handleSubmitReply(e, cm.id)}
                    className="mt-2 flex gap-2"
                  >
                    <input
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder="답글 입력..."
                      className="flex-1 text-sm border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                      disabled={isPending}
                    />
                    <button
                      type="submit"
                      disabled={isPending || !replyContent.trim()}
                      className="text-xs px-3 py-1 bg-zinc-800 text-white rounded disabled:opacity-40"
                    >
                      등록
                    </button>
                  </form>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>

      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}

      {/* 새 코멘트 입력 */}
      <form onSubmit={handleSubmitRoot} className="flex gap-2">
        <textarea
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          placeholder="코멘트를 입력하세요..."
          rows={2}
          className="flex-1 text-sm border rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-zinc-400 resize-none"
          disabled={isPending}
        />
        <button
          type="submit"
          disabled={isPending || !newContent.trim()}
          className="text-sm px-4 py-2 bg-zinc-800 text-white rounded self-end disabled:opacity-40"
        >
          등록
        </button>
      </form>
    </section>
  )
}
