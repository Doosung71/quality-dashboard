import { Suspense } from "react";
import { hrData } from "@/data/hr.data";
import { HRView } from "@/components/hr/hr-view";

export default function HRPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">품질부문 인사·면담 관리</h1>
        <p className="text-slate-500">품질부문 내 팀원들의 기본 인적 사항과 품질 자격 보유 현황, 그리고 면담 결과 이력과 리소스 과부하를 추적합니다.</p>
      </div>
      <Suspense fallback={<div className="text-sm text-slate-500">인사면담 데이터를 불러오는 중...</div>}>
        <HRView data={hrData} />
      </Suspense>
    </div>
  );
}
