import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { ClipboardCheck, Plus, ChevronRight, AlertTriangle, CheckCircle2, Clock } from "lucide-react"

const auditTypeLabel: Record<string, string> = {
  INITIAL: "초기 심사", PERIODIC: "정기 심사", FOLLOW_UP: "사후관리", SPECIAL: "특별 심사",
}
const gradeColor: Record<string, string> = {
  A: "text-emerald-700 bg-emerald-50 border-emerald-200",
  B: "text-blue-700 bg-blue-50 border-blue-200",
  C: "text-amber-700 bg-amber-50 border-amber-200",
  D: "text-rose-700 bg-rose-50 border-rose-200",
}
const severityColor: Record<string, string> = {
  CRITICAL: "bg-rose-500", MAJOR: "bg-amber-500", MINOR: "bg-slate-400", OBSERVATION: "bg-blue-400",
}

export default async function SupplierAuditsPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const audits = await prisma.supplierAudit.findMany({
    orderBy: { auditDate: "desc" },
    include: {
      findings: { select: { id: true, severity: true, status: true } },
      createdBy: { select: { name: true, nickname: true } },
    },
  })

  const totalFindings = audits.reduce((s, a) => s + a.findings.length, 0)
  const openFindings  = audits.reduce((s, a) => s + a.findings.filter(f => f.status === "OPEN").length, 0)
  const completed = audits.filter(a => a.status === "COMPLETED").length
  const planned   = audits.filter(a => a.status === "PLANNED").length

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">협력업체 감사</h1>
          <p className="text-slate-500 text-sm mt-1">Supplier Audit — 협력업체 현장 심사 결과를 기록하고 지적사항을 관리합니다.</p>
        </div>
        <Link
          href="/vendors/audits/new"
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> 새 감사 등록
        </Link>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
            <ClipboardCheck className="w-4 h-4 text-indigo-500" />
          </div>
          <div>
            <p className="text-xs text-slate-500">전체 감사</p>
            <p className="text-2xl font-bold text-slate-900">{audits.length}<span className="text-sm font-normal text-slate-400 ml-1">건</span></p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <p className="text-xs text-slate-500">예정</p>
            <p className="text-2xl font-bold text-slate-900">{planned}<span className="text-sm font-normal text-slate-400 ml-1">건</span></p>
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
          <div className="w-9 h-9 rounded-lg bg-rose-50 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div>
            <p className="text-xs text-slate-500">미조치 지적사항</p>
            <p className="text-2xl font-bold text-slate-900">{openFindings}<span className="text-sm font-normal text-slate-400 ml-1">건</span></p>
          </div>
        </div>
      </div>

      {/* 감사 목록 */}
      <section className="bg-white rounded-xl border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">감사 목록</h2>
          <span className="text-xs text-slate-400">총 {totalFindings}건 지적사항</span>
        </div>
        {audits.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <ClipboardCheck className="w-10 h-10 text-slate-200" />
            <p className="text-sm text-slate-500">등록된 감사 결과가 없습니다.</p>
            <Link href="/vendors/audits/new" className="text-xs text-indigo-500 hover:text-indigo-700 font-medium flex items-center gap-0.5">
              첫 감사 결과 등록하기 <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {audits.map(a => {
              const openCnt = a.findings.filter(f => f.status === "OPEN").length
              const critCnt = a.findings.filter(f => f.severity === "CRITICAL").length
              const majCnt  = a.findings.filter(f => f.severity === "MAJOR").length
              return (
                <Link key={a.id} href={`/vendors/audits/${a.id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-slate-900 group-hover:text-indigo-700">{a.vendorName}</p>
                      <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{auditTypeLabel[a.auditType] ?? a.auditType}</span>
                      {a.overallGrade && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${gradeColor[a.overallGrade] ?? ""}`}>{a.overallGrade}등급</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-slate-400">
                      <span>{new Date(a.auditDate).toLocaleDateString("ko-KR")}</span>
                      <span>감사자: {a.auditor}</span>
                      {a.location && <span>{a.location}</span>}
                      {a.findings.length > 0 && (
                        <span className="flex items-center gap-1">
                          {critCnt > 0 && <span className="text-rose-600 font-semibold">치명 {critCnt}</span>}
                          {majCnt > 0  && <span className="text-amber-600">주요 {majCnt}</span>}
                          {openCnt > 0 && <span className="text-rose-500">미조치 {openCnt}</span>}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {a.findings.length > 0 && (
                      <div className="flex gap-0.5">
                        {a.findings.slice(0, 6).map(f => (
                          <div key={f.id} className={`w-2 h-2 rounded-full ${severityColor[f.severity] ?? "bg-slate-300"} ${f.status === "CLOSED" ? "opacity-30" : ""}`} />
                        ))}
                        {a.findings.length > 6 && <span className="text-[10px] text-slate-400">+{a.findings.length - 6}</span>}
                      </div>
                    )}
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                      a.status === "COMPLETED"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}>{a.status === "COMPLETED" ? "완료" : "예정"}</span>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500" />
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
