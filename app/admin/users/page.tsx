import { auth } from "@/auth"
import { isAdmin } from "@/lib/admin"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { AdminUsersClient } from "./client"
import Link from "next/link"

export default async function AdminUsersPage() {
  const session = await auth()
  if (!session || !isAdmin(session.user.email, session.user.role)) redirect("/")

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
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 헤더 */}
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 bg-white border border-slate-200 rounded-lg px-3 py-2 hover:shadow-sm transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            대시보드로 돌아가기
          </Link>
          <h1 className="text-xl font-bold text-slate-800">사용자 관리</h1>
        </div>

        <AdminUsersClient users={users} />
      </div>
    </div>
  )
}
