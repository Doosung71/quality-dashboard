import { auth } from "@/auth"
import { redirect } from "next/navigation"
import WitnessForm from "./WitnessForm"

export default async function NewWitnessPage() {
  const session = await auth()
  if (!session) redirect("/login")

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">입회검사 등록</h1>
        <p className="text-slate-500 text-sm mt-1">고객사 입회검사 일정 및 사전 정보를 등록합니다.</p>
      </div>
      <WitnessForm defaultAssigneeName={session.user.name ?? ""} defaultAssigneeId={session.user.id} />
    </div>
  )
}
