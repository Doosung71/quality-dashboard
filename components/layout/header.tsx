"use client"

import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import Link from "next/link"
import { Menu, LogOut } from "lucide-react"
import { RoleBadge } from "@/components/layout/role-gate"
import { displayName } from "@/lib/display-name"
import type { Session } from "next-auth"
import type { Role } from "@/lib/generated/prisma/client"

const titles: Record<string, string> = {
  "/": "메인 대시보드",
  "/qcost": "품질비용(Q-Cost)",
  "/claims": "고객 클레임",
  "/ncr": "부적합품보고(NCR)",
  "/vendors": "공급망관리",
  "/knowledge": "지식저장소(QKM)",
  "/facilities": "시험장·시험 현황",
  "/dashboard": "입찰검토시스템",
  "/intelligence": "외부 정보",
  "/hr": "인사·면담",
}

export function Header({ onMenuOpen, session }: { onMenuOpen: () => void; session: Session }) {
  const pathname = usePathname()
  const title = titles[pathname] ?? "대시보드"
  const name = displayName({ nickname: session.user.nickname, name: session.user.name })
  const role = session.user.role as Role

  return (
    <header className="h-14 border-b border-slate-200 bg-white flex items-center px-4 lg:px-6 gap-3 shrink-0">
      <button onClick={onMenuOpen}
        className="lg:hidden p-2 -ml-1 rounded-md text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        aria-label="메뉴 열기">
        <Menu className="w-5 h-5" />
      </button>
      <h1 className="text-sm font-semibold text-slate-800 flex-1">{title}</h1>
      <div className="flex items-center gap-3">
        <RoleBadge role={role} />
        <Link href="/profile" className="text-sm text-slate-600 hidden sm:block hover:text-slate-900 hover:underline transition-colors">{name}</Link>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          title="로그아웃">
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  )
}
