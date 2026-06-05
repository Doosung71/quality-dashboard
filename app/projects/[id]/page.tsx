import { requireActivePageSession } from "@/lib/session-guard"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, FolderOpen } from "lucide-react"
import ContractUploadForm from "./ContractUploadForm"
import GapAnalysisView from "./GapAnalysisView"
import WorkflowActions from "./WorkflowActions"

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await requireActivePageSession()
  const { id } = await params

  const project = await prisma.awardedProject.findUnique({
    where: { id },
    include: {
      tender: {
        include: {
          analyses: {
            where: { status: "APPROVED" },
            orderBy: { updatedAt: "desc" },
            take: 1,
            include: {
              requirements: {
                select: { category: true, content: true, isRisk: true },
                orderBy: { category: "asc" },
              },
            },
          },
        },
      },
      documents: { orderBy: { uploadedAt: "desc" } },
      analyses: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          gaps: { orderBy: [{ isRisk: "desc" }, { category: "asc" }] },
          history: {
            orderBy: { createdAt: "asc" },
            include: { user: { select: { name: true, nickname: true } } },
          },
        },
      },
    },
  })

  if (!project) redirect("/projects")

  const tenderAnalysis = project.tender.analyses[0]
  const latestAnalysis = project.analyses[0]
  const role = session.user.role

  const gapTypeBadge: Record<string, { label: string; cls: string }> = {
    MATCH:   { label: "일치",     cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    GAP:     { label: "차이",     cls: "bg-rose-50 text-rose-700 border-rose-200" },
    RELAXED: { label: "완화",     cls: "bg-blue-50 text-blue-700 border-blue-200" },
    NEW:     { label: "신규",     cls: "bg-amber-50 text-amber-700 border-amber-200" },
  }

  const statusLabel: Record<string, string> = {
    DRAFT:    "작성 중",
    REVIEWED: "팀장 승인",
    APPROVED: "최종 승인",
  }

  const actionLabel: Record<string, string> = {
    SUBMIT_FOR_REVIEW: "검토 요청",
    REVIEW_APPROVE:    "팀장 승인",
    REVIEW_REJECT:     "팀장 반려",
    FINAL_APPROVE:     "최종 승인",
    FINAL_REJECT:      "부문장 반려",
  }

  return (
    <main className="min-h-screen bg-slate-50/50 pb-12">
      {/* 헤더 */}
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur sticky top-0 z-50 px-4 md:px-6 py-3 flex items-center justify-between gap-2 shadow-sm">
        <div className="flex items-center gap-2 min-w-0">
          <Link href="/projects" className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <FolderOpen className="w-4 h-4 text-emerald-600 shrink-0" />
          <h1 className="font-extrabold text-sm text-slate-900 tracking-tight truncate">
            {project.tender.title}
          </h1>
        </div>
        <span className={`text-[10px] font-bold px-2 py-1 rounded-full border shrink-0 ${
          project.status === "COMPLETED" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
          project.status === "IN_REVIEW" ? "bg-amber-50 text-amber-700 border-amber-200" :
          "bg-slate-50 text-slate-500 border-slate-200"
        }`}>
          {project.status === "COMPLETED" ? "완료" : project.status === "IN_REVIEW" ? "검토 중" : "분석 전"}
        </span>
      </header>

      <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-6">
        {/* 입찰 요구사항 요약 */}
        {tenderAnalysis && (
          <section className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-400" />
              입찰 단계 요구사항 ({tenderAnalysis.requirements.length}건)
              <span className="text-xs font-normal text-slate-400">최종 승인 기준</span>
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {Array.from(new Set(tenderAnalysis.requirements.map(r => r.category))).map(cat => {
                const cnt = tenderAnalysis.requirements.filter(r => r.category === cat).length
                const riskCnt = tenderAnalysis.requirements.filter(r => r.category === cat && r.isRisk).length
                return (
                  <span key={cat} className="text-xs px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                    {cat} ({cnt}{riskCnt > 0 ? ` / 리스크 ${riskCnt}` : ""})
                  </span>
                )
              })}
            </div>
          </section>
        )}

        {/* 계약서 업로드 + 분석 실행 */}
        <ContractUploadForm
          projectId={project.id}
          documents={project.documents.map(d => ({ id: d.id, filename: d.filename, uploadedAt: d.uploadedAt.toISOString() }))}
          latestAnalysisId={latestAnalysis?.id ?? null}
          hasAnalysis={!!latestAnalysis}
        />

        {/* 갭 분석 결과 */}
        {latestAnalysis && (
          <>
            <GapAnalysisView
              gaps={latestAnalysis.gaps.map(g => ({
                id: g.id,
                category: g.category,
                tenderItem: g.tenderItem,
                contractItem: g.contractItem,
                gapType: g.gapType,
                isRisk: g.isRisk,
                sourcePage: g.sourcePage,
                remark: g.remark,
              }))}
              gapTypeBadge={gapTypeBadge}
              analysisStatus={latestAnalysis.status}
              aiUsed={latestAnalysis.aiUsed}
            />

            {/* 워크플로우 액션 */}
            <WorkflowActions
              analysisId={latestAnalysis.id}
              status={latestAnalysis.status}
              submittedAt={latestAnalysis.submittedAt?.toISOString() ?? null}
              role={role}
            />

            {/* 검토 이력 */}
            {latestAnalysis.history.length > 0 && (
              <section className="bg-white rounded-xl border border-slate-200 p-5">
                <h2 className="text-sm font-semibold text-slate-800 mb-3">검토 이력</h2>
                <div className="space-y-2">
                  {latestAnalysis.history.map(h => (
                    <div key={h.id} className="flex items-center gap-3 text-xs">
                      <span className="text-slate-400 shrink-0">{new Date(h.createdAt).toLocaleString("ko-KR")}</span>
                      <span className="font-medium text-slate-700">{h.user.nickname ?? h.user.name}</span>
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{actionLabel[h.action] ?? h.action}</span>
                      {h.reason && <span className="text-slate-500">— {h.reason}</span>}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  )
}
