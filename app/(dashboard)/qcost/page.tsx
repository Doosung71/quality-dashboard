import { Suspense } from "react";
import { qcostData } from "@/data/qcost.data";
import { QCostView } from "@/components/qcost/qcost-view";

export default function QCostPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">품질비용(Q-Cost) 대시보드</h1>
        <p className="text-slate-500">예방비용, 평가비용, 내부실패비용, 외부실패(클레임)비용 및 실행로스로 구성된 품질비용 현황과 추이를 모니터링합니다.</p>
      </div>
      <Suspense fallback={<div className="text-sm text-slate-500">품질비용 데이터를 불러오는 중...</div>}>
        <QCostView data={qcostData} />
      </Suspense>
    </div>
  );
}
