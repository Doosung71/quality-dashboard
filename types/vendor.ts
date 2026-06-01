export const VENDOR_CATEGORIES = [
  "RawMaterial",   // 원자재
  "Subcontract",   // 반제품 외주
  "ProductOuter",  // 상품 외주
] as const;

export type VendorCategory = (typeof VENDOR_CATEGORIES)[number];
export type VendorGrade = "A" | "B" | "C" | "D";
export type VendorStatus = "NORMAL" | "WARNING" | "CRITICAL";

// ─── 상세 정보 서브타입 ─────────────────────────────────────

export interface EmployeeStatus {
  office: number;
  factory: number;
  foreigners: number;
}

export interface EvaluationHistoryItem {
  year: string;
  qualitySystem: number;
  defectRate: number;
  customerClaims: number;
  bonusPoints: number;
  penaltyPoints: number;
  totalScore: number;
  finalGrade: string;
  classification: string;
  remarks: string;
}

export interface QualityIssueItem {
  id: number;
  date: string;
  customer: string;
  standard: string;
  defectType: string;
  description: string;
  cause?: string;
  action?: string;
  aiSuggestedCause?: string;
  aiSuggestedAction?: string;
}

export interface M4HistoryItem {
  date: string;
  content: string;
  evaluationResult: string;
  remarks: string;
}

export interface ProcessFacilityItem {
  seq: number;
  processName: string;
  status: string;
  imageUrl?: string;
}

export interface VendorDetails {
  representative: string;
  cfo: string;
  director: string;
  advisor: string;
  address: string;
  phone: string;
  establishedDate: string;
  landArea: string;
  totalSales: string;
  lsSales: string;
  lsDependency: string;
  employees: EmployeeStatus;
  alternatives: string[];
  evaluationHistory: EvaluationHistoryItem[];
  qualityIssues: QualityIssueItem[];
  m4History: M4HistoryItem[];
  processFacilities: ProcessFacilityItem[];
}

// ─── 기본 Vendor 타입 ───────────────────────────────────────

export interface Vendor {
  id: string;
  name: string;
  category: VendorCategory;
  grade: VendorGrade;
  score: number;
  mainItem: string;
  location: string;
  defectRate: number; // 단위: % (예: 0.12 = 0.12%)
  lastAuditDate: string;
  status: VendorStatus;
  details?: VendorDetails;
}

export interface VendorsData {
  vendors: Vendor[];
}
