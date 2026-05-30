export interface MonthlyQCost {
  month: string;              // YYYY-MM
  externalFailure: number;    // 외부실패(클레임) 비용 (백만원)
  internalFailure: number;    // 내부실패 비용 (백만원)
  executionLoss: number;      // 실행로스 비용 (백만원)
  appraisal: number;          // 평가 비용 (백만원)
  prevention: number;         // 예방 비용 (백만원)
}

export interface QCostDetailItem {
  id: string;
  date: string;
  category: "externalFailure" | "internalFailure" | "executionLoss" | "appraisal" | "prevention";
  title: string;
  cost: number;               // 백만원
  source: string;             // 구미 1공장, 고객서비스팀 등
  description: string;
}

export interface QCostData {
  monthlyCosts: MonthlyQCost[];
  details: QCostDetailItem[];
}
