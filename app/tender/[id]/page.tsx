import { signOut } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { requireActivePageSession } from "@/lib/session-guard"
import WorkflowActions from "./WorkflowActions"
import TitleEdit from "./TitleEdit"
import SysCharEdit from "./SysCharEdit"
import RequirementsEdit from "./RequirementsEdit"
import FilesPanel from "./FilesPanel"
import MatchStandardsButton from "./MatchStandardsButton"
import DirectorPanel from "./DirectorPanel"
import ComplyMark from "./ComplyMark"
import DeviationMark from "./DeviationMark"
import CommentSection from "./CommentSection"
import AnalysisHistory from "./AnalysisHistory"
import ProjectKeyEdit from "./ProjectKeyEdit"
import ProjectHistoryPanel from "./ProjectHistoryPanel"
import { loadProjectHistory } from "@/lib/project-history"
import { displayName } from "@/lib/display-name"
import { Button } from "@/components/ui/button"
import {
  ArrowLeft,
  FileSearch,
  LayoutDashboard,
  HelpCircle,
  MessageSquare,
  LogOut,
  CalendarDays,
  Settings2,
  FileSpreadsheet,
  FileCode,
  AlertTriangle,
  History,
  FolderOpen,
  ClipboardList,
  Globe
} from "lucide-react"

const actionLabel: Record<string, string> = {
  SUBMIT_FOR_REVIEW: "검토 요청",
  REVIEW_APPROVE: "팀장 승인",
  REVIEW_REJECT: "팀장 반려",
  FINAL_APPROVE: "부문장 최종 승인",
  FINAL_REJECT: "부문장 반려",
}

const statusLabel: Record<string, string> = {
  DRAFT: "작성 중",
  REVIEWED: "팀장 승인",
  APPROVED: "최종 승인",
}

