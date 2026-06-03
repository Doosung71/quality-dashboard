"use client";

import { useState, useMemo } from "react";
import type { HRData, Employee, Interview, WorkloadStatus } from "@/types/hr";
import {
  Users,
  UserMinus,
  Award,
  CalendarDays,
  Search,
  Mail,
  Phone,
  Briefcase,
  Plus,
  X,
  PlusCircle,
  MessageSquare,
  ArrowRight,
  TrendingUp,
  Heart,
  Star,
} from "lucide-react";

// 업무 부하 게이지 컴포넌트
function WorkloadGauge({ workload }: { workload: WorkloadStatus }) {
  const config = {
    High:   { pct: 88, color: "from-rose-500 to-orange-400",   label: "과부하",  track: "bg-rose-100"   },
    Normal: { pct: 52, color: "from-amber-400 to-yellow-300",  label: "보통",    track: "bg-amber-100"  },
    Low:    { pct: 22, color: "from-emerald-500 to-teal-400",  label: "여유",    track: "bg-emerald-100" },
  }[workload];

  return (
    <div className="space-y-1 w-full max-w-[160px]">
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-slate-500 font-medium">업무 부하도</span>
        <span className="font-bold text-slate-700">{config.pct}%</span>
      </div>
      <div className={`h-2 rounded-full w-full ${config.track} overflow-hidden`}>
        <div
          className={`h-full rounded-full bg-linear-to-r ${config.color} transition-all duration-500`}
          style={{ width: `${config.pct}%` }}
        />
      </div>
      <p className="text-[9px] text-slate-400 font-medium">{config.label}</p>
    </div>
  );
}

// 면담 주제 아이콘 추론
function InterviewTopicIcon({ topic }: { topic: string }) {
  const t = topic.toLowerCase();
  if (t.includes("경력") || t.includes("개발") || t.includes("성장"))
    return <TrendingUp className="w-3.5 h-3.5 text-indigo-500 shrink-0" />;
  if (t.includes("고충") || t.includes("상담") || t.includes("개인"))
    return <Heart className="w-3.5 h-3.5 text-rose-400 shrink-0" />;
  if (t.includes("성과") || t.includes("평가") || t.includes("자격"))
    return <Star className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
  return <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />;
}

interface HRViewProps {
  data: HRData;
}


