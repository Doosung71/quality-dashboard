export const CLAIM_STATUSES = [
  "Received",
  "Investigating",
  "Action",
  "Verification",
  "Closed",
] as const;

export type ClaimStatus = (typeof CLAIM_STATUSES)[number];
export type ClaimPriority = "Low" | "Mid" | "High";

export type BackClaimStatus = "DRAFT" | "SENT" | "REPLIED" | "SETTLED" | "CLOSED";

export const BACK_CLAIM_STATUSES: BackClaimStatus[] = ["DRAFT", "SENT", "REPLIED", "SETTLED", "CLOSED"];

export const BACK_CLAIM_STATUS_LABELS: Record<BackClaimStatus, string> = {
  DRAFT:   "발송 전",
  SENT:    "공문 발송",
  REPLIED: "회신 수령",
  SETTLED: "합의 완료",
  CLOSED:  "종결",
};

// 귀책처 기본 옵션 (드롭다운에 표시)
export const RESPONSIBLE_PARTY_OPTIONS = [
  "고객",
  "당사: 설계",
  "당사: 생산",
  "당사: QA",
  "당사: 시공",
  "당사: 기타",
  "협력업체",
  "기타",
] as const;

export interface ClaimTimelineItem {
  date: string;
  action: string;
  handler?: string;
  /**
   * 항목 출처 구분 (2026-07-02 #63 Claims 이식).
   * - "system": 단계 이동 등 앱이 자동 기록한 감사 로그
   * - "user":   사용자가 직접 입력한 처리 메모
   * 레거시 데이터(필드 없음)는 action prefix로 폴백 판별한다. lib/stage-timeline.ts 참고.
   */
  kind?: "system" | "user";
}

export interface ClaimAttachment {
  url: string;
  name: string;
  size: number;
  contentType: string;
}

export interface BackClaim {
  id: string;
  claimId: string;
  vendorName: string;
  sentAt?: string;
  replyDeadline?: string;
  claimedAmount: number;    // 원 단위
  recoveredAmount?: number; // 원 단위
  status: BackClaimStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Claim {
  id: string;
  claimNo: string;
  title: string;
  customer: string;
  projectKey?: string | null;
  priority: ClaimPriority;
  status: ClaimStatus;
  receivedAt: string;
  targetDate?: string;
  closedAt?: string;
  assignee: string;
  description: string;
  responsibleParty?: string;
  timeline?: ClaimTimelineItem[];
  attachments?: ClaimAttachment[];
}

export interface ClaimsData {
  claims: Claim[];
}
