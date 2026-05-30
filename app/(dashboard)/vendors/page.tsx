import { Suspense } from "react";
import { vendorsData } from "@/data/vendors.data";
import { VendorsView } from "@/components/vendors/vendors-view";

export default function VendorsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">협력업체 카드 풀</h1>
        <p className="text-slate-500">원자재, 반제품 외주, 상품 외주 협력업체의 품질 등급 및 불량 현황을 모니터링합니다.</p>
      </div>
      <Suspense fallback={<div className="text-sm text-slate-500">불러오는 중...</div>}>
        <VendorsView data={vendorsData} />
      </Suspense>
    </div>
  );
}
