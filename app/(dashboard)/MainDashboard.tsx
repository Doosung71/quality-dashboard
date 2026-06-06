"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { facilityData } from "@/data/facility.data";
import { assetData } from "@/data/assets.data";
import { claimsData } from "@/data/claims.data";
import { ncrsData } from "@/data/ncr.data";
import { qcostData } from "@/data/qcost.data";
import { vendorsData } from "@/data/vendors.data";
import { hrData } from "@/data/hr.data";
import { intelligenceData } from "@/data/intelligence.data";
import { testsData } from "@/data/tests.data";
import { OCCUPIED_TEST_STATUSES } from "@/lib/facilities-utils";
import { OnboardingModal } from "@/components/onboarding/OnboardingModal";
import {
  ShieldAlert,
  Globe,
  Users,
  ArrowRight,
  Gauge,
  Calendar,
  FileSearch,
  UserCheck,
  ClipboardList,
  CheckCircle,
  Clock,
  Briefcase,
  AlertCircle,
  ChevronRight,
  Wrench,
  FlaskConical,
  Truck
} from "lucide-react";

const TARGET_DATE = new Date("2026-09-15");

function roleToView(role: string): "executive" | "team_leader" | "operator" {
  if (role === "DIRECTOR") return "executive";
  if (role === "TEAM_LEAD") return "team_leader";
  return "operator";
}

interface Props {
  role: string;
  userName: string;
  userId: string;
}

