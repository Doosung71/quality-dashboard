export type WorkloadStatus = "High" | "Normal" | "Low";

export interface Employee {
  id: string;              // 사번 (EMP-2026-XXX)
  name: string;            // 가명 이름
  rank: string;            // 직급 (수석, 책임, 선임, 전임)
  department: string;      // 부서 (초고압품질팀, 해저품질팀, 품질보증팀 등)
  role: string;            // 담당 업무
  qualifications: string[]; // 보유 자격증 (CQE, CRE, ISO 심사원 등)
  workload: WorkloadStatus; // 업무 부하도
  email: string;
  phone: string;
}

export interface Interview {
  id: string;              // INT-2026-XXX
  employeeId: string;      // 사번 매핑
  date: string;            // 면담일
  interviewer: string;     // 면담자
  topic: string;           // 면담 주제
  summary: string;         // 면담 내용 요약
  actionPlan: string;      // 향후 조치 방안
}

export interface HRData {
  employees: Employee[];
  interviews: Interview[];
}
