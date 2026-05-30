"use client";

import { useMemo } from "react";
import Link from "next/link";
import { facilityData } from "@/data/facility.data";
import { claimsData } from "@/data/claims.data";
import { ncrsData } from "@/data/ncr.data";
import { qcostData } from "@/data/qcost.data";
import { vendorsData } from "@/data/vendors.data";
import { hrData } from "@/data/hr.data";
import { intelligenceData } from "@/data/intelligence.data";
import { testsData } from "@/data/tests.data";
import {
  ShieldAlert,
  Globe,
  Users,
  ArrowRight,
  Gauge,
  Calendar,
  HelpCircle,
  FileSearch
} from "lucide-react";

// 상수는 렌더링 스코프 밖에 두어 불필요한 메모이제이션 의존성 제거
const TARGET_DATE = new Date("2026-09-15"); // CEO 주관 품질전략기능회의 예정일

export default function MainDashboard() {
  // 오늘 날짜 고정 (2026-05-30)
  const todayStr = "2026-05-30";
  
  // 마일스톤 D-Day 계산
  const dDay = useMemo(() => {
    const today = new Date(todayStr);
    const diffTime = TARGET_DATE.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }, []);

  // 각 데이터 요약 통계 계산
  const stats = useMemo(() => {
    // 1. 시험장 & 시험 현황 (testsData와 facilityData 활용)
    const totalEquipment = facilityData.equipment.reduce((acc, eq) => acc + eq.quantity, 0);
    const totalHalls = facilityData.testHalls.length;
    const totalYards = facilityData.testYards.length;
    const totalFacilities = totalHalls + totalYards; // 총 시험시설 수 (실험동 + 야외시험장)
    const runningTests = testsData.tests.filter(t => t.status === "시험중").length;

    // 2. 고객 클레임
    const totalClaims = claimsData.claims.length;
    const unresolvedClaims = claimsData.claims.filter(c => c.status !== "Closed").length;
    const newClaimsThisMonth = claimsData.claims.filter(c => c.receivedAt.startsWith("2026-05")).length;

    // 3. NCR 부적합
    const totalNCRs = ncrsData.ncrs.length;
    const openNCRs = ncrsData.ncrs.filter(n => n.status !== "Closed").length;
    const overdueNCRs = ncrsData.ncrs.filter(n => n.status !== "Closed" && n.targetDate < todayStr).length;

    // 4. Q-Cost
    const mayCost = qcostData.monthlyCosts.find(m => m.month === "2026-05") || {
      externalFailure: 0,
      internalFailure: 0,
      executionLoss: 0,
      appraisal: 0,
      prevention: 0
    };
    const totalQCost = mayCost.externalFailure + mayCost.internalFailure + mayCost.executionLoss + mayCost.appraisal + mayCost.prevention;
    const failureCost = mayCost.internalFailure + mayCost.externalFailure;
    const preventionCost = mayCost.prevention;

    // 5. 협력업체
    const totalVendors = vendorsData.vendors.length;
    const gradeAVendors = vendorsData.vendors.filter(v => v.grade === "A").length;
    const warningVendors = vendorsData.vendors.filter(v => v.grade === "C" || v.grade === "D").length;

    // 6. 인사/면담
    const totalEmployees = hrData.employees.length;
    const highWorkloadEmployees = hrData.employees.filter(e => e.workload === "High").length;
    const totalInterviews = hrData.interviews.length;

    // 7. 외부정보
    const totalIntelligence = intelligenceData.items.length;
    const highImpactIntelligence = intelligenceData.items.filter(i => i.impact === "High").length;

    return {
      totalEquipment,
      totalFacilities,
      runningTests,
      totalClaims,
      unresolvedClaims,
      newClaimsThisMonth,
      totalNCRs,
      openNCRs,
      overdueNCRs,
      totalQCost,
      failureCost,
      preventionCost,
      totalVendors,
      gradeAVendors,
      warningVendors,
      totalEmployees,
      highWorkloadEmployees,
      totalInterviews,
      totalIntelligence,
      highImpactIntelligence
    };
  }, []);

  // 주요 긴급 Alert 추출
  const alerts = useMemo(() => {
    const list: { id: string; type: "NCR" | "HR" | "INTEL"; title: string; desc: string; link: string }[] = [];
    
    // NCR Overdue 건 추가
    ncrsData.ncrs.filter(n => n.status !== "Closed" && n.targetDate < todayStr).slice(0, 2).forEach(n => {
      list.push({
        id: `alert-ncr-${n.id}`,
        type: "NCR",
        title: `[부적합 Overdue] ${n.id}`,
        desc: `${n.title} - 기한 경과 및 조치 지연 상태`,
        link: "/ncr"
      });
    });

    // HR 고부하 인원 추가
    hrData.employees.filter(e => e.workload === "High").slice(0, 2).forEach(e => {
      list.push({
        id: `alert-hr-${e.id}`,
        type: "HR",
        title: `[리소스 과부하] ${e.name} ${e.rank}`,
        desc: `${e.department} - 주요 업무 집중도 완화 및 긴급 면담 권고`,
        link: "/hr"
      });
    });

    // 외부정보 High Impact 요인 추가
    intelligenceData.items.filter(i => i.impact === "High").slice(0, 2).forEach(i => {
      list.push({
        id: `alert-intel-${i.id}`,
        type: "INTEL",
        title: `[외부 위협 요인] ${i.category}`,
        desc: i.title,
        link: "/intelligence"
      });
    });

    return list;
  }, []);

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* 최상단 Welcome & 마일스톤 현황 */}
      <div className="bg-slate-950 text-white rounded-3xl p-6 md:p-8 border border-slate-900 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
        {/* 장식 배경 */}
        <div className="absolute right-0 top-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl -z-10" />
        <div className="absolute right-20 bottom-0 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl -z-10" />

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-indigo-500/30 text-indigo-300 border border-indigo-500/20 rounded-md text-[10px] font-extrabold uppercase tracking-widest">
              QMS 2.0 AX Platform
            </span>
            <span className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
              <Calendar className="w-3.5 h-3.5" /> 2026-05-30 실시간
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-black tracking-tight">
            안녕하세요, 품질부문장 <span className="text-indigo-400">Dennis</span> 님
          </h2>
          <p className="text-xs md:text-sm text-slate-400 max-w-xl">
            전 부서의 오프라인 작업을 박멸하고 시스템 내 업무 100% 완계를 지향합니다. 인공지능과 연동된 최신 품질 동향 및 리스크 리포트를 확인하십시오.
          </p>
        </div>

        {/* CEO 시연 D-Day 위젯 */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4.5 flex items-center gap-4 shrink-0 shadow-inner w-full md:w-auto">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-sm shrink-0">
            D-{dDay}
          </div>
          <div>
            <h4 className="text-xs font-extrabold text-slate-300">CEO 주관 품질전략기능회의</h4>
            <p className="text-[10px] text-slate-400 mt-0.5">남은 시연 일정 목표: 2026-09-15</p>
            {/* 진척 바 */}
            <div className="w-full md:w-36 bg-white/10 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full w-[85%]" />
            </div>
            <div className="flex justify-between items-center text-[8px] text-slate-500 mt-1">
              <span>진척도 85%</span>
              <span>최종 통합 중</span>
            </div>
          </div>
        </div>
      </div>

      {/* 5대 품질 영역 KPI 개요 */}
      <div className="space-y-3">
        <h3 className="text-xs font-extrabold text-slate-400 tracking-wider uppercase flex items-center gap-1.5">
          <Gauge className="w-4 h-4 text-indigo-500" /> 품질 5대 핵심 영역 모니터링
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          
          {/* 1. 시험장 & 시험 현황 */}
          <Link href="/facilities" className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 flex flex-col justify-between group">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">① 시험 현황</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 group-hover:animate-pulse" />
              </div>
              <h4 className="text-2xl font-bold text-slate-900 mt-1">{stats.runningTests} / {stats.totalFacilities}</h4>
              <p className="text-[10px] text-slate-400">진행중 시험 / 총 시험장동 ({stats.totalEquipment}대 설비)</p>
            </div>
            <div className="flex justify-between items-center pt-4 border-t border-slate-50 mt-4 text-[10px] text-indigo-600 font-bold group-hover:text-indigo-800">
              <span>시험장 이동</span>
              <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* 2. 고객 클레임 */}
          <Link href="/claims" className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 flex flex-col justify-between group">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">② 고객 클레임</span>
                {stats.unresolvedClaims > 0 && <span className="w-2 h-2 rounded-full bg-rose-500" />}
              </div>
              <h4 className="text-2xl font-bold text-slate-900 mt-1">{stats.unresolvedClaims}건</h4>
              <p className="text-[10px] text-slate-400">미해결 클레임 (금월 {stats.newClaimsThisMonth}건)</p>
            </div>
            <div className="flex justify-between items-center pt-4 border-t border-slate-50 mt-4 text-[10px] text-indigo-600 font-bold group-hover:text-indigo-800">
              <span>클레임 이동</span>
              <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* 3. NCR 부적합보고 */}
          <Link href="/ncr" className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 flex flex-col justify-between group">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">③ NCR 부적합</span>
                {stats.overdueNCRs > 0 && (
                  <span className="px-1.5 py-0.5 bg-rose-50 text-rose-600 border border-rose-100 rounded text-[8px] font-black animate-pulse">
                    Overdue
                  </span>
                )}
              </div>
              <h4 className="text-2xl font-bold text-slate-900 mt-1">{stats.openNCRs}건</h4>
              <p className="text-[10px] text-slate-400">미조치 NCR (기한초과 {stats.overdueNCRs}건)</p>
            </div>
            <div className="flex justify-between items-center pt-4 border-t border-slate-50 mt-4 text-[10px] text-indigo-600 font-bold group-hover:text-indigo-800">
              <span>NCR 조치판 이동</span>
              <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* 4. 품질 비용 (Q-Cost) */}
          <Link href="/qcost" className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 flex flex-col justify-between group">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">④ Q-Cost</span>
                <span className="text-[8px] font-bold text-slate-500">5월 누계</span>
              </div>
              <h4 className="text-2xl font-bold text-emerald-600 mt-1">{stats.totalQCost}M</h4>
              <p className="text-[10px] text-slate-400">실패 {stats.failureCost}M / 예방 {stats.preventionCost}M</p>
            </div>
            <div className="flex justify-between items-center pt-4 border-t border-slate-50 mt-4 text-[10px] text-indigo-600 font-bold group-hover:text-indigo-800">
              <span>품질비용 이동</span>
              <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* 5. 협력업체 관리 */}
          <Link href="/vendors" className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 flex flex-col justify-between group">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">⑤ 협력사 관리</span>
                <span className="text-[8px] font-bold text-amber-600 font-mono">D-Grade {stats.warningVendors}</span>
              </div>
              <h4 className="text-2xl font-bold text-slate-900 mt-1">{stats.totalVendors}개사</h4>
              <p className="text-[10px] text-slate-400">A등급 {stats.gradeAVendors}개사 / 경고 {stats.warningVendors}개사</p>
            </div>
            <div className="flex justify-between items-center pt-4 border-t border-slate-50 mt-4 text-[10px] text-indigo-600 font-bold group-hover:text-indigo-800">
              <span>협력사 카드 풀</span>
              <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

        </div>
      </div>

      {/* Split Layout: 좌측 Critical Alerts / 우측 인적 리소스 & 외부동향 피드 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 좌측: 실시간 긴급 Alert & 행동 지침 보드 */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-500" /> 부문장 특별 지시 및 긴급 Alert ({alerts.length}건)
              </h3>
              <span className="px-2 py-0.5 bg-rose-50 text-rose-600 border border-rose-100 rounded text-[9px] font-extrabold animate-pulse">
                즉시 조치 권고
              </span>
            </div>

            <div className="space-y-3">
              {alerts.map(item => (
                <div key={item.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-all flex justify-between items-start gap-4 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold border ${
                        item.type === "NCR" ? "bg-rose-50 text-rose-700 border-rose-100" :
                        item.type === "HR" ? "bg-amber-50 text-amber-700 border-amber-100" :
                        "bg-purple-50 text-purple-700 border-purple-100"
                      }`}>
                        {item.type}
                      </span>
                      <h4 className="font-extrabold text-slate-900">{item.title}</h4>
                    </div>
                    <p className="text-slate-500 font-medium leading-relaxed">{item.desc}</p>
                  </div>
                  
                  <Link href={item.link} className="px-2.5 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg hover:border-slate-800 font-bold tracking-tight shrink-0 transition-all flex items-center gap-0.5">
                    검토 <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* AI 어시스턴트 & PKM 지식 RAG 허브 바로가기 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* 1. 입찰 검토 AI 비서 */}
            <div className="bg-gradient-to-br from-indigo-950 to-slate-950 text-white p-6 rounded-2xl border border-indigo-900/50 shadow-md relative overflow-hidden flex flex-col justify-between group">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <FileSearch className="w-5.5 h-5.5" />
                </div>
                <h4 className="text-sm font-black mt-2">입찰 검토 AI 어시스턴트</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                  송배전/해저 케이블 입찰 규격서(ITB) 내 독소 조항과 보증 한계치 위반 리스크를 AI가 자동 판독하고 분석서를 도출합니다.
                </p>
              </div>
              <div className="pt-6">
                <a 
                  href="http://localhost:3000/dashboard" 
                  target="_blank" 
                  rel="noreferrer" 
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-center font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all text-white"
                >
                  입찰 비서 실행 (3000포트) <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* 2. RAG 지식 검색 */}
            <div className="bg-gradient-to-br from-teal-950 to-slate-950 text-white p-6 rounded-2xl border border-teal-900/50 shadow-md relative overflow-hidden flex flex-col justify-between group">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
                  <Globe className="w-5.5 h-5.5" />
                </div>
                <h4 className="text-sm font-black mt-2">IEC / CIGRE 지식 RAG 검색</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                  Obsidian PKM 지식베이스와 Neon pgvector를 연동하여 케이블 PD 측정, 가속수명 시험 합격기준을 자연어로 검색합니다.
                </p>
              </div>
              <div className="pt-6">
                <Link 
                  href="/knowledge" 
                  className="w-full py-2 bg-teal-600 hover:bg-teal-500 text-center font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all text-white"
                >
                  자연어 지식 검색 실행 <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

          </div>
        </div>

        {/* 우측: 인적 리소스 현황 및 외부 최신 동향 피드 요약 */}
        <div className="space-y-6">
          
          {/* 인사/면담 관리 요약 */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-xs font-extrabold text-slate-800 tracking-wide flex items-center gap-1.5">
                <Users className="w-4 h-4 text-indigo-500" /> 리소스 & 면담 현황
              </h4>
              <Link href="/hr" className="text-[10px] text-slate-400 font-extrabold hover:text-slate-600">
                전체보기
              </Link>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-500 font-medium">부문 총원</span>
                <span className="font-extrabold text-slate-900">{stats.totalEmployees}명</span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-500 font-medium">업무 과부하 경고</span>
                <span className="font-extrabold text-rose-600">{stats.highWorkloadEmployees}명</span>
              </div>
              <div className="flex justify-between items-center text-[11px] pb-2 border-b border-slate-50">
                <span className="text-slate-500 font-medium">최근 등록된 면담</span>
                <span className="font-extrabold text-indigo-600">{stats.totalInterviews}건</span>
              </div>

              {/* 과부하 직원 2인 노출 */}
              <div className="space-y-1.5 pt-1">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">긴급 케어 대상자</p>
                {hrData.employees.filter(e => e.workload === "High").slice(0, 2).map(emp => (
                  <div key={emp.id} className="p-2 bg-rose-50/50 border border-rose-100/50 rounded-lg flex justify-between items-center text-[10px]">
                    <div className="space-y-0.5">
                      <p className="font-bold text-rose-950">{emp.name} {emp.rank}</p>
                      <p className="text-rose-600 font-semibold">{emp.department}</p>
                    </div>
                    <Link href="/hr" className="text-[9px] bg-rose-600 text-white font-extrabold px-2 py-1 rounded">
                      면담
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 외부 동향 최신 피드 2선 */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-xs font-extrabold text-slate-800 tracking-wide flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-emerald-500" /> 외부 최신 정보 피드
              </h4>
              <Link href="/intelligence" className="text-[10px] text-slate-400 font-extrabold hover:text-slate-600">
                전체보기
              </Link>
            </div>

            <div className="space-y-3">
              {intelligenceData.items.slice(0, 2).map(item => (
                <div key={item.id} className="space-y-1.5 text-xs pb-3 border-b border-slate-50 last:border-b-0 last:pb-0">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[8px] font-bold">
                      {item.category}
                    </span>
                    <span className="text-[8px] font-mono text-slate-400">{item.date}</span>
                  </div>
                  <h5 className="font-bold text-slate-900 leading-snug hover:text-indigo-600 transition-colors">
                    <Link href="/intelligence">{item.title}</Link>
                  </h5>
                  <p className="text-[10px] text-slate-500 font-medium line-clamp-2 leading-relaxed">
                    {item.summary}
                  </p>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* 시스템 도움말 헬프 데스크 바로가기 */}
      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/50 flex justify-between items-center text-xs">
        <div className="flex items-center gap-2.5">
          <HelpCircle className="w-5 h-5 text-slate-400 shrink-0" />
          <div>
            <h4 className="font-extrabold text-slate-800">QMS 2.0 AX 플랫폼 사용법이 궁금하십니까?</h4>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5">각 화면의 기능 및 AI 분석 가이드에 접근하려면 사용자 메뉴얼을 읽으십시오.</p>
          </div>
        </div>
        <Link href="/help" className="px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-800 font-extrabold rounded-lg text-slate-700 shrink-0 transition-all">
          도움말 보기
        </Link>
      </div>
    </div>
  );
}
