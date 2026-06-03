import { Suspense } from "react";
import { vendorsData } from "@/data/vendors.data";
import { VendorsView } from "@/components/vendors/vendors-view";

export default function VendorsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">공급망관리</h1>
        <p className="text-slate-500">원자재·반제품·상품 외주 공급업체의 품질 등급 및 공급망 리스크를 관리합니다.</p>
      </div>
      <Suspense fallback={<div className="text-sm text-slate-500">불러오는 중...</div>}>
        <VendorsView data={vendorsData} />
      </Suspense>
    </div>
  );
}
