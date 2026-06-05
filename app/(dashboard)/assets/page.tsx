import { assetData } from "@/data/assets.data";
import { testsData } from "@/data/tests.data";
import { AssetsView } from "@/components/assets/assets-view";

export default function AssetsPage() {
  return (
    <div className="space-y-1">
      <h1 className="text-lg font-semibold text-slate-800">자산관리</h1>
      <p className="text-xs text-slate-400 mb-4">시험설비·계측설비 자산 현황 및 노후도 관리 (2026.03 기준)</p>
      <AssetsView assetData={assetData} testsData={testsData} />
    </div>
  );
}
