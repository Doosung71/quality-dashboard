export type IntelligenceCategory = "시장/기술 동향" | "고객 동향" | "경쟁사 동향" | "기타";
export type ImpactLevel = "High" | "Medium" | "Low";

export interface IntelligenceItem {
  id: string;
  category: IntelligenceCategory;
  title: string;
  source: string;
  date: string;
  summary: string;
  impact: ImpactLevel;
  keywords: string[];
  actionItem?: string;
}

export interface IntelligenceData {
  items: IntelligenceItem[];
}
