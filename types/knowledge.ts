export type KnowledgeCategory = "Standards" | "TechnicalDocs" | "Reports" | "Others";

export type KnowledgeSubCategory =
  // Standards 하위
  | "국제규격"
  | "국가규격"
  | "단체규격"
  | "고객규격"
  | "Tender"
  | "사내규격"
  // TechnicalDocs 하위
  | "논문" 
  | "특허"
  // Reports 하위
  | "시험성적서" 
  | "분석보고서"
  // Others 하위
  | "가이드라인" 
  | "매뉴얼" 
  | "기타";

export interface KnowledgeAsset {
  id: string; // KB-2026-XXX
  category: KnowledgeCategory;
  subCategory: KnowledgeSubCategory;
  title: string;
  code?: string; // 규격 번호 (예: IEC 60840, KS C 3001)
  publisher: string; // 발행처 (예: IEC, KEPCO, IEEE)
  publishYear: string;
  summary: string;
  fileSize?: string;
  keywords: string[];
  linkUrl?: string;
  sourcePath?: string; // knowledge_chunks의 원본 경로 (내용 조회용)
  isInternal?: boolean; // 사내 규격 여부 (CRUD 가능)
  internalId?: string;  // InternalStandard.id
  internalCat?: string; // 사내 분류 (재료규격 등)
}

export interface KnowledgeRepositoryData {
  assets: KnowledgeAsset[];
}
