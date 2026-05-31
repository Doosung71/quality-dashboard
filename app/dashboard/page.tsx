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
import {
  FileSearch,
  LayoutDashboard,
  LogOut,
  HelpCircle,
  MessageSquare,
  UserCheck,
  CheckCircle2,
  Clock,
  ArrowLeft
} from "lucide-react"

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
  if (label === "반려됨" || label === "부문장 반려됨") return "bg-rose-50 text-rose-700 border-rose-100"
  if (label === "검토 요청됨") return "bg-amber-50 text-amber-700 border-amber-100 animate-pulse font-bold"
  if (label === "팀장 승인" || label === "최종 승인") return "bg-emerald-50 text-emerald-700 border-emerald-100 font-bold"
  return "bg-slate-50 text-slate-500 border-slate-100"
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
    <main className="min-h-screen bg-slate-50/50 pb-12">
      {/* 프리미엄 헤더바 */}
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur sticky top-0 z-50 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <Link 
            href="/" 
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
            title="전사 품질 대시보드로 돌아가기"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2">
            <FileSearch className="w-5.5 h-5.5 text-indigo-600" />
            <h1 className="font-extrabold text-base text-slate-900 tracking-tight">입찰 검토 보조 시스템</h1>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-bold">
          <Link href="/" className="text-slate-500 hover:text-slate-800 flex items-center gap-1">
            <LayoutDashboard className="w-4 h-4" /> 전사대시보드
          </Link>
          <Link href="/help" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-slate-800 flex items-center gap-1">
            <HelpCircle className="w-4 h-4" /> 도움말
          </Link>
          <Link href="/feedback" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-slate-800 flex items-center gap-1">
            <MessageSquare className="w-4 h-4" /> 피드백
          </Link>
          
          {isAdmin(session.user.email) && (
            <Link href="/admin/users" className="text-slate-600 hover:text-slate-900 flex items-center gap-1 bg-slate-100 px-2.5 py-1.5 rounded-lg border">
              <UserCheck className="w-3.5 h-3.5" />
              사용자 관리
              {pendingUserCount > 0 && (
                <span className="inline-flex items-center justify-center rounded-full bg-rose-500 text-white text-[10px] font-extrabold w-4.5 h-4.5 animate-pulse">
                  {pendingUserCount}
                </span>
              )}
            </Link>
          )}

          <div className="h-4 w-px bg-slate-200" />

          <span className="text-slate-600 font-semibold flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <Link href="/profile" className="hover:underline">
              {displayName({ name: session.user.name!, nickname: session.user.nickname })}
            </Link>
            <span className="text-[10px] text-slate-400 font-extrabold bg-slate-100 px-1.5 py-0.5 rounded border">{roleLabel[session.user.role] ?? session.user.role}</span>
          </span>

          <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }) }}>
            <Button variant="ghost" size="sm" type="submit" className="text-slate-500 hover:text-rose-600 flex items-center gap-1 font-bold">
              <LogOut className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </header>

      {/* 메인 레이아웃 본문 */}
      <div className="max-w-5xl mx-auto p-6 md:p-8 space-y-8">
        
        {/* 결재 대기 패널 (팀장 / 부문장 맞춤형) */}
        {session.user.role === "DIRECTOR" && (
          <section className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <h2 className="text-xs font-extrabold text-slate-400 tracking-wider uppercase flex items-center gap-1.5">
              <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500" /> 최종 승인 대기 목록 ({pendingFinalReviews.length}건)
            </h2>
            {pendingFinalReviews.length === 0 ? (
              <p className="text-xs text-slate-400 italic">최종 결재 대기 중인 항목이 없습니다.</p>
            ) : (
              <ul className="space-y-2 text-xs">
                {pendingFinalReviews.map((a) => (
                  <li key={a.id} className="bg-emerald-50/50 border border-emerald-100 rounded-xl px-4 py-3 flex items-center justify-between shadow-inner">
                    <p className="font-bold text-slate-900">{a.tender.title}</p>
                    <Link href={`/tender/${a.tender.id}`}>
                      <Button size="sm" className="bg-slate-950 hover:bg-slate-800 text-white font-bold rounded-lg shadow-sm">최종 결재</Button>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {session.user.role === "TEAM_LEAD" && (
          <section className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <h2 className="text-xs font-extrabold text-slate-400 tracking-wider uppercase flex items-center gap-1.5">
              <Clock className="w-4.5 h-4.5 text-amber-500" /> 부서 검토 대기 목록 ({pendingReviews.length}건)
            </h2>
            {pendingReviews.length === 0 ? (
              <p className="text-xs text-slate-400 italic">검토 상신 대기 중인 항목이 없습니다.</p>
            ) : (
              <ul className="space-y-2 text-xs">
                {pendingReviews.map((a) => (
                  <li key={a.id} className="bg-amber-50/50 border border-amber-100 rounded-xl px-4 py-3 flex items-center justify-between shadow-inner">
                    <p className="font-bold text-slate-900">{a.tender.title}</p>
                    <Link href={`/tender/${a.tender.id}`}>
                      <Button size="sm" className="bg-slate-950 hover:bg-slate-800 text-white font-bold rounded-lg shadow-sm">1차 검토</Button>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* 2단 그리드 형태로 업로드 폼(실무자)과 리스트 배치 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* 좌측: 실무자용 업로드 폼 */}
          {session.user.role === "PRACTITIONER" && (
            <div className="lg:col-span-1 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
              <UploadForm />
            </div>
          )}

          {/* 우측/전체: 입찰 목록 */}
          <div className={session.user.role === "PRACTITIONER" ? "lg:col-span-2 space-y-6" : "lg:col-span-3 space-y-6"}>
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
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
          </div>

        </div>

      </div>
    </main>
  )
}
