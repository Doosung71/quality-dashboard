"use client"

import { useState } from "react"
import { claimsData } from "@/data/claims.data"
import { ncrsData } from "@/data/ncr.data"
import { testsData } from "@/data/tests.data"
import { UserCheck, ShieldAlert, FlaskConical, CheckCircle, Clock, ChevronRight } from "lucide-react"

type ViewRole = "executive" | "team_leader" | "operator"

const ROLE_LABELS: Record<ViewRole, string> = {
  executive: "부문장 (임원)",
  team_leader: "팀장",
  operator: "실무자",
}

export default function ReviewDemoRolesPage() {
  const [role, setRole] = useState<ViewRole>("executive")

  const unresolvedClaims = claimsData.claims.filter(c => c.status !== "Closed")
  const openNCRs = ncrsData.ncrs.filter(n => n.status !== "Closed")
  const runningTests = testsData.tests.filter(t => t.status === "시험중")

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">역할별 뷰</h1>
        <p className="text-slate-500 text-sm mt-1">부문장·팀장·실무자 관점 대시보드 비교 (데모 데이터)</p>
      </div>

      {/* Role Selector */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <UserCheck className="w-4 h-4 text-indigo-600" />
          <span className="text-xs font-bold text-slate-700">역할 선택</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          {(["executive", "team_leader", "operator"] as ViewRole[]).map(v => (
            <button
              key={v}
              onClick={() => setRole(v)}
              className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all ${
                role === v
                  ? "bg-indigo-600 text-white border-indigo-600 shadow"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {ROLE_LABELS[v]}
            </button>
          ))}
        </div>
      </div>

      {/* Executive View */}
      {role === "executive" && (
        <div className="space-y-4">
          <p className="text-xs font-bold text-indigo-600 uppercase tracking-wide">부문장 통합 현황</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-rose-200 p-5">
              <div className="flex items-center gap-2 mb-2">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <span className="text-xs font-bold text-rose-700">미결 클레임</span>
              </div>
              <p className="text-4xl font-extrabold text-rose-600">{unresolvedClaims.length}</p>
              <p className="text-xs text-slate-400 mt-1">High 우선순위: {unresolvedClaims.filter(c => c.priority === "High").length}건</p>
            </div>
            <div className="bg-white rounded-2xl border border-amber-200 p-5">
              <div className="flex items-center gap-2 mb-2">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-bold text-amber-700">Open NCR</span>
              </div>
              <p className="text-4xl font-extrabold text-amber-600">{openNCRs.length}</p>
              <p className="text-xs text-slate-400 mt-1">Overdue: {openNCRs.filter(n => n.targetDate < "2026-06-08").length}건</p>
            </div>
            <div className="bg-white rounded-2xl border border-sky-200 p-5">
              <div className="flex items-center gap-2 mb-2">
                <FlaskConical className="w-4 h-4 text-sky-600" />
                <span className="text-xs font-bold text-sky-700">진행 중 시험</span>
              </div>
              <p className="text-4xl font-extrabold text-sky-600">{runningTests.length}</p>
              <p className="text-xs text-slate-400 mt-1">프로젝트: {[...new Set(runningTests.map(t => t.projectName))].length}개</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <p className="text-sm font-bold text-slate-700 mb-3">Risk Radar — 주요 위험 지표</p>
            <div className="space-y-2">
              {openNCRs.filter(n => n.targetDate < "2026-06-08").slice(0, 3).map(n => (
                <div key={n.id} className="flex items-start gap-2 p-3 bg-rose-50 rounded-xl">
                  <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-rose-700">[NCR Overdue] {n.id}</p>
                    <p className="text-xs text-slate-500">{n.title}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Team Leader View */}
      {role === "team_leader" && (
        <div className="space-y-4">
          <p className="text-xs font-bold text-indigo-600 uppercase tracking-wide">팀장 결재·승인 현황</p>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800">결재 대기 목록</h2>
              <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">3건 대기</span>
            </div>
            {[
              { id: "REQ-NCR-001", cat: "NCR 승인", title: "압출 3호기 알루미늄 피복 두께 편차 부적합보고서", requester: "송민섭 전임연구원", date: "2026-05-29" },
              { id: "REQ-TEST-002", cat: "시험성적 검토", title: "154kV 초고압 케이블 PD 전기 측정 성적서", requester: "박동현 선임연구원", date: "2026-05-28" },
              { id: "REQ-AUDIT-003", cat: "협력사 Audit", title: "동아케미칼 XLPE 원재료 공급라인 정밀 Audit", requester: "김우진 책임연구원", date: "2026-05-27" },
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
                  <button disabled className="px-3 py-1.5 text-xs font-bold bg-emerald-100 text-emerald-400 rounded-lg cursor-not-allowed" title="데모: 실제 승인 불가">
                    승인 (비활성)
                  </button>
                  <button disabled className="px-3 py-1.5 text-xs font-bold bg-rose-100 text-rose-400 rounded-lg cursor-not-allowed" title="데모: 실제 반려 불가">
                    반려 (비활성)
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Operator View */}
      {role === "operator" && (
        <div className="space-y-4">
          <p className="text-xs font-bold text-indigo-600 uppercase tracking-wide">실무자 — 내 업무</p>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-800">배정된 작업</h2>
            </div>
            {[
              { id: "OP-TASK-01", title: "초고압 케이블 PD 전기 측정 및 PRPD 패턴 매칭", cat: "검사/분석", status: "작성중", due: "2026-06-02" },
              { id: "OP-TASK-02", title: "Hipotronics 내전압 시험기 고전압 이상 펄스 원인 보고", cat: "보고서 작성", status: "작성중", due: "2026-05-31" },
              { id: "OP-TASK-03", title: "구미 DC2 설비 교정 오차 조치방안 수립 (NCR-2026-002)", cat: "NCR 조치", status: "검토대기", due: "2026-05-28" },
            ].map(task => (
              <div key={task.id} className="px-6 py-4 border-b border-slate-50 last:border-0 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{task.cat}</span>
                    <p className="text-sm font-semibold text-slate-800">{task.title}</p>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">기한 {task.due}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {task.status === "작성중" ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-sky-700 bg-sky-100 px-2.5 py-1 rounded-full">
                      <Clock className="w-3 h-3" />작성중
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full">
                      <CheckCircle className="w-3 h-3" />검토대기
                    </span>
                  )}
                  <button disabled className="text-[10px] font-bold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-lg cursor-not-allowed flex items-center gap-1" title="데모: 상신 불가">
                    결재 상신 <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
