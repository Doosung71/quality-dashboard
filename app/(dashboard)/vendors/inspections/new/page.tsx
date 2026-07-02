import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import vendorsData from "@/data/vendors.json"
import InspectionForm from "./InspectionForm"

export default async function NewInspectionPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const jsonVendors = vendorsData.vendors.map(v => ({
    id:       v.id,
    name:     v.name,
    location: v.location ?? "",
  }))

  const dbVendors = await prisma.vendor.findMany({
    select: { id: true, name: true, location: true },
    orderBy: { createdAt: "asc" },
  }).catch(() => [] as { id: string; name: string; location: string }[])

  const vendors = [...jsonVendors, ...dbVendors]

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">출장검사 결과 등록</h1>
        <p className="text-slate-500 text-sm mt-1">Source Inspection — 협력업체 현장 출장검사 결과를 기록합니다.</p>
      </div>
      <InspectionForm vendors={vendors} defaultInspector={session.user.name ?? ""} />
    </div>
  )
}
