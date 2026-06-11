import { requireActivePageSession } from "@/lib/session-guard"
import { prisma } from "@/lib/prisma"
import vendorsData from "@/data/vendors.json"
import QpaNewForm from "./QpaNewForm"

export default async function QpaNewPage() {
  const session = await requireActivePageSession()

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
        <h1 className="text-2xl font-bold text-slate-900">공정감사 신규 등록</h1>
        <p className="text-slate-500 text-sm mt-1">QPA — LSC QPA 1.0 체크리스트 47개 항목을 생성합니다.</p>
      </div>
      <QpaNewForm vendors={vendors} defaultAuditor={session.user.name ?? ""} />
    </div>
  )
}
