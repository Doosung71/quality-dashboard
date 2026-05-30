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
import { displayName } from "@/lib/display-name"

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
      ...(session.user.role === "PRACTITIONER" ? { createdById: session.user.id } : {}),
    },
    include: {
      documents: {
        orderBy: { uploadedAt: "desc" },
        include: { analyses: { select: { id: true }, take: 1 } },
      },
      analyses: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
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

  const analysis = tender.analyses[0]
  const canEdit =
    session.user.role === "PRACTITIONER" &&
    analysis?.status === "DRAFT" &&
    !analysis.submittedAt

  // 참고 파일 추가·삭제: 실무자(소유자) + 팀장·부문장 모두 허용
  const canAddRef = session.user.role === "PRACTITIONER" ||
    session.user.role === "TEAM_LEAD" ||
    session.user.role === "DIRECTOR"

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
  }))

  return (
    <main className="min-h-screen bg-zinc-50">
      <header className="bg-white border-b px-8 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="text-sm text-zinc-500 hover:text-zinc-800">← 대시보드</Link>
        <div className="flex items-center gap-4 text-sm text-zinc-600">
          <span>
            <Link href="/profile" className="hover:underline">
              {displayName({ name: session.user.name!, nickname: session.user.nickname })}
            </Link>
            {" · "}{session.user.role === "PRACTITIONER" ? "실무자" : session.user.role === "TEAM_LEAD" ? "팀장" : "부문장"}
          </span>
          <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }) }}>
            <button type="submit" className="text-zinc-500 hover:text-zinc-800">로그아웃</button>
          </form>
        </div>
      </header>

      <div className="p-8 max-w-3xl mx-auto space-y-6">
        <div>
          <div className="flex items-start justify-between gap-4">
            <div>
              {canEdit ? (
                <TitleEdit tenderId={id} title={tender.title} />
              ) : (
                <h1 className="text-lg font-semibold">{tender.title}</h1>
              )}
              {analysis && (
                <span className="text-xs px-2 py-0.5 bg-zinc-200 rounded text-zinc-600 mt-1 inline-block">
                  {displayStatus}
                </span>
              )}
            </div>
            {analysis && (
              <div className="flex gap-2 shrink-0">
                <a
                  href={`/api/analysis/${analysis.id}/export?format=xlsx`}
                  className="text-xs px-3 py-1.5 border rounded text-zinc-600 hover:bg-zinc-50"
                >
                  Excel
                </a>
                <a
                  href={`/api/analysis/${analysis.id}/export?format=md`}
                  className="text-xs px-3 py-1.5 border rounded text-zinc-600 hover:bg-zinc-50"
                >
                  Markdown
                </a>
              </div>
            )}
          </div>
        </div>

        {truncated === "1" && (
          <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-4 py-3">
            문서가 길어 앞부분(약 30만 자)만 분석됐습니다. 후반부 항목이 누락될 수 있습니다.
          </div>
        )}

        {!analysis ? (
          <p className="text-sm text-zinc-400">분석 결과가 없습니다.</p>
        ) : (
          <>
            {/* 요약 카드 */}
            {reqStats && reqStats.total > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {[
                  { label: "전체", value: reqStats.total, style: "bg-zinc-100 text-zinc-600" },
                  { label: "부합", value: reqStats.comply, style: "bg-green-50 text-green-700" },
                  { label: "불부합", value: reqStats.nonComply, style: reqStats.nonComply > 0 ? "bg-red-50 text-red-600 font-semibold" : "bg-zinc-50 text-zinc-400" },
                  { label: "검토중", value: reqStats.tbd, style: reqStats.tbd > 0 ? "bg-amber-50 text-amber-700" : "bg-zinc-50 text-zinc-400" },
                  { label: "미판정", value: reqStats.unmarked, style: reqStats.unmarked > 0 ? "bg-zinc-100 text-zinc-500" : "bg-zinc-50 text-zinc-400" },
                  { label: "RISK", value: reqStats.risk, style: reqStats.risk > 0 ? "bg-red-100 text-red-600 font-semibold" : "bg-zinc-50 text-zinc-400" },
                ].map(({ label, value, style }) => (
                  <div key={label} className={`rounded-lg px-3 py-2 text-center ${style}`}>
                    <p className="text-xs">{label}</p>
                    <p className="text-lg font-bold leading-tight">{value}</p>
                  </div>
                ))}
              </div>
            )}

            <WorkflowActions
              analysisId={analysis.id}
              role={session.user.role}
              status={analysis.status}
              isSubmitted={!!analysis.submittedAt}
            />

            {/* 시스템 특성 */}
            <section className="bg-white border rounded-lg p-4">
              <h2 className="text-sm font-semibold text-zinc-700 mb-3">시스템 특성</h2>
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
              <dl className="grid grid-cols-2 gap-x-6 gap-y-2 mt-2">
                {(
                  [
                    { label: "전압", key: "voltage" },
                    { label: "BIL/SIL", key: "bilSil" },
                    { label: "단락용량", key: "shortCircuit" },
                    { label: "포설 조건", key: "installCond" },
                    { label: "접지 구성", key: "groundConfig" },
                    { label: "요구 용량", key: "requiredCapacity" },
                  ] as const
                ).map(({ label, key }) => (
                  <div key={key}>
                    <dt className="text-xs text-zinc-400">{label}</dt>
                    <dd className="text-sm text-zinc-800">{analysis[key] ?? "—"}</dd>
                  </div>
                ))}
              </dl>
            </section>

            {/* 기술 요구사항 */}
            <section className="bg-white border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-zinc-700">
                  기술 요구사항 ({analysis.requirements.length}건)
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
                    comply: r.comply as "COMPLY" | "NON_COMPLY" | "TBD" | null,
                    remark: r.remark,
                    deviationType: r.deviationType as "DEVIATION" | "CLARIFICATION" | "ASSUMPTION" | null,
                    deviationText: r.deviationText,
                  }))}
                />
              ) : analysis.requirements.length === 0 ? (
                <p className="text-sm text-zinc-400">추출된 요구사항이 없습니다.</p>
              ) : (
                <ul className="space-y-3">
                  {analysis.requirements.map((r) => (
                    <li key={r.id} className="border-b last:border-0 pb-3 last:pb-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs px-1.5 py-0.5 bg-zinc-100 rounded text-zinc-500">{r.category}</span>
                        {r.isRisk && <span className="text-xs px-1.5 py-0.5 bg-red-100 rounded text-red-600">RISK</span>}
                        {r.isVE && <span className="text-xs px-1.5 py-0.5 bg-blue-100 rounded text-blue-600">VE</span>}
                        {r.sourcePage && <span className="text-xs text-zinc-400">p.{r.sourcePage}</span>}
                        {r.standards.map((s) => (
                          <span key={s.id} className="text-xs px-1.5 py-0.5 bg-violet-100 rounded text-violet-700">
                            {s.id}
                          </span>
                        ))}
                      </div>
                      <p className="text-sm text-zinc-800">{r.content}</p>
                      {r.sourceText && (
                        <p className="text-xs text-zinc-400 mt-0.5 italic">{`"${r.sourceText}"`}</p>
                      )}
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
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* 검토 이력 */}
            {analysis.history.length > 0 && (
              <section className="bg-white border rounded-lg p-4">
                <h2 className="text-sm font-semibold text-zinc-700 mb-3">검토 이력</h2>
                <ol className="space-y-3">
                  {analysis.history.map((h) => (
                    <li key={h.id} className="flex gap-3">
                      <div className="w-1 rounded bg-zinc-200 self-stretch shrink-0" />
                      <div>
                        <p className="text-sm text-zinc-800">
                          <span className="font-medium">{actionLabel[h.action] ?? h.action}</span>
                          {" · "}
                          <span className="text-zinc-500">{displayName(h.user)}</span>
                        </p>
                        {h.reason && (
                          <p className={`text-xs mt-0.5 ${
                            h.action.includes("REJECT") ? "text-red-600"
                            : h.action === "SUBMIT_FOR_REVIEW" ? "text-blue-600"
                            : "text-green-700"
                          }`}>
                            {h.action.includes("REJECT") ? "반려 사유" : h.action === "SUBMIT_FOR_REVIEW" ? "제출 메모" : "의견"}: {h.reason}
                          </p>
                        )}
                        <p className="text-xs text-zinc-400 mt-0.5">
                          {new Date(h.createdAt).toLocaleString("ko-KR")}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            )}
          </>
        )}

        {/* 부문장 메모 + 검토의견 초안 */}
        {session.user.role === "DIRECTOR" && analysis && (
          <DirectorPanel
            analysisId={analysis.id}
            initialMemo={analysis.directorMemo ?? null}
            initialDraft={analysis.draftOpinion ?? null}
          />
        )}

        {/* 코멘트 */}
        {analysis && (
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
        )}

        {/* 파일 관리 — 첨부·삭제: 실무자·팀장·부문장 / 재분석: DRAFT+미제출 실무자만 */}
        {canAddRef && <FilesPanel tenderId={id} documents={docs} canManage={canEdit} canAnalyze={session.user.role === "PRACTITIONER" && !analysis} canDeleteFiles={canAddRef} />}
      </div>
    </main>
  )
}
