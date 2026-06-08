import { claimsData } from "@/data/claims.data"
import { ncrsData } from "@/data/ncr.data"
import { ArrowRight, AlertTriangle } from "lucide-react"

const COLUMNS = [
  { key: "Received", label: "접수", color: "border-slate-300 bg-slate-50" },
  { key: "Investigating", label: "조사 중", color: "border-sky-300 bg-sky-50" },
  { key: "Action", label: "조치 중", color: "border-amber-300 bg-amber-50" },
  { key: "Verification", label: "검증 중", color: "border-violet-300 bg-violet-50" },
  { key: "Closed", label: "완료", color: "border-emerald-300 bg-emerald-50" },
]

const PRIORITY_BADGE: Record<string, string> = {
  High: "bg-rose-100 text-rose-700",
  Mid: "bg-amber-100 text-amber-700",
  Low: "bg-slate-100 text-slate-600",
}

const NCR_STATUS: Record<string, string> = {
  Open: "bg-rose-100 text-rose-700",
  "In Progress": "bg-sky-100 text-sky-700",
  Closed: "bg-emerald-100 text-emerald-700",
}

export default function ReviewDemoClaimsPage() {
  const byStatus = Object.fromEntries(
    COLUMNS.map(c => [c.key, claimsData.claims.filter(cl => cl.status === c.key)])
  )

  return (
    <div className="flex flex-col gap-8 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">E2E 워크플로우</h1>
        <p className="text-slate-500 text-sm mt-1">고객 클레임 → NCR 연동 흐름 (데모 데이터)</p>
      </div>

      {/* E2E Flow Diagram */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-sm font-bold text-slate-700 mb-4">품질 이슈 처리 흐름</h2>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 flex-wrap md:flex-nowrap">
          {[
            { step: "1", label: "클레임 접수", desc: "고객 보고·현장 발생" },
            { step: "2", label: "원인 조사", desc: "샘플 분석·현장 방문" },
            { step: "3", label: "NCR 발행", desc: "부적합보고서 등록" },
            { step: "4", label: "시정조치", desc: "Rework·교체·재발방지" },
            { step: "5", label: "검증·완결", desc: "효과 확인·이력 등록" },
          ].map((s, i, arr) => (
            <div key={s.step} className="flex items-center gap-2 shrink-0">
              <div className="flex flex-col items-center text-center w-28">
                <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">{s.step}</div>
                <p className="text-xs font-bold text-slate-800 mt-2">{s.label}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{s.desc}</p>
              </div>
              {i < arr.length - 1 && <ArrowRight className="w-5 h-5 text-slate-300 shrink-0" />}
            </div>
          ))}
        </div>
      </section>

      {/* Claim Kanban */}
      <section>
        <h2 className="text-sm font-bold text-slate-700 mb-3">클레임 Kanban 보드</h2>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {COLUMNS.map(col => (
            <div key={col.key} className={`rounded-xl border-2 ${col.color} p-3`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-700">{col.label}</span>
                <span className="text-[10px] font-bold bg-white rounded-full px-1.5 py-0.5 text-slate-500 border border-slate-200">
                  {byStatus[col.key]?.length ?? 0}
                </span>
              </div>
              <div className="space-y-2">
                {(byStatus[col.key] ?? []).map(claim => (
                  <div key={claim.id} className="bg-white rounded-lg border border-slate-200 p-2.5 shadow-sm">
                    <p className="text-[11px] font-bold text-slate-800 leading-snug line-clamp-2">{claim.title}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{claim.customer}</p>
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${PRIORITY_BADGE[claim.priority] ?? ""}`}>
                        {claim.priority}
                      </span>
                      <span className="text-[9px] text-slate-400">{claim.receivedAt}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* NCR List */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <h2 className="text-sm font-bold text-slate-800">부적합보고서 (NCR) 목록</h2>
        </div>
        <div className="divide-y divide-slate-50">
          {ncrsData.ncrs.slice(0, 6).map(ncr => (
            <div key={ncr.id} className="px-6 py-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{ncr.title}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {ncr.id} · {ncr.source} · 기한 {ncr.targetDate}
                </p>
              </div>
              <span className={`shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full ${NCR_STATUS[ncr.status] ?? "bg-slate-100 text-slate-600"}`}>
                {ncr.status}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
