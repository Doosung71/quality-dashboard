"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import type { Vendor, VendorsData, VendorCategory, VendorGrade, VendorStatus, QualityIssueItem } from "@/types/vendor";
import {
  Building2,
  Search,
  MapPin,
  TrendingUp,
  Calendar,
  Award,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  SlidersHorizontal,
  LucideIcon,
  X,
  Users,
  Factory,
  BarChart3,
  Wrench,
  ClipboardList,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Phone,
  Landmark,
  GitBranch,
} from "lucide-react";

interface VendorsViewProps {
  data: VendorsData;
}

// ─── 등급·상태 스타일 헬퍼 ─────────────────────────────────

const gradeStyles: Record<VendorGrade, { bg: string; text: string; border: string; dot: string }> = {
  A: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-500", dot: "bg-emerald-500" },
  B: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-400", dot: "bg-amber-400" },
  C: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-400", dot: "bg-rose-500" },
  D: { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-400", dot: "bg-slate-500" },
};

const statusBadges: Record<VendorStatus, { label: string; style: string; icon: LucideIcon }> = {
  NORMAL: { label: "정상", style: "bg-emerald-100 text-emerald-800", icon: CheckCircle2 },
  WARNING: { label: "경고", style: "bg-amber-100 text-amber-800", icon: AlertTriangle },
  CRITICAL: { label: "위험", style: "bg-rose-100 text-rose-800", icon: ShieldAlert },
};

const gradeEvalStyle = (grade: string) => {
  if (grade === "A") return "text-emerald-700 bg-emerald-50 border border-emerald-200";
  if (grade === "B") return "text-amber-700 bg-amber-50 border border-amber-200";
  if (grade === "C") return "text-rose-700 bg-rose-50 border border-rose-200";
  return "text-slate-700 bg-slate-50 border border-slate-200";
};

// ─── 품질 이슈 행 컴포넌트 ─────────────────────────────────

function IssueRow({ issue }: { issue: QualityIssueItem }) {
  const [showAI, setShowAI] = useState(false);

  return (
    <div className="border border-slate-100 rounded-xl overflow-hidden">
      <div className="px-4 py-3 bg-white space-y-1">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold text-slate-400">#{issue.id} · {issue.date}</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">{issue.defectType}</span>
            <span className="text-xs font-semibold text-slate-700">{issue.customer}</span>
          </div>
          <button
            onClick={() => setShowAI(v => !v)}
            className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-linear-to-r from-violet-50 to-indigo-50 text-violet-700 hover:from-violet-100 hover:to-indigo-100 transition-all border border-violet-200/80 shadow-sm hover:shadow-violet-100"
          >
            <Sparkles className={`w-3 h-3 ${showAI ? "animate-sparkle-spin" : ""}`} />
            AI 원인/대책
            {showAI ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">{issue.standard} — {issue.description}</p>
        {issue.cause && (
          <p className="text-xs text-slate-600"><span className="font-semibold text-slate-700">원인:</span> {issue.cause}</p>
        )}
        {issue.action && (
          <p className="text-xs text-slate-600"><span className="font-semibold text-slate-700">대책:</span> {issue.action}</p>
        )}
      </div>
      {showAI && (
        <div className="bg-linear-to-br from-violet-500/8 to-indigo-500/5 border-t border-violet-200/40 px-4 py-3 space-y-2">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-violet-700 uppercase tracking-wider">
            <Sparkles className="w-3 h-3 animate-sparkle-spin text-violet-500" /> AI 분석 추천
          </div>
          {issue.aiSuggestedCause && (
            <div className="bg-white/80 backdrop-blur-sm rounded-lg p-2.5 border border-violet-200/60 shadow-sm">
              <p className="text-[10px] font-bold text-violet-600 mb-0.5">추정 근본 원인</p>
              <p className="text-xs text-slate-700 leading-relaxed">{issue.aiSuggestedCause}</p>
            </div>
          )}
          {issue.aiSuggestedAction && (
            <div className="bg-white/80 backdrop-blur-sm rounded-lg p-2.5 border border-indigo-200/60 shadow-sm">
              <p className="text-[10px] font-bold text-indigo-600 mb-0.5">권장 시스템 대책</p>
              <p className="text-xs text-slate-700 leading-relaxed">{issue.aiSuggestedAction}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── 상세 Drawer ───────────────────────────────────────────

const DETAIL_TABS = [
  { id: "overview", label: "일반 현황", icon: Building2 },
  { id: "evaluation", label: "등급 이력", icon: BarChart3 },
  { id: "process", label: "공정 현황", icon: Factory },
  { id: "issues", label: "품질 이슈", icon: ClipboardList },
  { id: "m4", label: "4M 변경", icon: Wrench },
] as const;

type DetailTabId = (typeof DETAIL_TABS)[number]["id"];

function VendorDrawer({ vendor, onClose }: { vendor: Vendor; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<DetailTabId>("overview");
  const style = gradeStyles[vendor.grade];
  const statusInfo = statusBadges[vendor.status];
  const StatusIcon = statusInfo.icon;
  const d = vendor.details;

  return (
    <>
      {/* 오버레이 */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-40 transition-opacity"
        onClick={onClose}
      />

      {/* 슬라이드인 패널 */}
      <div className="fixed right-0 top-0 h-full w-full max-w-2xl bg-white/95 backdrop-blur-xl z-50 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 border-l border-white/30">
        {/* 등급별 그라데이션 스트립 */}
        <div className={`h-[3px] w-full shrink-0 ${
          vendor.grade === "A" ? "bg-linear-to-r from-emerald-500 to-teal-400" :
          vendor.grade === "B" ? "bg-linear-to-r from-amber-400 to-yellow-300" :
          vendor.grade === "C" ? "bg-linear-to-r from-rose-500 to-orange-400" :
          "bg-linear-to-r from-slate-500 to-slate-400"
        }`} />

        {/* 헤더 */}
        <div className={`flex items-start justify-between px-6 py-5 border-b border-slate-100/80 border-l-[5px] ${style.border}`}>
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              {vendor.category === "RawMaterial" ? "원자재" : vendor.category === "Subcontract" ? "반제품 외주" : "상품 외주"} · {vendor.id}
            </span>
            <h2 className="text-xl font-bold text-slate-900">{vendor.name}</h2>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${style.bg} ${style.text}`}>
                {vendor.grade}등급 {vendor.score}점
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-0.5 ${statusInfo.style}`}>
                <StatusIcon className="w-3 h-3" />{statusInfo.label}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 탭 네비게이션 — 슬라이딩 인디케이터 트랙 */}
        <div className="relative border-b border-slate-100/80 overflow-x-auto shrink-0">
          <div className="flex">
            {DETAIL_TABS.map((tab, idx) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const isDisabled = !d && tab.id !== "overview";
              return (
                <button
                  key={tab.id}
                  onClick={() => !isDisabled && setActiveTab(tab.id)}
                  disabled={isDisabled}
                  className={`relative flex items-center gap-1.5 px-4 py-3 text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                    isActive
                      ? "text-slate-900"
                      : isDisabled
                      ? "text-slate-300 cursor-not-allowed"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                  {/* 개별 탭 하단 인디케이터 */}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900 rounded-t-full transition-all duration-200" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 탭 콘텐츠 */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* ── 탭 1: 일반 현황 ── */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* 기본 정보 그리드 */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "주요 품목", value: vendor.mainItem },
                  { label: "공장 소재지", value: vendor.location },
                  { label: "최근 품질 심사일", value: vendor.lastAuditDate },
                  { label: "수입검사 불량률", value: `${vendor.defectRate}%` },
                  ...(d ? [
                    { label: "설립일", value: d.establishedDate },
                    { label: "대지 면적", value: d.landArea },
                    { label: "총 매출", value: d.totalSales },
                    { label: "LS향 매출", value: d.lsSales },
                  ] : []),
                ].map(item => (
                  <div key={item.label} className="bg-slate-50 rounded-xl p-3">
                    <p className="text-[10px] text-slate-400 font-semibold">{item.label}</p>
                    <p className="text-sm font-bold text-slate-800 mt-0.5">{item.value}</p>
                  </div>
                ))}
              </div>

              {d && (
                <>
                  {/* 연락처 및 주소 */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> 연락처</h4>
                    <div className="bg-slate-50 rounded-xl p-4 space-y-1 text-sm">
                      <p className="text-slate-700"><span className="font-semibold text-slate-500 text-xs">품질 담당:</span> {d.phone}</p>
                      <p className="text-slate-700"><span className="font-semibold text-slate-500 text-xs">주소:</span> {d.address}</p>
                    </div>
                  </div>

                  {/* 인원 현황 */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1"><Users className="w-3.5 h-3.5" /> 인원 현황</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[
                        { label: "사무직", value: `${d.employees.office}명` },
                        { label: "현장직", value: `${d.employees.factory}명` },
                        { label: "외국인", value: `${d.employees.foreigners}명` },
                      ].map(item => (
                        <div key={item.label} className="bg-slate-50 rounded-xl p-3 text-center">
                          <p className="text-[10px] text-slate-400">{item.label}</p>
                          <p className="text-lg font-bold text-slate-800">{item.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 대체 업체 */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1"><GitBranch className="w-3.5 h-3.5" /> 대체 협력업체</h4>
                    <div className="flex gap-2 flex-wrap">
                      {d.alternatives.map(alt => (
                        <span key={alt} className="px-3 py-1.5 bg-slate-100 rounded-lg text-sm font-semibold text-slate-700">{alt}</span>
                      ))}
                    </div>
                  </div>

                  {/* 조직도 */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1"><Landmark className="w-3.5 h-3.5" /> 조직도 (임원진)</h4>
                    <div className="border border-slate-100 rounded-xl p-4 space-y-3">
                      {/* 대표이사 */}
                      <div className="flex justify-center">
                        <div className="bg-slate-900 text-white rounded-xl px-4 py-2 text-center">
                          <p className="text-[10px] text-slate-400">대표이사</p>
                          <p className="text-sm font-bold">{d.representative}</p>
                        </div>
                      </div>
                      <div className="border-t border-slate-200" />
                      {/* 임원진 */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {[
                          { role: "CFO", name: d.cfo },
                          { role: "이사", name: d.director },
                          { role: "고문", name: d.advisor },
                        ].map(item => (
                          <div key={item.role} className="bg-slate-50 rounded-xl p-2.5 text-center">
                            <p className="text-[10px] text-slate-400">{item.role}</p>
                            <p className="text-xs font-bold text-slate-700">{item.name}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── 탭 2: 등급 평가 이력 ── */}
          {activeTab === "evaluation" && d && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500">연도별 종합 품질 평가 결과. 신호등 체계로 등급 시각화.</p>
              <div className="space-y-3">
                {d.evaluationHistory.map(ev => (
                  <div key={ev.year} className="border border-slate-100 rounded-xl overflow-hidden">
                    <div className={`px-4 py-2 flex items-center justify-between ${gradeEvalStyle(ev.finalGrade)}`}>
                      <span className="font-bold text-sm">{ev.year}년</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold">{ev.classification}</span>
                        <span className="text-lg font-bold">{ev.finalGrade}등급</span>
                        <span className="text-sm font-bold">{ev.totalScore}점</span>
                      </div>
                    </div>
                    <div className="px-4 py-3 grid grid-cols-2 md:grid-cols-3 gap-2 text-xs bg-white">
                      {[
                        { label: "품질시스템", value: `${ev.qualitySystem}점` },
                        { label: "불량률", value: `${ev.defectRate}%` },
                        { label: "고객 클레임", value: `${ev.customerClaims}건` },
                        { label: "가점", value: `+${ev.bonusPoints}` },
                        { label: "감점", value: `-${ev.penaltyPoints}` },
                      ].map(item => (
                        <div key={item.label} className="bg-slate-50 rounded-lg p-2">
                          <p className="text-[10px] text-slate-400">{item.label}</p>
                          <p className="font-bold text-slate-800">{item.value}</p>
                        </div>
                      ))}
                    </div>
                    {ev.remarks && (
                      <div className="px-4 pb-3 text-xs text-slate-500 bg-white">
                        <span className="font-semibold text-slate-600">비고:</span> {ev.remarks}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── 탭 3: 공정 및 설비 현황 ── */}
          {activeTab === "process" && d && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500">10단계 생산 공정별 설비 운영 현황.</p>
              <div className="grid grid-cols-1 gap-4">
                {d.processFacilities.map(pf => (
                  <div key={pf.seq} className="border border-slate-100 rounded-xl overflow-hidden flex gap-0">
                    {pf.imageUrl && (
                      <div className="relative w-28 shrink-0">
                        <Image
                          src={pf.imageUrl}
                          alt={pf.processName}
                          fill
                          className="object-cover"
                          sizes="112px"
                        />
                      </div>
                    )}
                    <div className="p-3 flex-1 bg-white">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                          {pf.seq}
                        </span>
                        <p className="text-sm font-bold text-slate-900">{pf.processName}</p>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed pl-8">{pf.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── 탭 4: 품질 이슈 ── */}
          {activeTab === "issues" && d && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">총 <strong className="text-slate-900">{d.qualityIssues.length}건</strong>의 부적합 이슈. AI 버튼으로 근본 원인 분석 확인.</p>
              </div>
              {d.qualityIssues.map(issue => (
                <IssueRow key={issue.id} issue={issue} />
              ))}
            </div>
          )}

          {/* ── 탭 5: 4M 변경 이력 ── */}
          {activeTab === "m4" && d && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">Man · Machine · Material · Method 변경 이력. 공정 안정성 추적용.</p>
              {d.m4History.map((item, idx) => (
                <div key={idx} className="border border-slate-100 rounded-xl p-4 bg-white space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-bold text-slate-400">{item.date}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      item.evaluationResult.startsWith("승인")
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-rose-100 text-rose-700"
                    }`}>
                      {item.evaluationResult}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-800">{item.content}</p>
                  {item.remarks && (
                    <p className="text-xs text-slate-500 leading-relaxed">{item.remarks}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── 메인 컴포넌트 ─────────────────────────────────────────

export function VendorsView({ data }: VendorsViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"ALL" | VendorCategory>("ALL");
  const [selectedGrades, setSelectedGrades] = useState<VendorGrade[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<VendorStatus[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);

  const handleResetFilters = () => {
    setSearchQuery("");
    setActiveTab("ALL");
    setSelectedGrades([]);
    setSelectedStatuses([]);
  };

  const toggleGrade = (grade: VendorGrade) =>
    setSelectedGrades(prev => prev.includes(grade) ? prev.filter(g => g !== grade) : [...prev, grade]);

  const toggleStatus = (status: VendorStatus) =>
    setSelectedStatuses(prev => prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]);

  const stats = useMemo(() => {
    const list = data.vendors;
    const total = list.length;
    const avgDefect = list.reduce((acc, v) => acc + v.defectRate, 0) / total;
    const criticalCount = list.filter(v => v.status === "CRITICAL" || v.grade === "D").length;
    const warningCount = list.filter(v => v.status === "WARNING" || v.grade === "C").length;
    const gradeCount = list.reduce((acc, v) => {
      acc[v.grade] = (acc[v.grade] || 0) + 1;
      return acc;
    }, {} as Record<VendorGrade, number>);
    return {
      total, avgDefect: avgDefect.toFixed(2), criticalCount, warningCount,
      gradeA: gradeCount["A"] || 0, gradeB: gradeCount["B"] || 0,
      gradeC: gradeCount["C"] || 0, gradeD: gradeCount["D"] || 0,
    };
  }, [data]);

  const filteredVendors = useMemo(() => {
    return data.vendors.filter(vendor => {
      if (activeTab !== "ALL" && vendor.category !== activeTab) return false;
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        if (!vendor.name.toLowerCase().includes(query) &&
            !vendor.mainItem.toLowerCase().includes(query) &&
            !vendor.location.toLowerCase().includes(query)) return false;
      }
      if (selectedGrades.length > 0 && !selectedGrades.includes(vendor.grade)) return false;
      if (selectedStatuses.length > 0 && !selectedStatuses.includes(vendor.status)) return false;
      return true;
    });
  }, [data, activeTab, searchQuery, selectedGrades, selectedStatuses]);

  return (
    <div className="space-y-8">
      {/* 1. KPI 요약 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between transition-transform duration-300 hover:-translate-y-1">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 tracking-wider">총 협력업체</p>
            <h3 className="text-2xl font-bold text-slate-900">{stats.total}개사</h3>
            <p className="text-[10px] text-slate-400">품질 대시보드 등록 기준</p>
          </div>
          <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-500">
            <Building2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between transition-transform duration-300 hover:-translate-y-1">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 tracking-wider">조치 필요 요망</p>
            <h3 className="text-2xl font-bold text-rose-600 flex items-baseline gap-1">
              {stats.criticalCount} <span className="text-sm font-semibold text-slate-500">위험</span>
              <span className="text-lg text-slate-300 mx-1">/</span>
              <span className="text-amber-500 font-bold">{stats.warningCount}</span>
              <span className="text-sm font-semibold text-slate-500">경고</span>
            </h3>
            <p className="text-[10px] text-slate-400">등급 C·D 및 관리 위험 대상</p>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stats.criticalCount > 0 ? "bg-rose-50 text-rose-500 animate-pulse" : "bg-emerald-50 text-emerald-500"}`}>
            {stats.criticalCount > 0 ? <ShieldAlert className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between transition-transform duration-300 hover:-translate-y-1">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 tracking-wider">평균 불량률</p>
            <h3 className="text-2xl font-bold text-slate-900">{stats.avgDefect}%</h3>
            <p className="text-[10px] text-slate-400">수입검사 합격률 기준 역산</p>
          </div>
          <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-500">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between transition-transform duration-300 hover:-translate-y-1">
          <p className="text-xs font-semibold text-slate-500 tracking-wider">등급별 분포</p>
          <div className="space-y-1.5 mt-2">
            <div className="flex justify-between items-center text-xs text-slate-600">
              <span className="font-semibold">A / B / C / D</span>
              <span className="font-bold">{stats.gradeA} / {stats.gradeB} / {stats.gradeC} / {stats.gradeD}</span>
            </div>
            <div className="w-full h-2 rounded-full overflow-hidden bg-slate-100 flex">
              <div style={{ width: `${(stats.gradeA / stats.total) * 100}%` }} className="bg-emerald-500" />
              <div style={{ width: `${(stats.gradeB / stats.total) * 100}%` }} className="bg-amber-400" />
              <div style={{ width: `${(stats.gradeC / stats.total) * 100}%` }} className="bg-rose-500" />
              <div style={{ width: `${(stats.gradeD / stats.total) * 100}%` }} className="bg-slate-500" />
            </div>
          </div>
        </div>
      </div>

      {/* 2. 검색 및 필터 패널 */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="업체명, 주요 납품 품목, 위치 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm transition-all"
            />
          </div>
          <div className="flex items-center bg-slate-100 p-1 rounded-xl shrink-0 gap-1 overflow-x-auto">
            {(["ALL", "RawMaterial", "Subcontract", "ProductOuter"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${activeTab === tab ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
              >
                {tab === "ALL" ? "전체" : tab === "RawMaterial" ? "원자재" : tab === "Subcontract" ? "반제품 외주" : "상품 외주"}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-6 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-500 flex items-center gap-1">
                <SlidersHorizontal className="w-3.5 h-3.5" /> 등급 필터:
              </span>
              <div className="flex items-center gap-1">
                {(["A", "B", "C", "D"] as VendorGrade[]).map(grade => (
                  <button
                    key={grade}
                    onClick={() => toggleGrade(grade)}
                    className={`w-8 h-8 rounded-lg font-bold border transition-all ${selectedGrades.includes(grade) ? "bg-slate-900 border-slate-900 text-white" : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"}`}
                  >
                    {grade}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-500">관리 상태:</span>
              <div className="flex items-center gap-1">
                {(["NORMAL", "WARNING", "CRITICAL"] as VendorStatus[]).map(status => (
                  <button
                    key={status}
                    onClick={() => toggleStatus(status)}
                    className={`px-3 py-1.5 rounded-lg font-medium border transition-all ${selectedStatuses.includes(status) ? "bg-slate-900 border-slate-900 text-white" : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"}`}
                  >
                    {status === "NORMAL" ? "정상" : status === "WARNING" ? "경고" : "위험"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {(searchQuery !== "" || activeTab !== "ALL" || selectedGrades.length > 0 || selectedStatuses.length > 0) && (
            <button
              onClick={handleResetFilters}
              className="text-xs font-semibold text-slate-500 hover:text-slate-900 flex items-center gap-1 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" /> 필터 초기화
            </button>
          )}
        </div>
      </div>

      {/* 3. 카드 그리드 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <span>검색 및 필터 결과: <strong className="text-slate-900">{filteredVendors.length}</strong>개사</span>
          <span className="text-slate-400">카드 클릭 시 상세 정보 열람</span>
        </div>

        {filteredVendors.length === 0 ? (
          <div className="bg-white py-16 rounded-2xl border border-slate-100 shadow-sm text-center space-y-2">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto" />
            <h4 className="text-sm font-semibold text-slate-900">검색 조건에 부합하는 협력업체가 없습니다.</h4>
            <p className="text-xs text-slate-400">검색어를 변경하거나 필터를 초기화해 보세요.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {filteredVendors.map((vendor) => {
              const style = gradeStyles[vendor.grade];
              const statusInfo = statusBadges[vendor.status];
              const StatusIcon = statusInfo.icon;
              const hasDetails = !!vendor.details;

              return (
                <div
                  key={vendor.id}
                  onClick={() => setSelectedVendor(vendor)}
                  className={`bg-white rounded-2xl border-l-[6px] ${style.border} border-y border-r border-slate-100 shadow-sm overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:shadow-md flex flex-col justify-between cursor-pointer group`}
                >
                  <div className="p-5 space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                          {vendor.category === "RawMaterial" ? "원자재" : vendor.category === "Subcontract" ? "반제품 외주" : "상품 외주"}
                        </span>
                        <h4 className="font-bold text-slate-950 text-base group-hover:text-slate-700 transition-colors">{vendor.name}</h4>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${style.bg} ${style.text}`}>
                          {vendor.grade}
                        </div>
                        {hasDetails && (
                          <span className="text-[9px] font-bold text-violet-500 bg-violet-50 px-1.5 py-0.5 rounded-full border border-violet-200">상세보기</span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 text-xs pt-1">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">주요 품목</span>
                        <span className="font-semibold text-slate-800 text-right max-w-[150px] truncate" title={vendor.mainItem}>{vendor.mainItem}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">수입검사 불량률</span>
                        <span className={`font-semibold ${vendor.defectRate > 1.0 ? "text-rose-600 font-bold" : "text-slate-800"}`}>
                          {vendor.defectRate}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">최근 품질심사일</span>
                        <span className="font-medium text-slate-700 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" /> {vendor.lastAuditDate}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">공장 소재지</span>
                        <span className="font-medium text-slate-700 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" /> {vendor.location}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50/70 border-t border-slate-100 px-5 py-3 flex items-center justify-between text-xs">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-0.5 ${statusInfo.style}`}>
                      <StatusIcon className="w-3 h-3" />{statusInfo.label}
                    </span>
                    <div className="flex items-center gap-1 text-slate-500">
                      <Award className="w-4 h-4 text-slate-400" />
                      평가 점수: <strong className="text-slate-800 font-bold">{vendor.score}점</strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. 상세 Drawer */}
      {selectedVendor && (
        <VendorDrawer vendor={selectedVendor} onClose={() => setSelectedVendor(null)} />
      )}
    </div>
  );
}
