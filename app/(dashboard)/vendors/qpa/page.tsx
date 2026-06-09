import { requireActivePageSession } from "@/lib/session-guard"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { ClipboardList, Plus, ChevronRight, CheckCircle2, Clock, BarChart2, Star } from "lucide-react"

const resultBadge = {
  PASS: "bg-emerald-50 text-emerald-700 border-emerald-200",
  FAIL: "bg-rose-50 text-rose-700 border-rose-200",
  TBD:  "bg-slate-50 text-slate-500 border-slate-200",
} as const

const levelColor = {
  A: "text-emerald-700 bg-emerald-50 border-emerald-200",
  B: "text-blue-700 bg-blue-50 border-blue-200",
  C: "text-amber-700 bg-amber-50 border-amber-200",
  D: "text-rose-700 bg-rose-50 border-rose-200",
} as const

export default async function QpaAuditsPage() {
  await requireActivePageSession()

  const audits = await prisma.qpaAudit.findMany({
    orderBy: { auditDate: "desc" },
    include: {
      _count: { select: { findings: true } },
      createdBy: { select: { name: true, nickname: true } },
    },
  })

  const total      = audits.length
  const inProgress = audits.filter(a => a.status === "InProgress").length
  const completed  = audits.filter(a => a.status === "Completed").length
  const avgScore   = total > 0
    ? Math.round(audits.reduce((s, a) => s + a.totalPercent, 0) / total * 10) / 10
    : 0

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">공정감사 (QPA)</h1>
          <p className="text-slate-500 text-sm mt-1">Quality Process Audit — LSC QPA 1.0 체크리스트 기반 협력업체 공정감사</p>
        </div>
        <Link
          href="/vendors/qpa/new"
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> 신규 감사 등록
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
            <ClipboardList className="w-4 h-4 text-indigo-500" />
          </div>
          <div>
            <p className="text-xs text-slate-500">전체 감사</p>
            <p className="text-2xl font-bold text-slate-900">{total}<span className="text-sm font-normal text-slate-400 ml-1">건</span></p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <p className="text-xs text-slate-500">진행 중</p>
            <p className="text-2xl font-bold text-slate-900">{inProgress}<span className="text-sm font-normal text-slate-400 ml-1">건</span></p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <p className="text-xs text-slate-500">완료</p>
            <p className="text-2xl font-bold text-slate-900">{completed}<span className="text-sm font-normal text-slate-400 ml-1">건</span></p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
            <BarChart2 className="w-4 h-4 text-blue-500" />
          </div>
          <div>
            <p className="text-xs text-slate-500">평균 달성률</p>
            <p className="text-2xl font-bold text-slate-900">{avgScore}<span className="text-sm font-normal text-slate-400 ml-1">%</span></p>
          </div>
        </div>
      </div>

      <section className="bg-white rounded-xl border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-800">감사 목록</h2>
        </div>
        {audits.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <ClipboardList className="w-10 h-10 text-slate-200" />
            <p className="text-sm text-slate-500">등록된 공정감사가 없습니다.</p>
            <Link href="/vendors/qpa/new" className="text-xs text-indigo-500 hover:text-indigo-700 font-medium flex items-center gap-0.5">
              첫 감사 등록하기 <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {audits.map(a => (
              <Link key={a.id} href={`/vendors/qpa/${a.id}`}
                className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors group overflow-hidden">
                <div className="flex-1 min-w-0 overflow-hidden">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded shrink-0 font-mono">{a.qpaNo}</span>
                    <p className="text-sm font-semibold text-slate-900 group-hover:text-indigo-700 truncate">{a.vendorName}</p>
                    {a.partName && <span className="text-[10px] text-slate-400 truncate max-w-32">{a.partName}</span>}
                    {a.level && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${levelColor[a.level as keyof typeof levelColor] ?? ""}`}>{a.level}등급</span>
                    )}
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${resultBadge[a.result as keyof typeof resultBadge]}`}>{a.result}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-slate-400">
                    <span className="shrink-0">{new Date(a.auditDate).toLocaleDateString("ko-KR")}</span>
                    <span className="truncate max-w-56">감사자: {a.auditorNames}</span>
                    {a.location && <span className="truncate max-w-32">{a.location}</span>}
                    {a._count.findings > 0 && <span className="text-amber-600">지적사항 {a._count.findings}건</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {a.totalPercent > 0 && (
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-700">{a.totalPercent.toFixed(1)}<span className="text-xs font-normal text-slate-400">%</span></p>
                      <p className="text-[10px] text-slate-400">{a.totalScore}pt</p>
                    </div>
                  )}
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                    a.status === "Completed"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-amber-50 text-amber-700 border-amber-200"
                  }`}>{a.status === "Completed" ? "완료" : "진행 중"}</span>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
