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
  /**
   * 항목 출처 구분 (2026-07-01 #63).
   * - "system": 단계 이동 등 앱이 자동 기록한 감사 로그
   * - "user":   사용자가 직접 입력한 처리 메모
   * 레거시 데이터(필드 없음)는 action prefix로 폴백 판별한다. lib/ncr-timeline.ts 참고.
   */
  kind?: "system" | "user";
}

export interface NCRAttachment {
  url: string;
  name: string;
  size: number;
  contentType: string;
}

export interface NCR {
  id: string;         // cuid — DB primary key, used in URLs
  ncrNo: string;      // "NCR-2026-001" — display number
  title: string;
  source: string;
  projectKey?: string | null;
  severity: NCRSeverity;
  status: NCRStatus;
  disposition: NCRDispositionType;
  issuedDate: string;
  targetDate: string;
  closedDate?: string;
  assignee: string;
  description: string;
  timeline?: NCRTimelineItem[];
  attachments?: NCRAttachment[];
}

export interface NCRsData {
  ncrs: NCR[];
}
