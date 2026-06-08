import Link from "next/link"
import { requireActivePageSession } from "@/lib/session-guard"
import { prisma } from "@/lib/prisma"
import FeedbackBoard from "./FeedbackBoard"

export default async function FeedbackPage() {
  const session = await requireActivePageSession()

  const raw = await prisma.feedback.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { id: true, name: true, nickname: true, role: true } },
      replies: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { id: true, name: true, nickname: true, role: true } } },
      },
    },
  })

  const feedbacks = raw.map((f) => ({
    ...f,
    createdAt: f.createdAt.toISOString(),
    imageUrls: f.imageUrls ?? null,
    replies: f.replies.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
  }))

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="bg-white border-b px-6 py-3 flex items-center justify-between">
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-800">← 대시보드</Link>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-600">
          피드백 게시판
        </span>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-zinc-900">피드백 게시판</h1>
          <p className="text-sm text-zinc-500 mt-1 leading-relaxed">
            시스템을 사용하면서 불편한 사항, 개선 요청, 오류 등을 자유롭게 남겨주세요.<br />
            모든 의견을 검토하여 다음 버전에 반영합니다.
          </p>
        </div>

        <FeedbackBoard
          initial={feedbacks}
          currentUserId={session.user.id}
          currentUserRole={session.user.role}
        />
      </div>
    </div>
  )
}