const WORKLOAD_STYLES: Record<WorkloadStatus, { label: string, style: string, dot: string }> = {
  High: { label: "과부하 (High)", style: "bg-rose-50 text-rose-700 border-rose-200 font-bold animate-pulse", dot: "bg-rose-500" },
  Normal: { label: "보통 (Normal)", style: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-400" },
  Low: { label: "여유 (Low)", style: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
};

export function HRView({ data }: HRViewProps) {
  const [employees] = useState<Employee[]>(data.employees);
  const [interviews, setInterviews] = useState<Interview[]>(data.interviews);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(data.employees[0]?.id || "");
  
  // 필터들
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState<string>("ALL");
  const [selectedWorkload, setSelectedWorkload] = useState<"ALL" | WorkloadStatus>("ALL");

  // 모의 신규 면담 입력 폼 상태
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTopic, setNewTopic] = useState("");
  const [newInterviewer, setNewInterviewer] = useState("품질부문장 Dennis");
  const [newSummary, setNewSummary] = useState("");
  const [newActionPlan, setNewActionPlan] = useState("");

  const departments = useMemo(() => {
    const set = new Set(employees.map(e => e.department));
    return ["ALL", ...Array.from(set)];
  }, [employees]);

  // 선택된 사원 정보
  const selectedEmployee = useMemo(() => {
    return employees.find(e => e.id === selectedEmployeeId) || null;
  }, [employees, selectedEmployeeId]);

  // 선택된 사원의 정렬된 면담 목록
  const selectedInterviews = useMemo(() => {
    return interviews
      .filter(i => i.employeeId === selectedEmployeeId)
      .sort((a, b) => b.date.localeCompare(a.date)); // 최근 순 정렬
  }, [interviews, selectedEmployeeId]);

  // 인적 자원 KPI 분석 집계
  const kpis = useMemo(() => {
    const total = employees.length;
    const highWorkloadCount = employees.filter(e => e.workload === "High").length;
    
    // 전문 자격증을 1개 이상 가진 인원 비율
    const qualifiedCount = employees.filter(e => e.qualifications.length > 0).length;
    const qualificationRate = total > 0 ? ((qualifiedCount / total) * 100).toFixed(0) : "0";

    // 5월 한달간 면담 횟수
    const mayInterviewCount = interviews.filter(i => i.date.startsWith("2026-05")).length;

    return {
      total,
      highWorkloadCount,
      qualificationRate,
      mayInterviewCount
    };
  }, [employees, interviews]);

  // 필터링 적용된 직원 리스트
  const filteredEmployees = useMemo(() => {
    return employees.filter(e => {
      // 1. 부서 필터
      if (selectedDept !== "ALL" && e.department !== selectedDept) return false;

      // 2. 부하도 필터
      if (selectedWorkload !== "ALL" && e.workload !== selectedWorkload) return false;

      // 3. 검색어 필터 (이름, 사번, 담당 업무)
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        const matchesName = e.name.toLowerCase().includes(query);
        const matchesId = e.id.toLowerCase().includes(query);
        const matchesRole = e.role.toLowerCase().includes(query);
        if (!matchesName && !matchesId && !matchesRole) return false;
      }

      return true;
    });
  }, [employees, selectedDept, selectedWorkload, searchQuery]);

  // 모의 신규 면담 등록 처리 (Zero Double Work)
  const handleAddInterview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeId || !newTopic.trim() || !newSummary.trim()) return;

    const newInt: Interview = {
      id: `INT-2026-0${interviews.length + 1}`,
      employeeId: selectedEmployeeId,
      date: new Date().toISOString().split("T")[0],
      interviewer: newInterviewer,
      topic: newTopic.trim(),
      summary: newSummary.trim(),
      actionPlan: newActionPlan.trim() || "해당 사항 없음"
    };

    setInterviews(prev => [newInt, ...prev]);
    
    // 폼 클리어
    setNewTopic("");
    setNewSummary("");
    setNewActionPlan("");
    setShowAddForm(false);
  };

  return (
    <div className="space-y-8">
      {/* 1. 인적 자원 요약 KPI (Director's View) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* 부문 총원 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between transition-all hover:shadow-md">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 tracking-wider">품질부문 총원</p>
            <h3 className="text-2xl font-bold text-slate-900">{kpis.total}명</h3>
            <p className="text-[10px] text-slate-400">지중가공/해저/시공/배전/통신/구매/경영</p>
          </div>
          <div className="w-12 h-12 bg-slate-50 text-slate-500 rounded-xl flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* 업무 과부하 (High Workload) 경고 표시 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between transition-all hover:shadow-md">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 tracking-wider">업무 과부하 인원</p>
            <h3 className={`text-2xl font-bold ${kpis.highWorkloadCount > 0 ? 'text-rose-600 animate-pulse' : 'text-slate-900'}`}>
              {kpis.highWorkloadCount}명
            </h3>
            <p className="text-[10px] text-slate-400">업무 부하도 High 등급 대상</p>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${kpis.highWorkloadCount > 0 ? 'bg-rose-50 text-rose-500 animate-pulse' : 'bg-slate-50 text-slate-500'}`}>
            <UserMinus className="w-6 h-6" />
          </div>
        </div>

        {/* 전문 자격 보유율 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between transition-all hover:shadow-md">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 tracking-wider">전문 자격 보유율</p>
            <h3 className="text-2xl font-bold text-emerald-600">{kpis.qualificationRate}%</h3>
            <p className="text-[10px] text-slate-400">CQE, CRE, ISO 심사원 등 보유</p>
          </div>
          <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center">
            <Award className="w-6 h-6" />
          </div>
        </div>

        {/* 최근 면담 실적 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between transition-all hover:shadow-md">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 tracking-wider">5월 면담 실적</p>
            <h3 className="text-2xl font-bold text-indigo-600">{kpis.mayInterviewCount}건</h3>
            <p className="text-[10px] text-slate-400">최근 면담 및 고충 조절 실적</p>
          </div>
          <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-xl flex items-center justify-center">
            <CalendarDays className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 2. Split View (좌측: 팀원 리스트 / 우측: 상세 정보 및 면담 타임라인) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* 좌측 열: 팀원 검색 및 리스트 */}
        <div className="lg:col-span-1 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div className="space-y-2">
            <h4 className="text-xs font-extrabold text-slate-400 tracking-wider uppercase">품질부문 인원 명부</h4>
            
            {/* 검색창 */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="이름, 업무 키워드 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-950 text-xs transition-all"
              />
            </div>
          </div>

          {/* 소형 필터 컨트롤 */}
          <div className="space-y-3 pt-2 border-t border-slate-100 text-[10px]">
            {/* 부서 필터 */}
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-500">부서:</span>
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-slate-950"
              >
                {departments.map(d => (
                  <option key={d} value={d}>{d === "ALL" ? "전체 부서" : d}</option>
                ))}
              </select>
            </div>

            {/* 부하도 필터 */}
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-500">부하도:</span>
              <select
                value={selectedWorkload}
                onChange={(e) => setSelectedWorkload(e.target.value as "ALL" | WorkloadStatus)}
                className="bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-slate-950"
              >
                <option value="ALL">전체 상태</option>
                <option value="High">과부하 (High)</option>
                <option value="Normal">보통 (Normal)</option>
                <option value="Low">여유 (Low)</option>
              </select>
            </div>
          </div>

          {/* 팀원 카드 목록 */}
          <div className="space-y-2 overflow-y-auto max-h-[420px] pt-2 border-t border-slate-100">
            {filteredEmployees.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                조건에 일치하는 팀원이 없습니다.
              </div>
            ) : (
              filteredEmployees.map(emp => {
                const isSelected = emp.id === selectedEmployeeId;
                const wlInfo = WORKLOAD_STYLES[emp.workload];
                
                return (
                  <div
                    key={emp.id}
                    onClick={() => setSelectedEmployeeId(emp.id)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${isSelected ? 'bg-slate-950 border-slate-950 text-white shadow' : 'bg-white border-slate-100 hover:border-slate-300 hover:bg-slate-50/50'}`}
                  >
                    <div className="flex items-center gap-3">
                      {/* 이니셜 아바타 */}
                      <div className={`w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center shrink-0 uppercase shadow-inner ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'}`}>
                        {emp.name.slice(0, 2)}
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold flex items-center gap-1.5">
                          {emp.name} <span className={`text-[9px] font-medium ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>{emp.rank}</span>
                        </p>
                        <p className={`text-[10px] ${isSelected ? 'text-slate-400' : 'text-slate-500'}`}>{emp.department}</p>
                      </div>
                    </div>

                    {/* 부하도 미니 도트 */}
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${wlInfo.dot}`} title={wlInfo.label} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 우측 열: 선택 팀원의 상세 정보 및 면담 타임라인 */}
        <div className="lg:col-span-2 space-y-6">
          {!selectedEmployee ? (
            <div className="bg-white py-24 rounded-2xl border border-slate-100 shadow-sm text-center text-slate-400 text-xs">
              선택된 팀원이 없습니다. 좌측에서 팀원을 선택해 주세요.
            </div>
          ) : (
            <>
              {/* 팀원 상세 프로필 */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden space-y-0">
                {/* 부서 컬러 배경 헤더 스트립 */}
                <div className={`px-6 pt-5 pb-4 border-b border-slate-100/80 ${
                  selectedEmployee.workload === "High"
                    ? "bg-linear-to-br from-rose-50 to-orange-50/30"
                    : selectedEmployee.workload === "Normal"
                    ? "bg-linear-to-br from-amber-50/60 to-slate-50"
                    : "bg-linear-to-br from-emerald-50/60 to-slate-50"
                }`}>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 font-extrabold text-lg flex items-center justify-center rounded-2xl shadow-md ${
                        selectedEmployee.workload === "High"   ? "bg-linear-to-br from-rose-600 to-orange-500 text-white" :
                        selectedEmployee.workload === "Normal" ? "bg-linear-to-br from-amber-500 to-yellow-400 text-white" :
                        "bg-linear-to-br from-emerald-600 to-teal-500 text-white"
                      }`}>
                        {selectedEmployee.name.slice(0, 2)}
                      </div>
                      <div>
                        <h4 className="text-lg font-black text-slate-950 flex items-baseline gap-2">
                          {selectedEmployee.name}
                          <span className="text-xs font-semibold text-slate-500">{selectedEmployee.rank}</span>
                        </h4>
                        <p className="text-xs text-slate-400 mt-0.5">{selectedEmployee.department}</p>
                      </div>
                    </div>

                    {/* 부하도 게이지 */}
                    <WorkloadGauge workload={selectedEmployee.workload} />
                  </div>
                </div>

                {/* 프로필 본문 */}
                <div className="p-6 space-y-6">

                {/* 프로필 정보 세부 격자 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">소속 사번</span>
                    <span className="font-semibold text-slate-800">{selectedEmployee.id}</span>
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">주요 담당 업무</span>
                    <span className="font-semibold text-slate-800 flex items-center gap-1">
                      <Briefcase className="w-3.5 h-3.5 text-slate-400" /> {selectedEmployee.role}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">회사 이메일</span>
                    <span className="font-semibold text-slate-800 flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-slate-400" /> {selectedEmployee.email}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">연락처</span>
                    <span className="font-semibold text-slate-800 flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-slate-400" /> {selectedEmployee.phone}
                    </span>
                  </div>
                </div>

                {/* 품질 자격증 */}
                <div className="space-y-2 pt-4 border-t border-slate-100 text-xs">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">전문 품질 자격증 보유 현황</span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedEmployee.qualifications.length === 0 ? (
                      <span className="text-slate-400 italic">등록된 전문 품질 자격증이 없습니다.</span>
                    ) : (
                      selectedEmployee.qualifications.map(q => (
                        <span key={q} className="bg-emerald-50 text-emerald-800 border border-emerald-100 rounded px-2.5 py-0.5 font-bold tracking-wide">
                          {q}
                        </span>
                      ))
                    )}
                  </div>
                </div>
                </div>{/* closes 프로필 본문 */}
              </div>{/* closes 팀원 상세 프로필 외부 카드 */}

              {/* 글래스모피즘 면담 등록 모달 오버레이 */}
              {showAddForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/25 backdrop-blur-sm">
                  <div className="w-full max-w-lg premium-glass rounded-2xl shadow-2xl border border-white/30">
                    <div className="px-6 py-4 border-b border-slate-200/60 flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-indigo-500" /> 새 면담 등록
                      </h3>
                      <button
                        onClick={() => setShowAddForm(false)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <form onSubmit={handleAddInterview} className="p-6 space-y-4 text-xs">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="font-bold text-slate-600">면담자</label>
                          <input
                            type="text"
                            required
                            value={newInterviewer}
                            onChange={(e) => setNewInterviewer(e.target.value)}
                            className="w-full bg-white/80 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="font-bold text-slate-600">면담 주제</label>
                          <input
                            type="text"
                            required
                            placeholder="예: 업무 과부하 조율, 고충 상담"
                            value={newTopic}
                            onChange={(e) => setNewTopic(e.target.value)}
                            className="w-full bg-white/80 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="font-bold text-slate-600">면담 내용 요약</label>
                        <textarea
                          required
                          rows={3}
                          placeholder="면담 시 오간 고충이나 현황을 간략히 정리해 주세요..."
                          value={newSummary}
                          onChange={(e) => setNewSummary(e.target.value)}
                          className="w-full bg-white/80 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="font-bold text-slate-600">행동 계획 (Action Plan)</label>
                        <input
                          type="text"
                          placeholder="예: 추가 인력 배치 검토, 리프레쉬 휴가 배정"
                          value={newActionPlan}
                          onChange={(e) => setNewActionPlan(e.target.value)}
                          className="w-full bg-white/80 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all"
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setShowAddForm(false)}
                          className="px-4 py-2 text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 font-semibold transition-all"
                        >
                          취소
                        </button>
                        <button
                          type="submit"
                          className="bg-linear-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 shadow-sm hover:shadow-indigo-200 transition-all"
                        >
                          <PlusCircle className="w-3.5 h-3.5" /> 면담 기록 저장
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* 면담 결과 이력 타임라인 */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h4 className="text-sm font-bold text-slate-800 tracking-wide flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-indigo-500" /> 인사 및 면담 결과 이력 ({selectedInterviews.length}건)
                  </h4>
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg border border-indigo-100 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" /> 새 면담 등록
                  </button>
                </div>

                {/* 세로 타임라인 목록 */}
                <div className="space-y-6 relative border-l border-slate-100 pl-4 ml-2 pt-2">
                  {selectedInterviews.length === 0 ? (
                    <div className="text-slate-400 italic text-xs py-4">
                      해당 팀원에 대해 등록된 면담 결과가 없습니다.
                    </div>
                  ) : (
                    selectedInterviews.map((int) => (
                      <div key={int.id} className="relative group space-y-2 text-xs">
                        {/* 타임라인 노드 아이콘 */}
                        <span className="absolute -left-[23px] top-0.5 w-[22px] h-[22px] rounded-full bg-white border-2 border-slate-200 group-hover:border-indigo-400 flex items-center justify-center transition-colors">
                          <InterviewTopicIcon topic={int.topic} />
                        </span>

                        {/* 날짜 + 면담자 */}
                        <div className="flex items-center justify-between text-slate-400 text-[10px] mb-0.5">
                          <span className="font-mono flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" /> {int.date}</span>
                          <span className="font-semibold text-slate-500">면담자: {int.interviewer}</span>
                        </div>

                        {/* 주제 */}
                        <h5 className="font-extrabold text-slate-950 text-sm flex items-center gap-1.5">
                          <InterviewTopicIcon topic={int.topic} />
                          {int.topic}
                        </h5>

                        {/* 내용 요약 */}
                        <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-100 leading-relaxed text-slate-700 font-medium">
                          {int.summary}
                        </div>

                        {/* Action Plan — 인디고/골드 강조 박스 */}
                        <div className="bg-linear-to-r from-indigo-500/5 to-violet-500/5 text-indigo-950 p-3 rounded-xl border border-indigo-200/50 flex items-center gap-2 shadow-sm">
                          <span className="px-2 py-0.5 bg-linear-to-r from-indigo-600 to-indigo-500 text-white font-bold rounded text-[9px] uppercase tracking-wider shrink-0 shadow-sm">
                            Action
                          </span>
                          <span className="font-bold flex items-center gap-1.5 text-indigo-900">
                            <ArrowRight className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                            {int.actionPlan}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
