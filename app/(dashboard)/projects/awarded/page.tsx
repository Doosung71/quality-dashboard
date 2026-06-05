import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import {
  FolderOpen, AlertCircle, Plus, ChevronRight,
  CheckCircle2, Clock, AlertTriangle,
} from "lucide-react"
import CreateProjectButton from "../CreateProjectButton"

const statusConfig: Record<string, { label: string; dot: string; badge: string }> = {
  DRAFT:     { label: "분석 전",  dot: "bg-slate-300",   badge: "bg-slate-50 text-slate-500 border-slate-200" },
  IN_REVIEW: { label: "검토 중",  dot: "bg-amber-400",   badge: "bg-amber-50 text-amber-700 border-amber-200" },
  COMPLETED: { label: "완료",     dot: "bg-emerald-400", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
}

const gapTypeLabel: Record<string, string> = {
  MATCH: "일치", GAP: "차이", RELAXED: "완화", NEW: "신규",
}

export default async function AwardedProjectsPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const [awardedProjects, approvedTenders] = await Promise.all([
    prisma.awardedProject.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        tender: { select: { id: true, title: true, createdAt: true } },
        analyses: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            gaps: { select: { isRisk: true, gapType: true } },
          },
        },
        documents: { select: { id: true }, orderBy: { uploadedAt: "desc" }, take: 1 },
      },
    }),
    prisma.tender.findMany({
      where: {
        analyses: { some: { status: "APPROVED" } },
        awardedProject: null,
      },
      select: { id: true, title: true },
      orderBy: { createdAt: "desc" },
    }),
  ])

  const completedCount = awardedProjects.filter(p => p.status === "COMPLETED").length
  const inReviewCount  = awardedProjects.filter(p => p.status === "IN_REVIEW").length
  const draftCount     = awardedProjects.filter(p => p.status === "DRAFT").length
  const totalRisk      = awardedProjects.reduce((acc, p) => {
    return acc + (p.analyses[0]?.gaps.filter(g => g.isRisk).length ?? 0)
  }, 0)

  return (
    <div className="flex flex-col gap-6">
      {/* 헤더 */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">수주 프로젝트 관리</h1>
          <p className="text-slate-500 text-sm mt-1">
            계약서를 업로드하고 입찰 약속 대비 갭을 AI로 분석합니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {approvedTenders.length > 0 && (
            <CreateProjectButton approvedTenders={approvedTenders} />
          )}
          <Link
            href="/projects"
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            전체 현황 <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
            <FolderOpen className="w-4 h-4 text-slate-500" />
          </div>
          <div>
            <p className="text-xs text-slate-500">전체 프로젝트</p>
            <p className="text-2xl font-bold text-slate-900">{awardedProjects.length}<span className="text-sm font-normal text-slate-400 ml-1">건</span></p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <p className="text-xs text-slate-500">검토 중</p>
            <p className="text-2xl font-bold text-slate-900">{inReviewCount}<span className="text-sm font-normal text-slate-400 ml-1">건</span></p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <p className="text-xs text-slate-500">완료</p>
            <p className="text-2xl font-bold text-slate-900">{completedCount}<span className="text-sm font-normal text-slate-400 ml-1">건</span></p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-rose-50 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div>
            <p className="text-xs text-slate-500">누적 리스크</p>
            <p className="text-2xl font-bold text-slate-900">{totalRisk}<span className="text-sm font-normal text-slate-400 ml-1">건</span></p>
          </div>
        </div>
      </div>

      {/* 프로젝트 목록 */}
      <section className="bg-white rounded-xl border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">프로젝트 목록</h2>
          {approvedTenders.length > 0 && (
            <span className="text-xs text-emerald-600 font-medium">
              등록 가능한 입찰 {approvedTenders.length}건
            </span>
          )}
        </div>

        {awardedProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-4">
            <FolderOpen className="w-10 h-10 text-slate-200" />
            <div>
              <p className="text-sm font-medium text-slate-500">등록된 수주 프로젝트가 없습니다.</p>
              {approvedTenders.length > 0 ? (
                <p className="text-xs text-slate-400 mt-1">우측 상단 &quot;수주 프로젝트 등록&quot; 버튼으로 추가하세요.</p>
              ) : (
                <p className="text-xs text-slate-400 mt-1">입찰이 최종 승인되면 수주 프로젝트로 등록할 수 있습니다.</p>
              )}
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {awardedProjects.map(p => {
              const a = p.analyses[0]
              const riskCount = a?.gaps.filter(g => g.isRisk).length ?? 0
              const gapCount  = a?.gaps.filter(g => g.gapType === "GAP").length ?? 0
              const newCount  = a?.gaps.filter(g => g.gapType === "NEW").length ?? 0
              const hasDoc    = p.documents.length > 0
              const sc = statusConfig[p.status] ?? statusConfig.DRAFT

              return (
                <Link
                  key={p.id}
                  href={`/projects/${p.id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors group"
                >
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${sc.dot}`} />

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate group-hover:text-emerald-700">
                      {p.tender.title}
                    </p>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-xs text-slate-400">
                        등록 {new Date(p.createdAt).toLocaleDateString("ko-KR")}
                      </span>
                      {!hasDoc && (
                        <span className="text-xs text-slate-400 italic">계약서 미업로드</span>
                      )}
                      {a && (
                        <span className="text-xs text-slate-400">
                          갭 분석 완료
                          {` · 총 ${a.gaps.length}건`}
                        </span>
                      )}
                      {riskCount > 0 && (
                        <span className="flex items-center gap-0.5 text-xs text-rose-600 font-semibold">
                          <AlertCircle className="w-3 h-3" /> 리스크 {riskCount}건
                        </span>
                      )}
                      {gapCount > 0 && (
                        <span className="text-xs text-amber-600">차이 {gapCount}건</span>
                      )}
                      {newCount > 0 && (
                        <span className="text-xs text-indigo-600">신규 {newCount}건</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!hasDoc && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                        계약서 필요
                      </span>
                    )}
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${sc.badge}`}>
                      {sc.label}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500" />
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {/* 분석 미완료 안내 */}
      {draftCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">갭 분석 대기 중인 프로젝트 {draftCount}건</p>
            <p className="text-xs text-amber-600 mt-0.5">
              계약서를 업로드하고 AI 갭 분석을 실행해 리스크를 확인하세요.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
