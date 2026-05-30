import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { MainDashboard } from "./MainDashboard"

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect("/login")

  return (
    <MainDashboard
      role={session.user.role ?? "PRACTITIONER"}
      userName={session.user.name ?? ""}
      userId={session.user.id ?? ""}
    />
  )
}
