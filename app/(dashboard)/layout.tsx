import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { isAdmin } from "@/lib/admin"
import { DashboardShell } from "@/components/layout/dashboard-shell"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect("/login")

  return (
    <DashboardShell session={session} isAdminUser={isAdmin(session.user.email, session.user.role)}>
      {children}
    </DashboardShell>
  )
}
