import { prisma } from "@/lib/prisma"
import { requireActivePageSession, TEST_MODE } from "@/lib/session-guard"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { displayName } from "@/lib/display-name"
import UploadForm from "./UploadForm"
import TenderList from "./TenderList"
import { type TenderRow } from "./TenderList"
import Image from "next/image"
import { CheckCircle2, Clock } from "lucide-react"

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
    where: undefined,
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { name: true, nickname: true, department: true } },
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

  const spgOptions = [...new Set(tenders.map((t) => t.spg).filter((v): v is string => !!v))].sort()
  const marketRegionOptions = [...new Set(tenders.map((t) => t.marketRegion).filter((v): v is string => !!v))].sort()

  const pendingReviews =
    (TEST_MODE || session.user.role === "TEAM_LEAD")
      ? await prisma.analysis.findMany({
          where: { status: "DRAFT", submittedAt: { not: null } },
          orderBy: { submittedAt: "asc" },
          include: { tender: { select: { id: true, title: true } } },
        })
      : []

  const pendingFinalReviews =
    (TEST_MODE || session.user.role === "DIRECTOR")
      ? await prisma.analysis.findMany({
          where: { status: "REVIEWED" },
          orderBy: { updatedAt: "asc" },
          include: { tender: { select: { id: true, title: true } } },
        })
      : []

  return (
    <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">

          {/* 좌측: 대표 이미지 + 케이블 히어로 카드 + 실무자 업로드 폼 */}
          <div className="lg:col-span-1 space-y-4">
            <div className="relative w-full overflow-hidden rounded-2xl shadow-md" style={{ aspectRatio: "16/9" }}>
              <Image
                src="/tender-picture.png"
                alt="입찰검토시스템 — HVDC·HVAC 지중/해저 케이블 프로젝트"
                fill
                className="object-cover"
                priority
              />
            </div>
            <CableHeroCard />
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
              <UploadForm spgOptions={spgOptions} marketRegionOptions={marketRegionOptions} />
            </div>
          </div>

          {/* 우측: 결재 대기 패널 + 입찰 목록 */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            {/* 결재 대기 패널 (팀장 / 부문장) */}
            {(TEST_MODE || session.user.role === "DIRECTOR") && (
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
            {(TEST_MODE || session.user.role === "TEAM_LEAD") && (
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
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex-1">
              <TenderList tenders={tenders.map((t) => {
                const analysis = t.analyses[0]
                const lastAction = analysis?.history.at(-1)?.action
                const label = analysis
                  ? analysisStatusLabel(analysis.status, analysis.submittedAt, lastAction)
                  : ""
                const isApproved = analysis?.status === "REVIEWED" || analysis?.status === "APPROVED"
                const canEdit = true

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

                const creator = t.createdBy
                const creatorName = creator
                  ? [creator.department, displayName(creator)].filter(Boolean).join(" · ")
                  : undefined

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
                  creatorName,
                  spg: t.spg ?? undefined,
                  marketRegion: t.marketRegion ?? undefined,
                } satisfies TenderRow
              })} />
            </div>
          </div>{/* /우측 */}

        </div>{/* /grid */}
      </div>
  )
}

// ─── 케이블 단면도 히어로 카드 ──────────────────────────────────────────────

const ARMOR_WIRES = Array.from({ length: 24 }, (_, i) => {
  const a = (i / 24) * Math.PI * 2
  return { x: 40 + Math.cos(a) * 27, y: 40 + Math.sin(a) * 27 }
})

function CableHeroCard() {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-slate-900 via-[#0f1f3d] to-slate-900 border border-slate-700/60 shadow-lg p-4">
      {/* 격자 배경 패턴 */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="hgrid" width="16" height="16" patternUnits="userSpaceOnUse">
            <path d="M 16 0 L 0 0 0 16" fill="none" stroke="white" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hgrid)" />
      </svg>

      <div className="relative flex items-center gap-4">
        {/* 케이블 단면도 SVG */}
        <div className="w-[72px] h-[72px] shrink-0 drop-shadow-lg">
          <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            {/* 외부 피복 HDPE */}
            <circle cx="40" cy="40" r="37" fill="#1e293b" stroke="#334155" strokeWidth="0.8"/>
            {/* 베딩 레이어 */}
            <circle cx="40" cy="40" r="31" fill="#293548"/>
            {/* 개별 아머 와이어 */}
            {ARMOR_WIRES.map(({ x, y }, i) => (
              <circle key={i} cx={x} cy={y} r="2.4" fill="#94a3b8" stroke="#64748b" strokeWidth="0.4"/>
            ))}
            {/* 내부 피복 */}
            <circle cx="40" cy="40" r="21.5" fill="#0f172a"/>
            {/* XLPE 절연층 */}
            <circle cx="40" cy="40" r="18.5" fill="#0369a1"/>
            <circle cx="40" cy="40" r="18.5" fill="none" stroke="#38bdf8" strokeWidth="0.6"/>
            {/* 도체 차폐층 */}
            <circle cx="40" cy="40" r="12.5" fill="#1e3a5f"/>
            {/* 연선 도체 외층 6가닥 */}
            {Array.from({ length: 6 }, (_, i) => {
              const a = (i / 6) * Math.PI * 2
              return (
                <circle key={i} cx={40 + Math.cos(a) * 6.8} cy={40 + Math.sin(a) * 6.8}
                  r="3" fill="#b45309" stroke="#d97706" strokeWidth="0.4"/>
              )
            })}
            {/* 중심 도체 */}
            <circle cx="40" cy="40" r="3.2" fill="#f59e0b"/>
            {/* 하이라이트 */}
            <ellipse cx="32" cy="28" rx="5" ry="2.5" fill="white" opacity="0.06"/>
          </svg>
        </div>

        {/* 텍스트 */}
        <div className="min-w-0">
          <p className="text-[10px] font-extrabold tracking-widest text-sky-400 uppercase mb-0.5">
            AI 입찰 분석
          </p>
          <p className="text-sm font-extrabold text-white leading-snug">
            해저·지중 케이블<br/>규격서 자동 검토
          </p>
          <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
            ITB 독소 조항 · 기술 리스크<br/>AI가 자동 판독합니다
          </p>
        </div>
      </div>

      {/* 하단 배지 */}
      <div className="relative mt-3 pt-3 border-t border-slate-700/50 flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-900/60 text-sky-300 border border-sky-700/40">
          RAG · IEC/CIGRE
        </span>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-900/60 text-violet-300 border border-violet-700/40">
          Claude Sonnet
        </span>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-900/60 text-emerald-300 border border-emerald-700/40">
          Neon pgvector
        </span>
      </div>
    </div>
  )
}