export function MainDashboard({ role, userName, userId }: Props) {
  const [userRole, setUserRole] = useState<"executive" | "team_leader" | "operator">(
    () => roleToView(role)
  );

  const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });

  const dDay = useMemo(() => {
    const today = new Date(todayStr);
    const diffTime = TARGET_DATE.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }, [todayStr]);

  const [rejectModal, setRejectModal] = useState<{ taskId: string; reason: string } | null>(null);
  const [approvalToast, setApprovalToast] = useState<{ message: string; type: "approve" | "reject" } | null>(null);

  const [leaderPendingTasks, setLeaderPendingTasks] = useState([
    {
      id: "REQ-NCR-001",
      category: "NCR 승인",
      title: "압출 3호기 알루미늄 피복 두께 편차 부적합보고서",
      requester: "송민섭 전임연구원",
      date: "2026-05-29",
      details: "알루미늄 피복 두께 수치 통계 분석에 따른 Rework 승인 요청 건.",
      status: "pending"
    },
    {
      id: "REQ-TEST-002",
      category: "시험성적 검토",
      title: "154kV 초고압 케이블 PD(부분방전) 전기 측정 성적서",
      requester: "박동현 선임연구원",
      date: "2026-05-28",
      details: "PRPD 패턴 분석 완료에 따른 준공시험 결과 최종 리뷰 요청.",
      status: "pending"
    },
    {
      id: "REQ-AUDIT-003",
      category: "협력사 Audit",
      title: "동아케미칼 XLPE 원재료 공급라인 정밀 Audit 결과 보고",
      requester: "김우진 책임연구원",
      date: "2026-05-27",
      details: "이물 혼입 방지 대책 이행 확인 및 A등급 평가안 결재 요청.",
      status: "pending"
    }
  ]);

  const showToast = (message: string, type: "approve" | "reject") => {
    setApprovalToast({ message, type });
    setTimeout(() => setApprovalToast(null), 3000);
  };

  const handleLeaderApprove = (id: string) => {
    setLeaderPendingTasks(prev =>
      prev.map(t => t.id === id ? { ...t, status: "approved" } : t)
    );
    showToast(`${id} 건이 승인 처리되었습니다.`, "approve");
  };

  const handleLeaderReject = (id: string) => {
    setRejectModal({ taskId: id, reason: "" });
  };

  const handleRejectConfirm = () => {
    if (!rejectModal) return;
    const { taskId, reason } = rejectModal;
    setLeaderPendingTasks(prev =>
      prev.map(t => t.id === taskId ? { ...t, status: "rejected", rejectReason: reason.trim() } : t)
    );
    showToast(`${taskId} 건이 반려(조치 요구) 처리되었습니다.`, "reject");
    setRejectModal(null);
  };

  const [operatorMyTasks, setOperatorMyTasks] = useState([
    {
      id: "OP-TASK-01",
      title: "초고압 송배전 케이블 부분방전(PD) 전기 측정 및 PRPD 패턴 매칭",
      category: "검사/분석",
      status: "작성중",
      dueDate: "2026-06-02"
    },
    {
      id: "OP-TASK-02",
      title: "Hipotronics 내전압 시험기 고전압 이상 펄스 원인 보고",
      category: "보고서 작성",
      status: "작성중",
      dueDate: "2026-05-31"
    },
    {
      id: "OP-TASK-03",
      title: "구미 DC2 설비 교정 오차 조치방안 수립 (NCR-2026-002 배정 건)",
      category: "NCR 조치",
      status: "검토대기",
      dueDate: "2026-05-28"
    }
  ]);

  const handleOperatorRequestReview = (id: string) => {
    setOperatorMyTasks(prev =>
      prev.map(t => t.id === id ? { ...t, status: "검토대기" } : t)
    );
    alert(`${id} 작업이 팀장에게 검토 요청(결재 상신)되었습니다.`);
  };

  const stats = useMemo(() => {
    const totalEquipment = assetData.equipment.reduce((acc: number, eq: { quantity: number }) => acc + eq.quantity, 0);
    const totalHalls = facilityData.testHalls.length;
    const totalYards = facilityData.testYards.length;
    const totalFacilities = totalHalls + totalYards;
    const runningTests = testsData.tests.filter(t => (OCCUPIED_TEST_STATUSES as readonly string[]).includes(t.status)).length;

    const totalClaims = claimsData.claims.length;
    const unresolvedClaims = claimsData.claims.filter(c => c.status !== "Closed").length;
    const newClaimsThisMonth = claimsData.claims.filter(c => c.receivedAt.startsWith("2026-05")).length;

    const totalNCRs = ncrsData.ncrs.length;
    const openNCRs = ncrsData.ncrs.filter(n => n.status !== "Closed").length;
    const overdueNCRs = ncrsData.ncrs.filter(n => n.status !== "Closed" && n.targetDate < todayStr).length;

    const mayCost = qcostData.monthlyCosts.find(m => m.month === "2026-05") || {
      externalFailure: 0, internalFailure: 0, executionLoss: 0, appraisal: 0, prevention: 0
    };
    const totalQCost = mayCost.externalFailure + mayCost.internalFailure + mayCost.executionLoss + mayCost.appraisal + mayCost.prevention;
    const failureCost = mayCost.internalFailure + mayCost.externalFailure;
    const preventionCost = mayCost.prevention;

    const totalVendors = vendorsData.vendors.length;
    const gradeAVendors = vendorsData.vendors.filter(v => v.grade === "A").length;
    const warningVendors = vendorsData.vendors.filter(v => v.grade === "C" || v.grade === "D").length;

    const totalEmployees = hrData.employees.length;
    const highWorkloadEmployees = hrData.employees.filter(e => e.workload === "High").length;
    const totalInterviews = hrData.interviews.length;

    const totalIntelligence = intelligenceData.items.length;
    const highImpactIntelligence = intelligenceData.items.filter(i => i.impact === "High").length;

    return {
      totalEquipment, totalFacilities, runningTests,
      totalClaims, unresolvedClaims, newClaimsThisMonth,
      totalNCRs, openNCRs, overdueNCRs,
      totalQCost, failureCost, preventionCost,
      totalVendors, gradeAVendors, warningVendors,
      totalEmployees, highWorkloadEmployees, totalInterviews,
      totalIntelligence, highImpactIntelligence
    };
  }, [todayStr]);

  const alerts = useMemo(() => {
    const list: { id: string; type: "NCR" | "HR" | "INTEL"; title: string; desc: string; link: string }[] = [];
    ncrsData.ncrs.filter(n => n.status !== "Closed" && n.targetDate < todayStr).slice(0, 2).forEach(n => {
      list.push({ id: `alert-ncr-${n.id}`, type: "NCR", title: `[부적합 Overdue] ${n.id}`, desc: `${n.title} - 기한 경과 및 조치 지연 상태`, link: "/ncr" });
    });
    hrData.employees.filter(e => e.workload === "High").slice(0, 2).forEach(e => {
      list.push({ id: `alert-hr-${e.id}`, type: "HR", title: `[리소스 과부하] ${e.name} ${e.rank}`, desc: `${e.department} - 주요 업무 집중도 완화 및 긴급 면담 권고`, link: "/hr" });
    });
    intelligenceData.items.filter(i => i.impact === "High").slice(0, 2).forEach(i => {
      list.push({ id: `alert-intel-${i.id}`, type: "INTEL", title: `[외부 위협 요인] ${i.category}`, desc: i.title, link: "/intelligence" });
    });
    return list;
  }, [todayStr]);

  const displayName = userName || "사용자";

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* 반려 사유 입력 모달 */}
      {rejectModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-base">반려 사유 입력</h3>
              <p className="text-xs text-slate-500 mt-0.5">{rejectModal.taskId} 건 — 상신자에게 반려 사유가 전달됩니다.</p>
            </div>
            <div className="p-6 space-y-3">
              <textarea
                rows={4}
                autoFocus
                placeholder="반려 사유를 입력하세요. (예: 측정 데이터 첨부 누락, 원인 분석 불충분 등)"
                value={rejectModal.reason}
                onChange={e => setRejectModal(prev => prev ? { ...prev, reason: e.target.value } : null)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-400 text-sm transition-all resize-none"
              />
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex gap-2 justify-end">
              <button
                onClick={() => setRejectModal(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
              >
                취소
              </button>
              <button
                onClick={handleRejectConfirm}
                className="px-5 py-2 text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 rounded-xl transition-all"
              >
                반려 처리
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 승인/반려 토스트 */}
      {approvalToast && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-xl text-sm font-bold text-white transition-all animate-fade-in ${approvalToast.type === "approve" ? "bg-emerald-600" : "bg-rose-600"}`}>
          {approvalToast.message}
        </div>
      )}

      {/* 첫 로그인 환영 가이드 */}
      <OnboardingModal userId={userId} role={role} />

      {/* 역할 전환 — DIRECTOR만 노출 */}
      {role === "DIRECTOR" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* 헤더 + 역할 선택 버튼 */}
          <div className="px-5 py-3 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-black text-slate-700">역할별 뷰 미리보기 (관리자 전용)</span>
            </div>
            <div className="flex gap-1.5 text-xs">
              {(["executive", "team_leader", "operator"] as const).map((v) => {
                const isSelected = userRole === v
                return (
                  <button
                    key={v}
                    onClick={() => setUserRole(v)}
                    className={`px-4 py-1.5 rounded-lg font-bold transition-all border ${
                      isSelected
                        ? "bg-white text-indigo-700 border-indigo-400 shadow-sm ring-1 ring-indigo-300"
                        : "bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-400 hover:text-slate-700"
                    }`}
                  >
                    {v === "executive" ? "임원 / 부문장" : v === "team_leader" ? "팀장" : "실무자"}
                  </button>
                )
              })}
            </div>
          </div>

          {/* 권한 맵 */}
          <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-3">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2.5">섹션별 접근 권한</p>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: "대시보드",   executive: "full", team_leader: "full", operator: "full"     },
                { label: "품질비용관리", executive: "full", team_leader: "full", operator: "readonly" },
                { label: "클레임",     executive: "full", team_leader: "full", operator: "full"     },
                { label: "NCR",        executive: "full", team_leader: "full", operator: "full"     },
                { label: "입고품질관리", executive: "full", team_leader: "full", operator: "full"   },
                { label: "지식 관리",  executive: "full", team_leader: "full", operator: "full"     },
                { label: "시험·품질보증", executive: "full", team_leader: "full", operator: "full"  },
                { label: "입찰프로젝트", executive: "full", team_leader: "full", operator: "full"   },
                { label: "외부정보",   executive: "full", team_leader: "full", operator: "full"     },
                { label: "인사·면담", executive: "full", team_leader: "full", operator: "none"     },
              ].map(({ label, ...perms }) => {
                const level = perms[userRole as keyof typeof perms] as "full" | "readonly" | "none"
                return (
                  <span
                    key={label}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ${
                      level === "full"
                        ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                        : level === "readonly"
                        ? "bg-slate-100 text-slate-400 border-slate-200"
                        : "bg-slate-50 text-slate-300 border-slate-100 line-through"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      level === "full" ? "bg-indigo-500" : level === "readonly" ? "bg-slate-300" : "bg-slate-200"
                    }`} />
                    {label}
                    {level === "readonly" && <span className="text-[9px] font-bold ml-0.5">조회</span>}
                    {level === "none"     && <span className="text-[9px] font-bold ml-0.5">없음</span>}
                  </span>
                )
              })}
            </div>
            {/* 범례 */}
            <div className="flex items-center gap-4 mt-3 pt-2 border-t border-slate-100">
              <span className="flex items-center gap-1 text-[10px] text-slate-500">
                <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" /> 전체 권한
              </span>
              <span className="flex items-center gap-1 text-[10px] text-slate-400">
                <span className="w-2 h-2 rounded-full bg-slate-300 inline-block" /> 조회 전용
              </span>
              <span className="flex items-center gap-1 text-[10px] text-slate-300">
                <span className="w-2 h-2 rounded-full bg-slate-200 inline-block" /> 접근 불가
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── 임원 / 부문장 뷰 ── */}
      {userRole === "executive" && (
        <div className="space-y-8 animate-fade-in">
          <div className="bg-slate-950 text-white rounded-3xl p-6 md:p-8 border border-slate-900 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
            <div className="absolute right-0 top-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl -z-10" />
            <div className="absolute right-20 bottom-0 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl -z-10" />

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 bg-indigo-500/30 text-indigo-300 border border-indigo-500/20 rounded-md text-[10px] font-extrabold uppercase tracking-widest">
                  QMS 2.0 AX Platform — Executive View
                </span>
                <span className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                  <Calendar className="w-3.5 h-3.5" /> 2026-05-30 실시간
                </span>
              </div>
              <h2 className="text-xl md:text-2xl font-black tracking-tight">
                안녕하세요, <span className="text-indigo-400">{displayName}</span> 부문장님
              </h2>
              <p className="text-xs md:text-sm text-slate-400 max-w-xl">
                전 부서의 오프라인 작업을 박멸하고 시스템 내 업무 100% 완계를 지향합니다. 인공지능과 연동된 전사 품질 지표를 관제하십시오.
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4 shrink-0 shadow-inner w-full md:w-auto">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-sm shrink-0">
                D-{dDay}
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-slate-300">CEO 주관 품질전략기능회의</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">시연 목표: 2026-09-15</p>
                <div className="w-full md:w-36 bg-white/10 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full w-[85%]" />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-extrabold text-slate-400 tracking-wider uppercase flex items-center gap-1.5">
              <Gauge className="w-4 h-4 text-indigo-500" /> 품질 5대 핵심 영역 모니터링
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <Link href="/qcost" className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 flex flex-col justify-between group">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">① Q-Cost</span>
                  <h4 className="text-2xl font-bold text-emerald-600 mt-1">{Number(stats.totalQCost).toFixed(1)}M</h4>
                  <p className="text-[10px] text-slate-400">실패 {Number(stats.failureCost).toFixed(1)}M / 예방 {Number(stats.preventionCost).toFixed(1)}M</p>
                </div>
                <div className="flex justify-between items-center pt-4 border-t mt-4 text-[10px] text-indigo-600 font-bold">
                  <span>품질비용 이동</span><ArrowRight className="w-3.5 h-3.5" />
                </div>
              </Link>

              <Link href="/claims" className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 flex flex-col justify-between group">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">② 고객 클레임</span>
                  <h4 className="text-2xl font-bold text-slate-900 mt-1">{stats.unresolvedClaims}건</h4>
                  <p className="text-[10px] text-slate-400">미해결 클레임 (금월 {stats.newClaimsThisMonth}건)</p>
                </div>
                <div className="flex justify-between items-center pt-4 border-t mt-4 text-[10px] text-indigo-600 font-bold">
                  <span>클레임 이동</span><ArrowRight className="w-3.5 h-3.5" />
                </div>
              </Link>

              <Link href="/ncr" className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 flex flex-col justify-between group">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">③ NCR 부적합</span>
                    {stats.overdueNCRs > 0 && <span className="px-1.5 py-0.5 bg-rose-50 text-rose-600 border border-rose-100 rounded text-[8px] font-black animate-pulse">Overdue</span>}
                  </div>
                  <h4 className="text-2xl font-bold text-slate-900 mt-1">{stats.openNCRs}건</h4>
                  <p className="text-[10px] text-slate-400">미조치 NCR (기한초과 {stats.overdueNCRs}건)</p>
                </div>
                <div className="flex justify-between items-center pt-4 border-t mt-4 text-[10px] text-indigo-600 font-bold">
                  <span>NCR 조치판 이동</span><ArrowRight className="w-3.5 h-3.5" />
                </div>
              </Link>

              <Link href="/vendors" className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 flex flex-col justify-between group">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">④ 공급망관리</span>
                  <h4 className="text-2xl font-bold text-slate-900 mt-1">{stats.totalVendors}개사</h4>
                  <p className="text-[10px] text-slate-400">A등급 {stats.gradeAVendors}개사 / 경고 {stats.warningVendors}개사</p>
                </div>
                <div className="flex justify-between items-center pt-4 border-t mt-4 text-[10px] text-indigo-600 font-bold">
                  <span>공급망 이동</span><ArrowRight className="w-3.5 h-3.5" />
                </div>
              </Link>

              <Link href="/facilities" className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 flex flex-col justify-between group">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">⑤ 시험장·시험 현황</span>
                  <h4 className="text-2xl font-bold text-slate-900 mt-1">{stats.runningTests} / {stats.totalFacilities}</h4>
                  <p className="text-[10px] text-slate-400">진행중 시험 / 총 시험장동 ({stats.totalEquipment}대 설비)</p>
                </div>
                <div className="flex justify-between items-center pt-4 border-t mt-4 text-[10px] text-indigo-600 font-bold">
                  <span>시험장 이동</span><ArrowRight className="w-3.5 h-3.5" />
                </div>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-rose-500" /> 부문장 특별 지시 및 긴급 Alert ({alerts.length}건)
                  </h3>
                </div>
                <div className="space-y-3">
                  {alerts.map(item => (
                    <div key={item.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-all flex justify-between items-start gap-4 text-xs">
                      <div className="space-y-1">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold border ${item.type === "NCR" ? "bg-rose-50 text-rose-700 border-rose-100" : item.type === "HR" ? "bg-amber-50 text-amber-700 border-amber-100" : "bg-purple-50 text-purple-700 border-purple-100"}`}>{item.type}</span>
                        <h4 className="font-extrabold text-slate-900 mt-1">{item.title}</h4>
                        <p className="text-slate-500 font-medium leading-relaxed">{item.desc}</p>
                      </div>
                      <Link href={item.link} className="px-2.5 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg hover:border-slate-800 font-bold shrink-0 transition-all flex items-center gap-0.5">검토 <ArrowRight className="w-3 h-3" /></Link>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                <h4 className="text-xs font-extrabold text-slate-800 tracking-wide flex items-center gap-1.5 border-b pb-2"><Users className="w-4 h-4 text-indigo-500" /> 리소스 & 면담 현황</h4>
                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">부문 총원</span>
                    <span className="font-extrabold text-slate-900">{stats.totalEmployees}명</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">업무 과부하 경고</span>
                    <span className="font-extrabold text-rose-600">{stats.highWorkloadEmployees}명</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-indigo-950 to-slate-950 text-white p-6 rounded-2xl border border-indigo-900/50 shadow-md flex flex-col justify-between">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <FileSearch className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-black mt-2">입찰 검토 AI 어시스턴트</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                  송배전/해저 케이블 입찰 규격서(ITB) 내 독소 조항과 보증 한계치 위반 리스크를 AI가 자동 판독하고 분석서를 도출합니다.
                </p>
              </div>
              <div className="pt-6">
                <Link href="/dashboard" className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-center font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all text-white">
                  입찰 비서 실행 <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            <div className="bg-gradient-to-br from-teal-950 to-slate-950 text-white p-6 rounded-2xl border border-teal-900/50 shadow-md flex flex-col justify-between">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
                  <Globe className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-black mt-2">IEC / CIGRE 지식 RAG 검색</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                  Obsidian PKM 지식베이스와 Neon pgvector를 연동하여 케이블 PD 측정, 가속수명 시험 합격기준을 자연어로 검색합니다.
                </p>
              </div>
              <div className="pt-6">
                <Link href="/knowledge" className="w-full py-2 bg-teal-600 hover:bg-teal-500 text-center font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all text-white">
                  자연어 지식 검색 실행 <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 팀장 뷰 ── */}
      {userRole === "team_leader" && (
        <div className="space-y-8 animate-fade-in">
          <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-3xl p-6 md:p-8 border border-slate-800 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-2">
              <span className="px-2.5 py-0.5 bg-indigo-500/30 text-indigo-300 border border-indigo-500/20 rounded-md text-[10px] font-extrabold uppercase tracking-widest">
                Team Leader View — 지중가공QA팀
              </span>
              <h2 className="text-xl md:text-2xl font-black tracking-tight">
                안녕하세요, <span className="text-indigo-400">{displayName}</span> 팀장님
              </h2>
              <p className="text-xs md:text-sm text-slate-400">
                소속 팀원들이 작성한 규격, 검사 이력, 검토 요청 문서를 승인하고 팀원의 시험장 가동 부하도를 제어합니다.
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-sm shrink-0">
                {leaderPendingTasks.filter(t => t.status === "pending").length}건
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-slate-300">검토/결재 대기</h4>
                <p className="text-[9px] text-slate-500 mt-0.5">승인 대기 건 조치 필요</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center">
              <div>
                <p className="font-bold text-slate-400">팀 소속 가동 시험</p>
                <h3 className="text-xl font-bold mt-1 text-slate-900">3 / 4건</h3>
                <p className="text-[10px] text-emerald-500 mt-1">▲ Gumi DC실 정상 시험 진행중</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center"><Briefcase className="w-5 h-5" /></div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center">
              <div>
                <p className="font-bold text-slate-400">팀내 미해결 NCR</p>
                <h3 className="text-xl font-bold mt-1 text-rose-600">2건</h3>
                <p className="text-[10px] text-slate-400 mt-1">DC2 교정오차 검토 완료 단계</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center"><AlertCircle className="w-5 h-5" /></div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center">
              <div>
                <p className="font-bold text-slate-400">팀원 과부하 인원</p>
                <h3 className="text-xl font-bold mt-1 text-amber-600">1명 (홍경민 수석)</h3>
                <p className="text-[10px] text-slate-400 mt-1">하반기 보강인력 배치 조율중</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center"><Users className="w-5 h-5" /></div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <div className="border-b pb-3 flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-indigo-500" /> 팀원 결재/검토 요청 수신함
                </h3>
                <span className="text-[10px] font-bold text-slate-400">결재 처리 시 이력이 기록됩니다</span>
              </div>
              <div className="space-y-4">
                {leaderPendingTasks.filter(t => t.status === "pending").length === 0 ? (
                  <div className="text-center py-12 text-slate-400 font-medium">
                    <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                    모든 팀원 검토요청 결재가 종결되었습니다.
                  </div>
                ) : (
                  leaderPendingTasks.filter(t => t.status === "pending").map(task => (
                    <div key={task.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-all space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded text-[9px] font-extrabold uppercase">{task.category}</span>
                          <span className="font-bold text-slate-900">{task.title}</span>
                        </div>
                        <span className="text-[9px] font-mono text-slate-400">{task.date}</span>
                      </div>
                      <p className="text-slate-500 font-medium leading-relaxed">{task.details}</p>
                      <div className="flex justify-between items-center pt-2 border-t border-slate-100 mt-2">
                        <span className="text-[10px] text-slate-400">상신자: <strong className="text-slate-700 font-bold">{task.requester}</strong></span>
                        <div className="flex gap-2">
                          <button onClick={() => handleLeaderReject(task.id)} className="px-2.5 py-1.5 bg-white border border-slate-200 text-rose-600 hover:border-rose-300 font-bold rounded-lg transition-all">반려</button>
                          <button onClick={() => handleLeaderApprove(task.id)} className="px-3 py-1.5 bg-slate-950 text-white font-bold rounded-lg hover:bg-slate-800 transition-all">승인/리뷰완료</button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <h4 className="text-xs font-extrabold text-slate-800 tracking-wide flex items-center gap-1.5 border-b pb-2">
                <Users className="w-4 h-4 text-indigo-500" /> 지중가공QA팀원 리소스 풀
              </h4>
              <div className="space-y-3">
                {hrData.employees.filter(e => e.department === "지중가공QA팀").map(emp => (
                  <div key={emp.id} className="p-3 rounded-xl border border-slate-50 bg-slate-50/30 flex justify-between items-center text-xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900">{emp.name}</span>
                        <span className="text-[9px] text-slate-500 font-medium">{emp.rank}</span>
                      </div>
                      <p className="text-[9px] text-slate-400 truncate max-w-[150px]">{emp.role}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${emp.workload === "High" ? "bg-rose-50 text-rose-700 border-rose-100 animate-pulse font-extrabold" : "bg-slate-50 text-slate-600 border-slate-200"}`}>
                      {emp.workload === "High" ? "과부하" : "보통"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 실무자 뷰 ── */}
      {userRole === "operator" && (
        <div className="space-y-8 animate-fade-in">
          <div className="bg-gradient-to-r from-slate-900 to-indigo-900 text-white rounded-3xl p-6 md:p-8 border border-slate-800 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-2">
              <span className="px-2.5 py-0.5 bg-indigo-500/30 text-indigo-300 border border-indigo-500/20 rounded-md text-[10px] font-extrabold uppercase tracking-widest">
                My Active Workbench — 지중가공QA팀
              </span>
              <h2 className="text-xl md:text-2xl font-black tracking-tight">
                안녕하세요, <span className="text-indigo-400">{displayName}</span> 님
              </h2>
              <p className="text-xs md:text-sm text-slate-400">
                전기 부분방전(PD) 측정 및 시험 결과 보고서를 작성하고, 배정된 부적합(NCR) 조치 계획을 관리해 팀장에게 검토 요청을 보냅니다.
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex gap-4 text-xs">
              <div className="space-y-0.5">
                <span className="opacity-75">내 진행 업무</span>
                <h4 className="text-xl font-bold">{operatorMyTasks.filter(t => t.status === "작성중").length}건 작성중</h4>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <div className="border-b pb-3 flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-indigo-500" /> 내 품질 업무 및 검토 요청 현황
                </h3>
                <span className="text-[10px] text-slate-400">작성 후 팀장에게 검토 요청하십시오</span>
              </div>
              <div className="space-y-3.5">
                {operatorMyTasks.map(task => (
                  <div key={task.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex justify-between items-center text-xs gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded font-bold text-[9px] text-slate-600">{task.category}</span>
                        <h4 className="font-extrabold text-slate-900">{task.title}</h4>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-slate-400">
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> 기한: {task.dueDate}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`px-2 py-1 rounded-lg font-bold border text-[9px] flex items-center gap-1 ${task.status === "작성중" ? "bg-amber-50 text-amber-700 border-amber-200" : task.status === "검토대기" ? "bg-indigo-50 text-indigo-700 border-indigo-200 animate-pulse font-extrabold" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>
                        {task.status === "작성중" ? "작성중" : "팀장 검토중"}
                      </span>
                      {task.status === "작성중" && (
                        <button onClick={() => handleOperatorRequestReview(task.id)} className="px-2.5 py-1.5 bg-slate-950 text-white font-bold rounded-lg hover:bg-slate-800 transition-all">
                          검토 요청
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                <h4 className="text-xs font-extrabold text-slate-800 tracking-wide border-b pb-2 flex items-center gap-1.5">
                  <ClipboardList className="w-4 h-4 text-indigo-500" /> 실무자 퀵 링크
                </h4>
                <div className="space-y-3 text-xs">

                  {/* 품질 비용 관리 */}
                  <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">품질 비용 관리</p>
                  <div className="space-y-1.5">
                    <Link href="/claims" className="flex items-center justify-between p-2.5 bg-blue-50 hover:bg-blue-100 border border-blue-100 hover:border-blue-300 rounded-xl group transition-all">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <div>
                          <p className="font-bold text-slate-900 leading-tight">고객 클레임</p>
                          <p className="text-[9px] text-slate-400">접수·조사·대책·검증·종결</p>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-blue-300 group-hover:translate-x-1 transition-transform shrink-0" />
                    </Link>
                    <Link href="/ncr" className="flex items-center justify-between p-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-100 hover:border-rose-300 rounded-xl group transition-all">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <div>
                          <p className="font-bold text-slate-900 leading-tight">부적합품 (NCR)</p>
                          <p className="text-[9px] text-slate-400">발행·처리방안·시정조치·검증</p>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-rose-300 group-hover:translate-x-1 transition-transform shrink-0" />
                    </Link>
                  </div>

                  {/* 자산 관리 */}
                  <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest pt-1">자산 관리</p>
                  <div className="space-y-1.5">
                    <Link href="/assets" className="flex items-center justify-between p-2.5 bg-amber-50 hover:bg-amber-100 border border-amber-100 hover:border-amber-300 rounded-xl group transition-all">
                      <div className="flex items-center gap-2">
                        <Wrench className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <div>
                          <p className="font-bold text-slate-900 leading-tight">자산 관리</p>
                          <p className="text-[9px] text-slate-400">설비·자산 현황 조회</p>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-amber-300 group-hover:translate-x-1 transition-transform shrink-0" />
                    </Link>
                  </div>

                  {/* 입고품질관리 */}
                  <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest pt-1">입고품질관리</p>
                  <div className="space-y-1.5">
                    <Link href="/vendors/incoming" className="flex items-center justify-between p-2.5 bg-sky-50 hover:bg-sky-100 border border-sky-100 hover:border-sky-300 rounded-xl group transition-all">
                      <div className="flex items-center gap-2">
                        <Truck className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                        <div>
                          <p className="font-bold text-slate-900 leading-tight">수입검사</p>
                          <p className="text-[9px] text-slate-400">자재 입고 검사 결과 등록·조회</p>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-sky-300 group-hover:translate-x-1 transition-transform shrink-0" />
                    </Link>
                    <Link href="/vendors/inspections" className="flex items-center justify-between p-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 hover:border-emerald-300 rounded-xl group transition-all">
                      <div className="flex items-center gap-2">
                        <FlaskConical className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <div>
                          <p className="font-bold text-slate-900 leading-tight">출장검사</p>
                          <p className="text-[9px] text-slate-400">협력사 현장 출장 검사 결과 등록</p>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-emerald-300 group-hover:translate-x-1 transition-transform shrink-0" />
                    </Link>
                    <Link href="/vendors/audits" className="flex items-center justify-between p-2.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 hover:border-indigo-300 rounded-xl group transition-all">
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <div>
                          <p className="font-bold text-slate-900 leading-tight">협력업체 감사</p>
                          <p className="text-[9px] text-slate-400">Supplier Audit 결과 등록·이력</p>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-indigo-300 group-hover:translate-x-1 transition-transform shrink-0" />
                    </Link>
                  </div>

                  {/* 프로젝트 관리 */}
                  <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest pt-1">프로젝트 관리</p>
                  <div className="space-y-1.5">
                    <Link href="/dashboard" className="flex items-center justify-between p-2.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 hover:border-indigo-300 rounded-xl group transition-all">
                      <div className="flex items-center gap-2">
                        <FileSearch className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <div>
                          <p className="font-bold text-slate-900 leading-tight">입찰 프로젝트</p>
                          <p className="text-[9px] text-slate-400">독소조항 자동 분석</p>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-indigo-300 group-hover:translate-x-1 transition-transform shrink-0" />
                    </Link>
                    <Link href="/projects/awarded?create=1" className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-400 rounded-xl group transition-all">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <div>
                          <p className="font-bold text-slate-900 leading-tight">수주 프로젝트</p>
                          <p className="text-[9px] text-slate-400">수주 프로젝트 현황 관리</p>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:translate-x-1 transition-transform shrink-0" />
                    </Link>
                  </div>

                  {/* 시험 및 품질 보증 */}
                  <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest pt-1">시험 및 품질 보증</p>
                  <div className="space-y-1.5">
                    <Link href="/facilities" className="flex items-center justify-between p-2.5 bg-violet-50 hover:bg-violet-100 border border-violet-100 hover:border-violet-300 rounded-xl group transition-all">
                      <div className="flex items-center gap-2">
                        <FlaskConical className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                        <div>
                          <p className="font-bold text-slate-900 leading-tight">시험 장비·계획·결과</p>
                          <p className="text-[9px] text-slate-400">시험 현황 및 성적서 관리</p>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-violet-300 group-hover:translate-x-1 transition-transform shrink-0" />
                    </Link>
                  </div>

                  {/* 지식 관리 */}
                  <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest pt-1">지식 관리</p>
                  <div className="space-y-1.5">
                    <Link href="/knowledge" className="flex items-center justify-between p-2.5 bg-teal-50 hover:bg-teal-100 border border-teal-100 hover:border-teal-300 rounded-xl group transition-all">
                      <div className="flex items-center gap-2">
                        <Globe className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                        <div>
                          <p className="font-bold text-slate-900 leading-tight">지식 관리</p>
                          <p className="text-[9px] text-slate-400">IEC·KS 규격 RAG 검색</p>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-teal-300 group-hover:translate-x-1 transition-transform shrink-0" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
