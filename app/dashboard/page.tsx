import { signOut } from "@/auth"
import { prisma } from "@/lib/prisma"
import { isAdmin } from "@/lib/admin"
import { requireActivePageSession } from "@/lib/session-guard"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { displayName } from "@/lib/display-name"
import UploadForm from "./UploadForm"
import TenderList from "./TenderList"
import { type TenderRow } from "./TenderList"

const roleLabel: Record<string, string> = {
  PRACTITIONER: "실무자",
  TEAM_LEAD: "팀장",
  DIRECTOR: "부문장",
}

function analysisStatusLabel(status: string, submittedAt: Date | null, lastAction?: string): string {
  if (status === "DRAFT" && submittedAt) return "검토 요청됨"
  if (status === "DRAFT" && lastAction === "REVIEW_REJECT") return "반려됨"
  if (status === "DRAFT" && lastAction === "FINAL_REJECT") return "부문장 반려됨"
  if (status === "DRAFT") return "작성 중"
  if (status === "REVIEWED") return "팀장 승인"
  if (status === "APPROVED") return "최종 승인"
  return status
}

function statusBadgeClass(label: string): string {
  if (label === "반려됨" || label === "부문장 반려됨") return "bg-red-100 text-red-600"
  if (label === "검토 요청됨") return "bg-yellow-100 text-yellow-700"
  if (label === "팀장 승인" || label === "최종 승인") return "bg-green-100 text-green-700"
  return "bg-zinc-100 text-zinc-500"
}

export default async function DashboardPage() {
  const session = await requireActivePageSession()

  const tenders = await prisma.tender.findMany({
    where: session.user.role === "PRACTITIONER" ? { createdById: session.user.id } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      documents: { take: 1 },
      analyses: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          history: {
            orderBy: { createdAt: "asc" },
            include: { user: { select: { name: true, nickname: true } } },
          },
          comments: {
            where: { parentId: null },
            orderBy: { createdAt: "asc" },
            include: {
              author: { select: { name: true, nickname: true } },
              replies: {
                orderBy: { createdAt: "asc" },
                include: { author: { select: { name: true } } },
              },
            },
          },
          requirements: { select: { isRisk: true, comply: true } },
        },
      },
    },
  })

  const pendingUserCount = isAdmin(session.user.email)
    ? await prisma.user.count({ where: { status: "PENDING" } })
    : 0

  const pendingReviews =
    session.user.role === "TEAM_LEAD"
      ? await prisma.analysis.findMany({
          where: { status: "DRAFT", submittedAt: { not: null } },
          orderBy: { submittedAt: "asc" },
          include: { tender: { select: { id: true, title: true } } },
        })
      : []

  const pendingFinalReviews =
    session.user.role === "DIRECTOR"
      ? await prisma.analysis.findMany({
          where: { status: "REVIEWED" },
          orderBy: { updatedAt: "asc" },
          include: { tender: { select: { id: true, title: true } } },
        })
      : []

  return (
    <main className="min-h-screen bg-zinc-50">
      <header className="border-b bg-white px-6 py-4 flex items-center justify-between">
        <h1 className="font-semibold text-base">입찰 검토 보조 시스템</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-zinc-600">
            <Link href="/profile" className="hover:underline">
              {displayName({ name: session.user.name!, nickname: session.user.nickname })}
            </Link>
            {" · "}{roleLabel[session.user.role] ?? session.user.role}
          </span>
          <Link href="/help" className="text-sm text-zinc-500 hover:text-zinc-800">도움말</Link>
          <Link href="/feedback" className="text-sm text-zinc-500 hover:text-zinc-800">피드백</Link>
          {isAdmin(session.user.email) && (
            <Link href="/admin/users" className="text-sm text-zinc-600 hover:text-zinc-900 flex items-center gap-1">
              사용자 관리
              {pendingUserCount > 0 && (
                <span className="inline-flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-semibold w-5 h-5">
                  {pendingUserCount}
                </span>
              )}
            </Link>
          )}
          <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }) }}>
            <Button variant="outline" size="sm" type="submit">로그아웃</Button>
          </form>
        </div>
      </header>

      <div className="max-w-3xl mx-auto p-8 space-y-8">
        {session.user.role === "PRACTITIONER" && <UploadForm />}

        {session.user.role === "DIRECTOR" && (
          <section>
            <h2 className="text-sm font-semibold text-zinc-700 mb-3">
              최종 승인 대기 ({pendingFinalReviews.length}건)
            </h2>
            {pendingFinalReviews.length === 0 ? (
              <p className="text-sm text-zinc-400">최종 승인 대기 중인 항목이 없습니다.</p>
            ) : (
              <ul className="space-y-2">
                {pendingFinalReviews.map((a) => (
                  <li key={a.id} className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center justify-between">
                    <p className="text-sm font-medium">{a.tender.title}</p>
                    <Link href={`/tender/${a.tender.id}`}><Button size="sm">검토하기</Button></Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {session.user.role === "TEAM_LEAD" && (
          <section>
            <h2 className="text-sm font-semibold text-zinc-700 mb-3">
              검토 대기 ({pendingReviews.length}건)
            </h2>
            {pendingReviews.length === 0 ? (
              <p className="text-sm text-zinc-400">검토 대기 중인 항목이 없습니다.</p>
            ) : (
              <ul className="space-y-2">
                {pendingReviews.map((a) => (
                  <li key={a.id} className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 flex items-center justify-between">
                    <p className="text-sm font-medium">{a.tender.title}</p>
                    <Link href={`/tender/${a.tender.id}`}><Button size="sm">검토하기</Button></Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <TenderList tenders={tenders.map((t) => {
          const analysis = t.analyses[0]
          const lastAction = analysis?.history.at(-1)?.action
          const label = analysis
            ? analysisStatusLabel(analysis.status, analysis.submittedAt, lastAction)
            : ""
          const isApproved = analysis?.status === "REVIEWED" || analysis?.status === "APPROVED"
          const canEdit = session.user.role === "PRACTITIONER"

          const threadHistory = (analysis?.history ?? [])
            .filter((h) => h.reason)
            .map((h) => ({
              id: h.id,
              action: h.action,
              reason: h.reason!,
              userName: displayName(h.user),
              createdAt: h.createdAt.toISOString(),
            }))

          const threadComments = (analysis?.comments ?? []).map((c) => ({
            id: c.id,
            content: c.content,
            userName: displayName(c.author),
            createdAt: c.createdAt.toISOString(),
            replies: c.replies.map((r) => ({
              id: r.id,
              content: r.content,
              userName: displayName(r.author),
              createdAt: r.createdAt.toISOString(),
            })),
          }))

          const reqs = analysis?.requirements ?? []
          const riskCount = reqs.filter((r) => r.isRisk).length
          const nonComplyCount = reqs.filter((r) => r.comply === "NON_COMPLY").length

          return {
            id: t.id,
            title: t.title,
            createdAt: new Date(t.createdAt).toLocaleDateString("ko-KR"),
            statusLabel: label,
            statusClass: statusBadgeClass(label),
            canEdit,
            canDelete: canEdit && !isApproved,
            analysisId: analysis?.id,
            threadHistory,
            threadComments,
            riskCount: riskCount > 0 ? riskCount : undefined,
            nonComplyCount: nonComplyCount > 0 ? nonComplyCount : undefined,
          } satisfies TenderRow
        })} />
      </div>
    </main>
  )
}
