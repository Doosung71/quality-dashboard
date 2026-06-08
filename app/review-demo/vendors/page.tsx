import { vendorsData } from "@/data/vendors.data"
import { PackageSearch, CheckCircle2, XCircle, AlertCircle } from "lucide-react"

const mockIncoming = [
  { id: "INC-001", vendorName: "(주)동아케미칼", itemName: "XLPE 절연 콤파운드", itemCode: "XLP-2200", poNumber: "PO-2026-0312", inspectionDate: "2026-05-28", receiptDate: "2026-05-25", inspector: "이재호", quantity: 2000, result: "PASS", defectRate: 0 },
  { id: "INC-002", vendorName: "세양금속", itemName: "동 피선 (Copper Rod)", itemCode: "CR-5N8", poNumber: "PO-2026-0288", inspectionDate: "2026-05-26", receiptDate: "2026-05-24", inspector: "박동현", quantity: 5000, result: "CONDITIONAL_PASS", defectRate: 0.12 },
  { id: "INC-003", vendorName: "(주)대진테크", itemName: "PVC 외장 쉬스재", itemCode: "PVC-HB3", poNumber: "PO-2026-0301", inspectionDate: "2026-05-22", receiptDate: "2026-05-20", inspector: "이재호", quantity: 1500, result: "FAIL", defectRate: 1.45 },
  { id: "INC-004", vendorName: "일진머티리얼즈", itemName: "초고압 절연 테이프", itemCode: "IT-525KV", poNumber: "PO-2026-0325", inspectionDate: "2026-06-01", receiptDate: "2026-05-30", inspector: "송민섭", quantity: 800, result: "PASS", defectRate: 0 },
]

const resultConfig: Record<string, { label: string; dot: string; badge: string }> = {
  PASS: { label: "합격", dot: "bg-emerald-400", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  FAIL: { label: "불합격", dot: "bg-rose-500", badge: "bg-rose-50 text-rose-700 border-rose-200" },
  CONDITIONAL_PASS: { label: "조건부합격", dot: "bg-amber-400", badge: "bg-amber-50 text-amber-700 border-amber-200" },
}

const gradeColor: Record<string, string> = {
  A: "bg-emerald-100 text-emerald-700",
  B: "bg-sky-100 text-sky-700",
  C: "bg-amber-100 text-amber-700",
  D: "bg-rose-100 text-rose-700",
}

export default function ReviewDemoVendorsPage() {
  const passCount = mockIncoming.filter(i => i.result === "PASS").length
  const failCount = mockIncoming.filter(i => i.result === "FAIL").length
  const condPass = mockIncoming.filter(i => i.result === "CONDITIONAL_PASS").length
  const avgDefect = mockIncoming.reduce((s, i) => s + i.defectRate, 0) / mockIncoming.length

  return (
    <div className="flex flex-col gap-8 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">검사·시험 일정</h1>
        <p className="text-slate-500 text-sm mt-1">수입검사 결과 및 협력사 현황 (데모 데이터)</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "전체 검사", value: mockIncoming.length, icon: PackageSearch, bg: "bg-slate-100", color: "text-slate-600" },
          { label: "합격", value: passCount, icon: CheckCircle2, bg: "bg-emerald-50", color: "text-emerald-500" },
          { label: "불합격·조건부", value: failCount + condPass, icon: XCircle, bg: "bg-rose-50", color: "text-rose-500" },
          { label: "평균 불량률", value: `${avgDefect.toFixed(2)}%`, icon: AlertCircle, bg: "bg-amber-50", color: "text-amber-500" },
        ].map(({ label, value, icon: Icon, bg, color }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <div>
              <p className="text-xs text-slate-500">{label}</p>
              <p className="text-2xl font-bold text-slate-900">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Incoming Inspection List */}
      <section className="bg-white rounded-xl border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-800">수입검사 결과</h2>
        </div>
        <div className="divide-y divide-slate-50">
          {mockIncoming.map(i => {
            const rc = resultConfig[i.result] ?? resultConfig.PASS
            return (
              <div key={i.id} className="flex items-center gap-4 px-5 py-4">
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${rc.dot}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-slate-900">{i.vendorName}</p>
                    <span className="text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{i.itemName}</span>
                    {i.itemCode && <span className="text-xs text-slate-400">{i.itemCode}</span>}
                    {i.poNumber && <span className="text-xs text-sky-500 bg-sky-50 px-1.5 py-0.5 rounded">PO: {i.poNumber}</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 flex-wrap">
                    <span>검사일: {new Date(i.inspectionDate).toLocaleDateString("ko-KR")}</span>
                    <span>검사원: {i.inspector}</span>
                    <span>수량: {i.quantity.toLocaleString()}</span>
                    {i.defectRate > 0 && (
                      <span className="text-rose-500 font-medium">불량률 {i.defectRate.toFixed(2)}%</span>
                    )}
                  </div>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${rc.badge}`}>{rc.label}</span>
              </div>
            )
          })}
        </div>
      </section>

      {/* Vendor List */}
      <section className="bg-white rounded-xl border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-800">협력사 현황</h2>
        </div>
        <div className="divide-y divide-slate-50">
          {vendorsData.vendors.map(v => (
            <div key={v.id} className="flex items-center gap-4 px-5 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900">{v.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">{v.mainItem} · {v.location}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs text-slate-500">{v.score}점</span>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${gradeColor[v.grade] ?? "bg-slate-100 text-slate-600"}`}>
                  {v.grade}등급
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
