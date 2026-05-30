import { Suspense } from "react";
import { intelligenceData } from "@/data/intelligence.data";
import { IntelligenceView } from "@/components/intelligence/intelligence-view";

export default function IntelligencePage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">글로벌 외부정보 (Market Intelligence)</h1>
        <p className="text-slate-500">초고압/해저 케이블 산업 내 시장/기술 동향, 고객 동향, 경쟁사 동향 및 기타 환경 요인 정보를 수집하고 품질 영향도에 따른 당사 대응 방향을 수립합니다.</p>
      </div>
      <Suspense fallback={<div className="text-sm text-slate-500">외부정보 데이터를 불러오는 중...</div>}>
        <IntelligenceView data={intelligenceData} />
      </Suspense>
    </div>
  );
}
