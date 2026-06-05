export const NCR_STATUSES = [
  "Issued",            // 부적합 발행
  "Disposition",       // 처리방안 수립
  "CorrectiveAction",  // 시정조치 중
  "Verification",      // 효과검증
  "Closed",            // 종결
] as const;

export type NCRStatus = (typeof NCR_STATUSES)[number];
export type NCRSeverity = "Minor" | "Major" | "Critical";
export type NCRDispositionType = "Scrap" | "Rework" | "Concession" | "TBD";

export interface NCRTimelineItem {
  date: string;
  action: string;
  user: string;
}

export interface NCR {
  id: string;         // cuid — DB primary key, used in URLs
  ncrNo: string;      // "NCR-2026-001" — display number
  title: string;
  source: string;
  severity: NCRSeverity;
  status: NCRStatus;
  disposition: NCRDispositionType;
  issuedDate: string;
  targetDate: string;
  closedDate?: string;
  assignee: string;
  description: string;
  timeline?: NCRTimelineItem[];
}

export interface NCRsData {
  ncrs: NCR[];
}
