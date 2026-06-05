import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { ArrowLeft, PackageSearch } from "lucide-react"
import IncomingDetailClient from "./IncomingDetailClient"

const resultConfig: Record<string, { label: string; badge: string }> = {
  PASS:             { label: "합격",       badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  FAIL:             { label: "불합격",     badge: "bg-rose-50 text-rose-700 border-rose-200" },
  CONDITIONAL_PASS: { label: "조건부합격", badge: "bg-amber-50 text-amber-700 border-amber-200" },
}

export default async function IncomingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) redirect("/login")
  const { id } = await params

  const item = await prisma.incomingInspection.findUnique({
    where: { id },
    include: { createdBy: { select: { name: true, nickname: true } } },
  })
  if (!item) redirect("/vendors/incoming")

  const rc = resultConfig[item.result] ?? resultConfig.PASS

  return (
    <div className="flex flex-col gap-6">
      {/* 헤더 */}
      <div className="flex items-start gap-3">
        <Link href="/vendors/incoming" className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors shrink-0 mt-0.5">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <PackageSearch className="w-4 h-4 text-sky-500" />
            <h1 className="text-xl font-bold text-slate-900">{item.vendorName}</h1>
            <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded">{item.itemName}</span>
            {item.itemCode && <span className="text-xs text-slate-400">{item.itemCode}</span>}
            {item.poNumber && (
              <span className="text-xs bg-sky-50 text-sky-600 border border-sky-200 px-2 py-0.5 rounded">PO: {item.poNumber}</span>
            )}
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${rc.badge}`}>{rc.label}</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            입고: {new Date(item.receiptDate).toLocaleDateString("ko-KR")}
            {" · "}검사: {new Date(item.inspectionDate).toLocaleDateString("ko-KR")}
            {" · "}검사원: {item.inspector}
            {" · 등록: "}{item.createdBy.nickname ?? item.createdBy.name}
          </p>
        </div>
      </div>

      <IncomingDetailClient
        inspection={{
          id:             item.id,
          vendorName:     item.vendorName,
          poNumber:       item.poNumber,
          receiptDate:    item.receiptDate.toISOString(),
          inspectionDate: item.inspectionDate.toISOString(),
          itemName:       item.itemName,
          itemCode:       item.itemCode,
          quantity:       item.quantity,
          sampleSize:     item.sampleSize,
          result:         item.result,
          defectCount:    item.defectCount,
          defectRate:     item.defectRate,
          inspector:      item.inspector,
          notes:          item.notes,
        }}
      />
    </div>
  )
}
