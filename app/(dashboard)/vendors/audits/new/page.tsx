import { auth } from "@/auth"
import { redirect } from "next/navigation"
import vendorsData from "@/data/vendors.json"
import AuditForm from "./AuditForm"

export default async function NewAuditPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const vendors = vendorsData.vendors.map(v => ({ id: v.id, name: v.name }))

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">새 감사 등록</h1>
        <p className="text-slate-500 text-sm mt-1">Supplier Audit — 협력업체 현장 심사 결과를 기록합니다.</p>
      </div>
      <AuditForm vendors={vendors} defaultAuditor={session.user.name ?? ""} />
    </div>
  )
}
