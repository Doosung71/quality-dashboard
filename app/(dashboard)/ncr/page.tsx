import { Suspense } from "react";
import { ncrsData } from "@/data/ncr.data";
import { NCRView } from "@/components/ncr/ncr-view";

export default function NCRPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">부적합품보고(NCR) 트래커</h1>
        <p className="text-slate-500">생산 공정 및 수입 검사에서 검출된 부적합 항목들의 발생 조치부터 최종 효과성 검증 단계까지 관리합니다.</p>
      </div>
      <Suspense fallback={<div className="text-sm text-slate-500">부적합 데이터를 불러오는 중...</div>}>
        <NCRView data={ncrsData} />
      </Suspense>
    </div>
  );
}
