import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { PackageSearch, Plus, ChevronRight, CheckCircle2, XCircle, AlertCircle } from "lucide-react"

const resultConfig: Record<string, { label: string; dot: string; badge: string }> = {
  PASS:             { label: "합격",       dot: "bg-emerald-400", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  FAIL:             { label: "불합격",     dot: "bg-rose-500",    badge: "bg-rose-50 text-rose-700 border-rose-200" },
  CONDITIONAL_PASS: { label: "조건부합격", dot: "bg-amber-400",   badge: "bg-amber-50 text-amber-700 border-amber-200" },
}

export default async function IncomingInspectionsPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const items = await prisma.incomingInspection.findMany({
    orderBy: { inspectionDate: "desc" },
    include: { createdBy: { select: { name: true, nickname: true } } },
  })

  const passCount = items.filter(i => i.result === "PASS").length
  const failCount = items.filter(i => i.result === "FAIL").length
  const condPass  = items.filter(i => i.result === "CONDITIONAL_PASS").length
  const avgDefectRate = items.length > 0
    ? items.reduce((s, i) => s + (i.defectRate ?? 0), 0) / items.length
    : 0

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">수입검사</h1>
          <p className="text-slate-500 text-sm mt-1">Incoming Inspection — 입고 자재·부품의 검사 결과를 기록합니다.</p>
        </div>
        <Link
          href="/vendors/incoming/new"
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> 새 수입검사 등록
        </Link>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
            <PackageSearch className="w-4 h-4 text-slate-500" />
          </div>
          <div>
            <p className="text-xs text-slate-500">전체 검사</p>
            <p className="text-2xl font-bold text-slate-900">{items.length}<span className="text-sm font-normal text-slate-400 ml-1">건</span></p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <p className="text-xs text-slate-500">합격</p>
            <p className="text-2xl font-bold text-slate-900">{passCount}<span className="text-sm font-normal text-slate-400 ml-1">건</span></p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-rose-50 flex items-center justify-center shrink-0">
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div>
            <p className="text-xs text-slate-500">불합격 / 조건부</p>
            <p className="text-2xl font-bold text-slate-900">{failCount + condPass}<span className="text-sm font-normal text-slate-400 ml-1">건</span></p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
            <AlertCircle className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <p className="text-xs text-slate-500">평균 불량률</p>
            <p className="text-2xl font-bold text-slate-900">{avgDefectRate.toFixed(2)}<span className="text-sm font-normal text-slate-400 ml-1">%</span></p>
          </div>
        </div>
      </div>

      {/* 검사 목록 */}
      <section className="bg-white rounded-xl border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-800">검사 목록</h2>
        </div>
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <PackageSearch className="w-10 h-10 text-slate-200" />
            <p className="text-sm text-slate-500">등록된 수입검사 결과가 없습니다.</p>
            <Link href="/vendors/incoming/new" className="text-xs text-sky-500 hover:text-sky-700 font-medium flex items-center gap-0.5">
              첫 수입검사 결과 등록하기 <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {items.map(i => {
              const rc = resultConfig[i.result] ?? resultConfig.PASS
              return (
                <Link key={i.id} href={`/vendors/incoming/${i.id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors group">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${rc.dot}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-slate-900 group-hover:text-sky-700">{i.vendorName}</p>
                      <span className="text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{i.itemName}</span>
                      {i.itemCode && <span className="text-xs text-slate-400">{i.itemCode}</span>}
                      {i.poNumber && <span className="text-xs text-sky-500 bg-sky-50 px-1.5 py-0.5 rounded">PO: {i.poNumber}</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 flex-wrap">
                      <span>검사일: {new Date(i.inspectionDate).toLocaleDateString("ko-KR")}</span>
                      <span>입고일: {new Date(i.receiptDate).toLocaleDateString("ko-KR")}</span>
                      <span>검사원: {i.inspector}</span>
                      <span>수량: {i.quantity.toLocaleString()}</span>
                      {i.defectRate != null && i.defectRate > 0 && (
                        <span className="text-rose-500 font-medium">불량률 {i.defectRate.toFixed(2)}%</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${rc.badge}`}>{rc.label}</span>
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