export default async function TenderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ truncated?: string }>
}) {
  const session = await requireActivePageSession()

  const { id } = await params
  const { truncated } = await searchParams

  const tender = await prisma.tender.findFirst({
    where: {
      id,
    },
    include: {
      documents: {
        orderBy: { uploadedAt: "desc" },
        include: { analyses: { select: { id: true }, take: 1 } },
      },
      analyses: {
        orderBy: { createdAt: "desc" },
        include: {
          document: { select: { filename: true } },
          requirements: {
            orderBy: { category: "asc" },
            include: { standards: { select: { id: true } } },
          },
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
        },
      },
    },
  })

  if (!tender) redirect("/dashboard")

  // 고리④ surface — 입찰의 project_key로 같은 프로젝트의 과거 이력 조회 (fail-open, 외부 전송 0).
  const isOwner = tender.createdById === session.user.id
  const projectHistory = await loadProjectHistory(tender.projectKey)

  const analysis = tender.analyses[0]
  const canEdit =
    analysis?.status === "DRAFT" &&
    !analysis.submittedAt

  const canAddRef = true

  const canMarkComply =
    session.user.role === "TEAM_LEAD" &&
    analysis?.status === "DRAFT" &&
    !!analysis.submittedAt

  const canMarkDeviation = canEdit || canMarkComply

  const lastAction = analysis?.history.at(-1)?.action
  const displayStatus =
    analysis?.status === "DRAFT" && analysis.submittedAt
      ? "검토 요청됨"
      : analysis?.status === "DRAFT" && lastAction === "FINAL_REJECT"
      ? "부문장 반려됨"
      : analysis?.status === "DRAFT" && lastAction === "REVIEW_REJECT"
      ? "반려됨"
      : statusLabel[analysis?.status ?? ""] ?? analysis?.status

  const reqStats = analysis
    ? {
        total: analysis.requirements.length,
        risk: analysis.requirements.filter((r) => r.isRisk).length,
        ve: analysis.requirements.filter((r) => r.isVE).length,
        comply: analysis.requirements.filter((r) => r.comply === "COMPLY").length,
        nonComply: analysis.requirements.filter((r) => r.comply === "NON_COMPLY").length,
        tbd: analysis.requirements.filter((r) => r.comply === "TBD").length,
        unmarked: analysis.requirements.filter((r) => r.comply === null).length,
      }
    : null

  const docs = tender.documents.map((d) => ({
    id: d.id,
    filename: d.filename,
    uploadedAt: d.uploadedAt.toISOString(),
    isAnalysis: d.analyses.length > 0,
    storagePath: d.storagePath,
    category: d.category ?? null,
  }))

  return (
    <main className="min-h-screen bg-slate-50/50 pb-12">
      {/* 프리미엄 헤더바 */}
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur sticky top-0 z-50 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <Link 
            href="/dashboard" 
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
            title="입찰 대시보드로 돌아가기"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2">
            <FileSearch className="w-5.5 h-5.5 text-indigo-600" />
            <h1 className="font-extrabold text-base text-slate-900 tracking-tight">입찰 리스크 상세 검토</h1>
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
          
          <div className="h-4 w-px bg-slate-200" />

          <span className="text-slate-600 font-semibold flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <Link href="/profile" className="hover:underline">
              {displayName({ name: session.user.name!, nickname: session.user.nickname })}
            </Link>
            <span className="text-[10px] text-slate-400 font-extrabold bg-slate-100 px-1.5 py-0.5 rounded border">
              {session.user.role === "PRACTITIONER" ? "실무자" : session.user.role === "TEAM_LEAD" ? "팀장" : "부문장"}
            </span>
          </span>

          <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }) }}>
            <Button variant="ghost" size="sm" type="submit" className="text-slate-500 hover:text-rose-600 flex items-center gap-1 font-bold">
              <LogOut className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </header>

      {/* 본문 레이아웃 컨테이너 */}
      <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6 text-xs">
        
        {/* 프로젝트 기본 타이틀 & 액션 */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              {canEdit ? (
                <TitleEdit tenderId={id} title={tender.title} />
              ) : (
                <h1 className="text-base md:text-lg font-black text-slate-900 leading-snug">{tender.title}</h1>
              )}
              
              <div className="flex items-center gap-2 flex-wrap">
                {analysis && (
                  <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded-md text-[9px] font-extrabold text-slate-600 uppercase tracking-wider">
                    상태: {displayStatus}
                  </span>
                )}
                <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                  <CalendarDays className="w-3.5 h-3.5" /> 등록일: {tender.createdAt.toLocaleDateString("ko-KR")}
                </span>
                {/* AI 분석 메타 배지 */}
                {analysis?.aiUsed && (
                  <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 rounded-md text-[9px] font-extrabold text-indigo-600">
                    AI: {analysis.aiUsed}
                  </span>
                )}
                {analysis && (
                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold border ${(analysis.ragChunkCount ?? 0) > 0 ? "bg-violet-50 border-violet-100 text-violet-600" : "bg-slate-50 border-slate-200 text-slate-400"}`}>
                    RAG: {(analysis.ragChunkCount ?? 0) > 0 ? `${analysis.ragChunkCount}청크` : "미적용"}
                  </span>
                )}
                {analysis && (
                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold border flex items-center gap-0.5 ${analysis.webContextApplied ? "bg-sky-50 border-sky-100 text-sky-600" : "bg-slate-50 border-slate-200 text-slate-400"}`}>
                    <Globe className="w-2.5 h-2.5" /> 웹: {analysis.webContextApplied ? "포함" : "미포함"}
                  </span>
                )}
              </div>

              {/* 고리④ — 프로젝트 연결 키 (같은 키의 과거 이력을 아래 패널에 surface) */}
              <div className="pt-1">
                <ProjectKeyEdit tenderId={id} projectKey={tender.projectKey} canEdit={isOwner} />
              </div>
            </div>
            
            {/* 파일 내보내기 */}
            {analysis && (
              <div className="flex gap-1.5 shrink-0">
                <a
                  href={`/api/analysis/${analysis.id}/export?format=xlsx`}
                  className="px-3 py-2 border border-slate-200 hover:border-slate-800 text-slate-700 rounded-xl hover:bg-slate-50 font-bold transition-all flex items-center gap-1"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Excel 다운로드
                </a>
                <a
                  href={`/api/analysis/${analysis.id}/export?format=md`}
                  className="px-3 py-2 border border-slate-200 hover:border-slate-800 text-slate-700 rounded-xl hover:bg-slate-50 font-bold transition-all flex items-center gap-1"
                >
                  <FileCode className="w-3.5 h-3.5 text-indigo-600" /> Markdown 내보내기
                </a>
              </div>
            )}
          </div>
        </div>

        {/* 잘림 경고 */}
        {truncated === "1" && (
          <div className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-center gap-2 animate-pulse">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            문서 분량이 너무 길어 상위 약 30만 자까지만 분석되었습니다. 후반부 항목이 누락될 수 있으니 주의해 주십시오.
          </div>
        )}

        {/* 고리④ surface — 같은 project_key의 과거 이력 (키가 설정된 경우에만) */}
        {projectHistory && <ProjectHistoryPanel history={projectHistory} />}

        {!analysis ? (
          <p className="text-slate-400 italic text-center py-12">분석 결과가 없습니다.</p>
        ) : (
          <>
            {/* 리치 요약 카드 패널 */}
            {reqStats && reqStats.total > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                {[
                  { label: "전체 항목", value: reqStats.total, style: "bg-slate-100 text-slate-700 border-slate-200" },
                  { label: "부합 (Comply)", value: reqStats.comply, style: "bg-emerald-50 text-emerald-700 border-emerald-100" },
                  { label: "불부합", value: reqStats.nonComply, style: reqStats.nonComply > 0 ? "bg-rose-50 text-rose-700 border-rose-100 font-extrabold animate-pulse" : "bg-slate-50 text-slate-400 border-slate-100" },
                  { label: "검토 요망", value: reqStats.tbd, style: reqStats.tbd > 0 ? "bg-amber-50 text-amber-700 border-amber-100" : "bg-slate-50 text-slate-400 border-slate-100" },
                  { label: "미판정", value: reqStats.unmarked, style: reqStats.unmarked > 0 ? "bg-slate-50 text-slate-500 border-slate-200" : "bg-slate-50 text-slate-300 border-slate-100" },
                  { label: "위험 (RISK)", value: reqStats.risk, style: reqStats.risk > 0 ? "bg-rose-100 text-rose-700 border-rose-200 font-extrabold" : "bg-slate-50 text-slate-400 border-slate-100" },
                ].map(({ label, value, style }) => (
                  <div key={label} className={`rounded-xl px-3 py-2.5 text-center border shadow-sm ${style}`}>
                    <p className="text-[10px] tracking-wide font-extrabold uppercase opacity-75">{label}</p>
                    <p className="text-xl font-black leading-tight mt-1">{value}</p>
                  </div>
                ))}
              </div>
            )}

            {/* 승인 프로세스 제어판 */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
              <WorkflowActions
                analysisId={analysis.id}
                role={session.user.role}
                status={analysis.status}
                isSubmitted={!!analysis.submittedAt}
              />
            </div>

            {/* 시스템 특성 */}
            <section className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
              <h2 className="text-xs font-extrabold text-slate-400 tracking-wider uppercase flex items-center gap-1.5 border-b pb-2">
                <Settings2 className="w-4 h-4 text-slate-400" />
                입찰 프로젝트 시스템 특성 명세
              </h2>
              {canEdit && (
                <SysCharEdit
                  analysisId={analysis.id}
                  fields={{
                    voltage: analysis.voltage,
                    bilSil: analysis.bilSil,
                    shortCircuit: analysis.shortCircuit,
                    installCond: analysis.installCond,
                    groundConfig: analysis.groundConfig,
                    requiredCapacity: analysis.requiredCapacity,
                  }}
                />
              )}
              <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 pt-2">
                {(
                  [
                    { label: "정격 전압", key: "voltage" },
                    { label: "임펄스 (BIL/SIL)", key: "bilSil" },
                    { label: "정격 단락용량", key: "shortCircuit" },
                    { label: "케이블 포설 조건", key: "installCond" },
                    { label: "접지 형태 구성", key: "groundConfig" },
                    { label: "요구 송전 용량", key: "requiredCapacity" },
                  ] as const
                ).map(({ label, key }) => (
                  <div key={key} className="space-y-0.5">
                    <dt className="text-[10px] text-slate-400 font-bold uppercase">{label}</dt>
                    <dd className="text-xs font-bold text-slate-800">{analysis[key] ?? "—"}</dd>
                  </div>
                ))}
              </dl>
            </section>

            {/* 기술 요구사항 검토 및 매칭 */}
            <section className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <h2 className="text-xs font-extrabold text-slate-800 tracking-wider uppercase flex items-center gap-1.5">
                  <ClipboardList className="w-4.5 h-4.5 text-indigo-500" />
                  분석된 기술 요구사항 명세 ({analysis.requirements.length}건)
                </h2>
                {canEdit && <MatchStandardsButton analysisId={analysis.id} />}
              </div>
              
              {canEdit ? (
                <RequirementsEdit
                  analysisId={analysis.id}
                  requirements={analysis.requirements.map((r) => ({
                    id: r.id,
                    category: r.category,
                    content: r.content,
                    sourcePage: r.sourcePage,
                    sourceText: r.sourceText,
                    isRisk: r.isRisk,
                    isVE: r.isVE,
                    isManual: r.isManual,
                    comply: r.comply as "COMPLY" | "NON_COMPLY" | "TBD" | null,
                    remark: r.remark,
                    deviationType: r.deviationType as "DEVIATION" | "CLARIFICATION" | "ASSUMPTION" | null,
                    deviationText: r.deviationText,
                  }))}
                />
              ) : analysis.requirements.length === 0 ? (
                <p className="text-xs text-slate-400 italic">추출된 기술 요구사항이 존재하지 않습니다.</p>
              ) : (
                <ul className="space-y-4 pt-1">
                  {analysis.requirements.map((r) => (
                    <li key={r.id} className="border-b last:border-0 pb-4 last:pb-0 space-y-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[8px] px-1.5 py-0.5 bg-slate-100 border rounded text-slate-500 font-bold uppercase">{r.category}</span>
                        {r.isRisk && <span className="text-[8px] px-1.5 py-0.5 bg-rose-50 border border-rose-100 rounded text-rose-700 font-extrabold">RISK</span>}
                        {r.isVE && <span className="text-[8px] px-1.5 py-0.5 bg-blue-50 border border-blue-100 rounded text-blue-700 font-extrabold">VE (대체제안)</span>}
                        {r.sourcePage && <span className="text-[10px] text-slate-400 font-mono">p.{r.sourcePage}</span>}
                        {r.standards.map((s) => (
                          <span key={s.id} className="text-[8px] px-1.5 py-0.5 bg-indigo-50 border border-indigo-100 rounded text-indigo-700 font-bold">
                            정합규격: {s.id}
                          </span>
                        ))}
                      </div>
                      
                      <p className="text-xs font-bold text-slate-800 leading-relaxed">{r.content}</p>
                      {r.sourceText && (
                        <p className="text-[10px] text-slate-400 font-medium bg-slate-50/50 p-2 rounded-lg border italic">{`원문 발췌: "${r.sourceText}"`}</p>
                      )}
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                        <ComplyMark
                          requirementId={r.id}
                          initialComply={r.comply as "COMPLY" | "NON_COMPLY" | "TBD" | null}
                          initialRemark={r.remark}
                          canEdit={canMarkComply}
                        />
                        <DeviationMark
                          requirementId={r.id}
                          initialType={r.deviationType as "DEVIATION" | "CLARIFICATION" | "ASSUMPTION" | null}
                          initialText={r.deviationText}
                          canEdit={canMarkDeviation}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* 검토 이력 */}
            {analysis.history.length > 0 && (
              <section className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
                <h2 className="text-xs font-extrabold text-slate-400 tracking-wider uppercase flex items-center gap-1.5 border-b pb-2">
                  <History className="w-4 h-4 text-slate-400" />
                  워크플로우 조치 및 검토 이력 타임라인
                </h2>
                <ol className="space-y-4 pl-2 ml-1 relative border-l border-slate-100">
                  {analysis.history.map((h) => (
                    <li key={h.id} className="space-y-1 relative pl-4">
                      {/* 타임라인 점 */}
                      <span className="absolute left-[5.5px] top-1.5 w-2 h-2 rounded-full bg-slate-300 border border-white" />
                      
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span className="font-mono">{new Date(h.createdAt).toLocaleString("ko-KR")}</span>
                        <span className="font-bold text-slate-500">작업자: {displayName(h.user)}</span>
                      </div>

                      <p className="text-xs text-slate-800">
                        <span className="font-extrabold text-slate-950 bg-slate-100 px-1.5 py-0.5 rounded border">{actionLabel[h.action] ?? h.action}</span>
                      </p>
                      {h.reason && (
                        <p className={`p-2.5 rounded-lg border text-xs leading-relaxed font-semibold mt-1.5 ${
                          h.action.includes("REJECT") ? "bg-rose-50/50 text-rose-800 border-rose-100"
                          : h.action === "SUBMIT_FOR_REVIEW" ? "bg-indigo-50/30 text-indigo-950 border-indigo-100"
                          : "bg-emerald-50/30 text-emerald-950 border-emerald-100"
                        }`}>
                          💬 {h.action.includes("REJECT") ? "반려 피드백 사유" : h.action === "SUBMIT_FOR_REVIEW" ? "실무자 송신 의견" : "조치 의견"}: {h.reason}
                        </p>
                      )}
                    </li>
                  ))}
                </ol>
              </section>
            )}
          </>
        )}

        {/* 부문장 메모 + 검토의견 초안 */}
        {session.user.role === "DIRECTOR" && analysis && (
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <DirectorPanel
              analysisId={analysis.id}
              initialMemo={analysis.directorMemo ?? null}
              initialDraft={analysis.draftOpinion ?? null}
            />
          </div>
        )}

        {/* 코멘트 협업 스레드 */}
        {analysis && (
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <CommentSection
              analysisId={analysis.id}
              initialComments={analysis.comments.map((c) => ({
                id: c.id,
                authorName: displayName(c.author),
                content: c.content,
                createdAt: c.createdAt.toISOString(),
                replies: c.replies.map((r) => ({
                  id: r.id,
                  authorName: displayName(r.author),
                  content: r.content,
                  createdAt: r.createdAt.toISOString(),
                })),
              }))}
            />
          </div>
        )}

        {/* 분석 이력 (2번째 분석부터 표시) */}
        {tender.analyses.length > 1 && (
          <AnalysisHistory
            analyses={tender.analyses.map((a) => ({
              id: a.id,
              createdAt: a.createdAt.toISOString(),
              aiUsed: a.aiUsed,
              ragChunkCount: a.ragChunkCount ?? 0,
              webContextApplied: a.webContextApplied ?? false,
              requirementCount: a.requirements.length,
              documentName: a.document?.filename ?? null,
              requirements: a.requirements.map((r) => ({
                id: r.id,
                category: r.category,
                content: r.content,
                sourcePage: r.sourcePage,
                isRisk: r.isRisk,
                isVE: r.isVE,
                comply: r.comply,
              })),
            }))}
            canDelete={true}
          />
        )}

        {/* 참고 파일 관리 */}
        {canAddRef && (
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <h2 className="text-xs font-extrabold text-slate-400 tracking-wider uppercase flex items-center gap-1.5 border-b pb-2">
              <FolderOpen className="w-4 h-4 text-slate-400" />
              참조 파일 라이브러리 및 재분석
            </h2>
            <FilesPanel 
              tenderId={id} 
              documents={docs} 
              canManage={canEdit} 
              canAnalyze={!analysis}
              canDeleteFiles={canAddRef} 
            />
          </div>
        )}

      </div>
    </main>
  )
}
