export const CLAIM_STATUSES = [
  "Received",
  "Investigating",
  "Action",
  "Verification",
  "Closed",
] as const;

export type ClaimStatus = (typeof CLAIM_STATUSES)[number];
export type ClaimPriority = "Low" | "Mid" | "High";

export interface ClaimTimelineItem {
  date: string;
  action: string;
}

export interface Claim {
  id: string;         // cuid — DB primary key, used in URLs
  claimNo: string;    // "CLM-2026-001" — display number
  title: string;
  customer: string;
  priority: ClaimPriority;
  status: ClaimStatus;
  receivedAt: string;
  closedAt?: string;
  assignee: string;
  description: string;
  timeline?: ClaimTimelineItem[];
}

export interface ClaimsData {
  claims: Claim[];
}
