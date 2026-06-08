import { facilitiesData } from "@/data/facilities.data"
import { assetData } from "@/data/assets.data"
import { testsData } from "@/data/tests.data"
import { FacilitiesView } from "@/components/facilities/facilities-view"

export default function ReviewDemoFacilitiesPage() {
  return (
    <div className="space-y-1">
      <h1 className="text-lg font-semibold text-slate-800">시험실 관리</h1>
      <p className="text-xs text-slate-400 mb-4">시험장 현황 및 인증·양산 시험 계획 (데모 데이터)</p>
      <FacilitiesView
        data={facilitiesData}
        assets={assetData.equipment}
        testsData={testsData}
      />
    </div>
  )
}
