import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { ArrowLeft, Search } from "lucide-react"
import InspectionDetailClient from "./InspectionDetailClient"

const resultConfig: Record<string, { label: string; badge: string }> = {
  PASS:             { label: "합격",       badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  FAIL:             { label: "불합격",     badge: "bg-rose-50 text-rose-700 border-rose-200" },
  CONDITIONAL_PASS: { label: "조건부합격", badge: "bg-amber-50 text-amber-700 border-amber-200" },
}

export default async function InspectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) redirect("/login")
  const { id } = await params

  const inspection = await prisma.sourceInspection.findUnique({
    where: { id },
    include: { createdBy: { select: { name: true, nickname: true } } },
  })
  if (!inspection) redirect("/vendors/inspections")

  const rc = resultConfig[inspection.result] ?? resultConfig.PASS

  return (
    <div className="flex flex-col gap-6">
      {/* 헤더 */}
      <div className="flex items-start gap-3">
        <Link href="/vendors/inspections" className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors shrink-0 mt-0.5">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Search className="w-4 h-4 text-emerald-500" />
            <h1 className="text-xl font-bold text-slate-900">{inspection.vendorName}</h1>
            <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded">{inspection.itemName}</span>
            {inspection.itemCode && <span className="text-xs text-slate-400">{inspection.itemCode}</span>}
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${rc.badge}`}>{rc.label}</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {new Date(inspection.inspectionDate).toLocaleDateString("ko-KR")} · 검사원: {inspection.inspector}
            {inspection.location && ` · ${inspection.location}`}
            {" · 등록: "}{inspection.createdBy.nickname ?? inspection.createdBy.name}
          </p>
        </div>
      </div>

      <InspectionDetailClient
        inspection={{
          id:             inspection.id,
          vendorId:       inspection.vendorId,
          vendorName:     inspection.vendorName,
          inspectionDate: inspection.inspectionDate.toISOString(),
          location:       inspection.location,
          itemName:       inspection.itemName,
          itemCode:       inspection.itemCode,
          quantity:       inspection.quantity,
          sampleSize:     inspection.sampleSize,
          result:         inspection.result,
          defectCount:    inspection.defectCount,
          defectRate:     inspection.defectRate,
          inspector:      inspection.inspector,
          notes:          inspection.notes,
          status:         inspection.status,
        }}
      />
    </div>
  )
}
