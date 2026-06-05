import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import {
  CheckCircle2, Clock, FolderOpen, TrendingUp,
  ChevronRight, AlertCircle, FileSearch, Plus,
} from "lucide-react"
import CreateProjectButton from "./CreateProjectButton"

function statusBadge(status: string, submittedAt: Date | null): { label: string; cls: string } {
  if (status === "APPROVED") return { label: "최종 승인", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" }
  if (status === "REVIEWED") return { label: "팀장 승인", cls: "bg-blue-50 text-blue-700 border-blue-200" }
  if (submittedAt)           return { label: "검토 요청", cls: "bg-amber-50 text-amber-700 border-amber-200 animate-pulse" }
  return                            { label: "작성 중",   cls: "bg-slate-50 text-slate-500 border-slate-200" }
}

const projectStatusLabel: Record<string, { label: string; cls: string }> = {
  DRAFT:       { label: "분석 전",  cls: "bg-slate-50 text-slate-500 border-slate-200" },
  IN_REVIEW:   { label: "검토 중",  cls: "bg-amber-50 text-amber-700 border-amber-200" },
  COMPLETED:   { label: "완료",     cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
}

export default async function ProjectsPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const [tenders, awardedProjects, approvedTenders] = await Promise.all([
    // 입찰 검토 중 (DRAFT or REVIEWED 분석 보유)
    prisma.tender.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        analyses: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { requirements: { select: { isRisk: true } } },
        },
      },
    }),
    // 수주 프로젝트
    prisma.awardedProject.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        tender: { select: { id: true, title: true, createdAt: true } },
        analyses: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { gaps: { select: { isRisk: true, gapType: true } } },
        },
        documents: { select: { id: true }, take: 1 },
      },
    }),
    // 수주 프로젝트로 등록 가능한 APPROVED 입찰 (미등록된 것만)
    prisma.tender.findMany({
      where: { awardedProject: null },
      select: { id: true, title: true },
      orderBy: { createdAt: "desc" },
    }),
  ])

  const reviewing = tenders.filter(t => {
    const a = t.analyses[0]
    return !a || a.status === "DRAFT" || a.status === "REVIEWED"
  })
  const tenderAwarded = tenders.filter(t => t.analyses[0]?.status === "APPROVED")

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">프로젝트 관리</h1>
          <p className="text-slate-500 text-sm mt-1">입찰 검토 현황과 수주 후 계약 관리를 한눈에 확인합니다.</p>
        </div>
        <CreateProjectButton approvedTenders={approvedTenders} />
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
          <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4 text-indigo-500" />
          </div>
          <div>
            <p className="text-xs text-slate-500">입찰 승인</p>
            <p className="text-2xl font-bold text-slate-900">{tenderAwarded.length}<span className="text-sm font-normal text-slate-400 ml-1">건</span></p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
            <FolderOpen className="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <p className="text-xs text-slate-500">수주 프로젝트</p>
            <p className="text-2xl font-bold text-slate-900">{awardedProjects.length}<span className="text-sm font-normal text-slate-400 ml-1">건</span></p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
            <TrendingUp className="w-4 h-4 text-slate-500" />
          </div>
          <div>
            <p className="text-xs text-slate-500">전체 입찰</p>
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
              <span className="text-xs text-slate-400">{reviewing.length}건</span>
            </div>
            <Link href="/dashboard" className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 font-medium">
              전체 보기 <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="flex-1 divide-y divide-slate-50">
            {reviewing.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-10">검토 중인 입찰 프로젝트가 없습니다.</p>
            ) : reviewing.slice(0, 8).map(t => {
              const a = t.analyses[0]
              const riskCount = a?.requirements.filter(r => r.isRisk).length ?? 0
              const badge = statusBadge(a?.status ?? "DRAFT", a?.submittedAt ?? null)
              return (
                <Link key={t.id} href="/dashboard" className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors group">
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
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badge.cls} shrink-0`}>{badge.label}</span>
                </Link>
              )
            })}
            {reviewing.length > 8 && (
              <Link href="/dashboard" className="block text-center text-xs text-slate-400 hover:text-indigo-600 py-3">+{reviewing.length - 8}건 더 보기</Link>
            )}
          </div>
        </section>

        {/* 수주 프로젝트 */}
        <section className="bg-white rounded-xl border border-slate-200 flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-emerald-500" />
            <h2 className="text-sm font-semibold text-slate-800">수주 프로젝트</h2>
            <span className="text-xs text-slate-400">{awardedProjects.length}건</span>
          </div>
          <div className="flex-1 divide-y divide-slate-50">
            {awardedProjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-center px-4">
                <FolderOpen className="w-8 h-8 text-slate-200" />
                <p className="text-xs text-slate-400 italic">등록된 수주 프로젝트가 없습니다.</p>
                {approvedTenders.length > 0 && (
                  <p className="text-[11px] text-slate-300">우측 상단 &quot;수주 프로젝트 등록&quot; 버튼으로 추가하세요.</p>
                )}
              </div>
            ) : awardedProjects.map(p => {
              const a = p.analyses[0]
              const riskCount = a?.gaps.filter(g => g.isRisk).length ?? 0
              const gapCount = a?.gaps.filter(g => g.gapType === "GAP").length ?? 0
              const ps = projectStatusLabel[p.status] ?? projectStatusLabel.DRAFT
              return (
                <Link key={p.id} href={`/projects/${p.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors group">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate group-hover:text-emerald-700">{p.title ?? p.tender?.title ?? "제목 없음"}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {new Date(p.createdAt).toLocaleDateString("ko-KR")}
                      {riskCount > 0 && <span className="ml-2 inline-flex items-center gap-0.5 text-rose-500"><AlertCircle className="w-3 h-3" /> 리스크 {riskCount}</span>}
                      {gapCount > 0 && <span className="ml-2 text-amber-600">갭 {gapCount}건</span>}
                    </p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${ps.cls} shrink-0`}>{ps.label}</span>
                </Link>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}
