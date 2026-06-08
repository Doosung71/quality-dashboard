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

  const currentUserName = session.user.nickname || session.user.name || ""

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 페이지 헤더 */}
      <div className="bg-white border-b border-slate-100 px-6 py-5">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-slate-900">피드백 게시판</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                불편한 점, 오류, 개선 요청을 남겨주세요. 모든 의견을 다음 업데이트에 반영합니다.
              </p>
            </div>
            <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
              💬 피드백
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <FeedbackBoard
          initial={feedbacks}
          currentUserId={session.user.id}
          currentUserRole={session.user.role}
          currentUserName={currentUserName}
        />
      </div>
    </div>
  )
}
