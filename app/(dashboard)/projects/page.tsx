import { requireActivePageSession, TEST_MODE } from "@/lib/session-guard"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import {
  FileSearch, CheckCircle2, Clock, FolderOpen,
  TrendingUp, ChevronRight, AlertCircle,
} from "lucide-react"

function statusBadge(status: string, submittedAt: Date | null): { label: string; cls: string } {
  if (status === "APPROVED") return { label: "수주 완료", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" }
  if (status === "REVIEWED") return { label: "팀장 승인", cls: "bg-blue-50 text-blue-700 border-blue-200" }
  if (submittedAt)           return { label: "검토 요청", cls: "bg-amber-50 text-amber-700 border-amber-200" }
  return                            { label: "작성 중",   cls: "bg-slate-50 text-slate-500 border-slate-200" }
}

export default async function ProjectsPage() {
  const session = await requireActivePageSession()

  const tenders = await prisma.tender.findMany({
    where: !TEST_MODE && session.user.role === "PRACTITIONER"
      ? { createdById: session.user.id }
      : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { name: true, nickname: true } },
      analyses: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          requirements: { select: { isRisk: true } },
        },
      },
    },
  })

  const reviewing = tenders.filter(t => {
    const a = t.analyses[0]
    return !a || a.status === "DRAFT" || a.status === "REVIEWED"
  })
  const awarded = tenders.filter(t => t.analyses[0]?.status === "APPROVED")

  return (
    <div className="flex flex-col gap-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">프로젝트 관리</h1>
        <p className="text-slate-500 text-sm mt-1">
          입찰 검토 중인 프로젝트와 수주 후 관리 중인 프로젝트를 한눈에 확인합니다.
        </p>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <p className="text-xs text-slate-500">입찰 검토 중</p>
            <p className="text-2xl font-bold text-slate-900">{reviewing.length}<span className="text-sm font-normal text-slate-400 ml-1">건</span></p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <p className="text-xs text-slate-500">수주 완료</p>
            <p className="text-2xl font-bold text-slate-900">{awarded.length}<span className="text-sm font-normal text-slate-400 ml-1">건</span></p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
            <TrendingUp className="w-4 h-4 text-slate-500" />
          </div>
          <div>
            <p className="text-xs text-slate-500">전체 프로젝트</p>
            <p className="text-2xl font-bold text-slate-900">{tenders.length}<span className="text-sm font-normal text-slate-400 ml-1">건</span></p>
          </div>
        </div>
      </div>

      {/* 두 섹션 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 입찰 검토 현황 */}
        <section className="bg-white rounded-xl border border-slate-200 flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSearch className="w-4 h-4 text-indigo-500" />
              <h2 className="text-sm font-semibold text-slate-800">입찰 검토 현황</h2>
              <span className="text-xs text-slate-400 font-normal">{reviewing.length}건</span>
            </div>
            <Link href="/dashboard" className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 font-medium">
              전체 보기 <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="flex-1 divide-y divide-slate-50">
            {reviewing.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-10">검토 중인 입찰 프로젝트가 없습니다.</p>
            ) : (
              reviewing.slice(0, 8).map(t => {
                const a = t.analyses[0]
                const riskCount = a?.requirements.filter(r => r.isRisk).length ?? 0
                const badge = statusBadge(a?.status ?? "DRAFT", a?.submittedAt ?? null)
                return (
                  <Link key={t.id} href="/dashboard"
                    className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors group">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate group-hover:text-indigo-700">{t.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {new Date(t.createdAt).toLocaleDateString("ko-KR")}
                        {riskCount > 0 && (
                          <span className="ml-2 inline-flex items-center gap-0.5 text-rose-500">
                            <AlertCircle className="w-3 h-3" /> 리스크 {riskCount}건
                          </span>
                        )}
                      </p>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badge.cls} shrink-0`}>
                      {badge.label}
                    </span>
                  </Link>
                )
              })
            )}
            {reviewing.length > 8 && (
              <Link href="/dashboard" className="block text-center text-xs text-slate-400 hover:text-indigo-600 py-3">
                +{reviewing.length - 8}건 더 보기
              </Link>
            )}
          </div>
        </section>

        {/* 수주 프로젝트 */}
        <section className="bg-white rounded-xl border border-slate-200 flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-emerald-500" />
            <h2 className="text-sm font-semibold text-slate-800">수주 프로젝트</h2>
            <span className="text-xs text-slate-400 font-normal">{awarded.length}건</span>
          </div>
          <div className="flex-1 divide-y divide-slate-50">
            {awarded.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
                <CheckCircle2 className="w-8 h-8 text-slate-200" />
                <p className="text-xs text-slate-400 italic">최종 승인된 수주 프로젝트가 없습니다.</p>
                <p className="text-[11px] text-slate-300">입찰 검토 최종 승인 시 이 목록에 표시됩니다.</p>
              </div>
            ) : (
              awarded.slice(0, 8).map(t => {
                const a = t.analyses[0]
                const approvedAt = a?.updatedAt
                return (
                  <Link key={t.id} href="/dashboard"
                    className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors group">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate group-hover:text-emerald-700">{t.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        수주 확정: {approvedAt ? new Date(approvedAt).toLocaleDateString("ko-KR") : "-"}
                      </p>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200 shrink-0">
                      수주 완료
                    </span>
                  </Link>
                )
              })
            )}
            {awarded.length > 8 && (
              <Link href="/dashboard" className="block text-center text-xs text-slate-400 hover:text-emerald-600 py-3">
                +{awarded.length - 8}건 더 보기
              </Link>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
