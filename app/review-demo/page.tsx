import { claimsData } from "@/data/claims.data"
import { ncrsData } from "@/data/ncr.data"
import { assetData } from "@/data/assets.data"
import { testsData } from "@/data/tests.data"
import { vendorsData } from "@/data/vendors.data"
import { OCCUPIED_TEST_STATUSES } from "@/lib/facilities-utils"
import {
  ShieldAlert, Wrench, FlaskConical, ClipboardList,
  AlertCircle, CheckCircle, Clock, TrendingUp,
} from "lucide-react"
import Link from "next/link"

export default function ReviewDemoMainPage() {
  const unresolvedClaims = claimsData.claims.filter(c => c.status !== "Closed").length
  const openNCRs = ncrsData.ncrs.filter(n => n.status !== "Closed").length
  const totalEquipment = assetData.equipment.reduce((acc, eq) => acc + eq.quantity, 0)
  const runningTests = testsData.tests.filter(t =>
    (OCCUPIED_TEST_STATUSES as readonly string[]).includes(t.status)
  ).length
  const gradeAVendors = vendorsData.vendors.filter(v => v.grade === "A").length
  const warningVendors = vendorsData.vendors.filter(v => v.grade === "C" || v.grade === "D").length

  const kpis = [
    {
      label: "미결 클레임", value: unresolvedClaims, unit: "건", color: "text-rose-600",
      bg: "bg-rose-50", icon: ShieldAlert, href: "/review-demo/claims",
    },
    {
      label: "진행 중 시험", value: runningTests, unit: "건", color: "text-sky-600",
      bg: "bg-sky-50", icon: FlaskConical, href: "/review-demo/facilities",
    },
    {
      label: "등록 자산", value: totalEquipment, unit: "대", color: "text-slate-700",
      bg: "bg-slate-100", icon: Wrench, href: "/review-demo/assets",
    },
    {
      label: "Open NCR", value: openNCRs, unit: "건", color: "text-amber-600",
      bg: "bg-amber-50", icon: AlertCircle, href: "/review-demo/claims",
    },
    {
      label: "A등급 협력사", value: gradeAVendors, unit: "개사", color: "text-emerald-600",
      bg: "bg-emerald-50", icon: CheckCircle, href: "/review-demo/vendors",
    },
    {
      label: "요주의 협력사", value: warningVendors, unit: "개사", color: "text-orange-600",
      bg: "bg-orange-50", icon: TrendingUp, href: "/review-demo/vendors",
    },
  ]

  const recentClaims = claimsData.claims.slice(0, 5)
  const statusColor: Record<string, string> = {
    Received: "bg-slate-100 text-slate-600",
    Investigating: "bg-sky-100 text-sky-700",
    Action: "bg-amber-100 text-amber-700",
    Verification: "bg-violet-100 text-violet-700",
    Closed: "bg-emerald-100 text-emerald-700",
  }

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">품질부문 대시보드</h1>
        <p className="text-sm text-slate-500 mt-1">QMS 2.0 — 부문장 통합 뷰 (데모 데이터)</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map(({ label, value, unit, color, bg, icon: Icon, href }) => (
          <Link key={label} href={href}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
              <Icon className={`w-6 h-6 ${color}`} />
            </div>
            <div>
              <p className="text-xs text-slate-500">{label}</p>
              <p className={`text-3xl font-extrabold ${color}`}>
                {value}<span className="text-sm font-normal text-slate-400 ml-1">{unit}</span>
              </p>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Claims */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800">최근 고객 클레임</h2>
          <Link href="/review-demo/claims" className="text-xs text-sky-600 hover:text-sky-800 font-medium">전체 보기 →</Link>
        </div>
        <div className="divide-y divide-slate-50">
          {recentClaims.map(claim => (
            <div key={claim.id} className="px-6 py-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{claim.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {claim.customer} · 접수 {claim.receivedAt} · 담당 {claim.assignee}
                </p>
              </div>
              <span className={`shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full ${statusColor[claim.status] ?? "bg-slate-100 text-slate-600"}`}>
                {claim.status}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Pending approvals (mock — team_lead view) */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800">팀장 결재 대기 (데모)</h2>
          <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">3건</span>
        </div>
        {[
          { id: "REQ-NCR-001", cat: "NCR 승인", title: "압출 3호기 알루미늄 피복 두께 편차 부적합보고서", requester: "송민섭 전임연구원", date: "2026-05-29" },
          { id: "REQ-TEST-002", cat: "시험성적 검토", title: "154kV 초고압 케이블 PD(부분방전) 전기 측정 성적서", requester: "박동현 선임연구원", date: "2026-05-28" },
          { id: "REQ-AUDIT-003", cat: "협력사 Audit", title: "동아케미칼 XLPE 원재료 공급라인 정밀 Audit 결과", requester: "김우진 책임연구원", date: "2026-05-27" },
        ].map(task => (
          <div key={task.id} className="px-6 py-4 border-b border-slate-50 last:border-0 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">{task.cat}</span>
                <p className="text-sm font-semibold text-slate-800">{task.title}</p>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{task.requester} · {task.date}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button disabled className="px-3 py-1.5 text-xs font-bold bg-slate-100 text-slate-400 rounded-lg cursor-not-allowed" title="데모 모드: 실제 승인 불가">
                <Clock className="w-3 h-3 inline mr-1" />승인 (비활성)
              </button>
            </div>
          </div>
        ))}
      </section>
    </div>
  )
}
