export const VENDOR_CATEGORIES = [
  "RawMaterial",   // 원자재
  "Subcontract",   // 반제품 외주
  "ProductOuter",  // 상품 외주
] as const;

export type VendorCategory = (typeof VENDOR_CATEGORIES)[number];
export type VendorGrade = "A" | "B" | "C" | "D";
export type VendorStatus = "NORMAL" | "WARNING" | "CRITICAL";

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
}

export interface VendorsData {
  vendors: Vendor[];
}
