import { auth } from "@/auth"
import { isAdmin } from "@/lib/admin"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { AdminUsersClient } from "./client"

export default async function AdminUsersPage() {
  const session = await auth()
  if (!session || !isAdmin(session.user.email)) redirect("/")

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true, name: true, email: true, role: true,
      status: true, department: true, employeeId: true,
      phone: true, createdAt: true, restrictedUntil: true,
    },
  })

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-xl font-bold text-slate-800 mb-6">사용자 관리</h1>
        <AdminUsersClient users={users} />
      </div>
    </div>
  )
}
