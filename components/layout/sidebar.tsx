"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, FlaskConical, TriangleAlert, Building2, Users, Globe, ShieldCheck, X, MessageSquare, CircleUserRound, HelpCircle, BookOpen } from "lucide-react"
import type { Role } from "@/lib/generated/prisma/client"

// 역할별 접근 가능한 메뉴
const ALL_NAV = [
  { href: "/",             label: "대시보드",       icon: LayoutDashboard, roles: ["DIRECTOR", "TEAM_LEAD", "PRACTITIONER"] },
  { href: "/facilities",   label: "시험장·시험 현황", icon: FlaskConical,    roles: ["DIRECTOR", "TEAM_LEAD", "PRACTITIONER"] },
  { href: "/claims",       label: "고객 클레임",      icon: TriangleAlert,   roles: ["DIRECTOR", "TEAM_LEAD", "PRACTITIONER"] },
  { href: "/vendors",      label: "협력업체",         icon: Building2,       roles: ["DIRECTOR", "TEAM_LEAD"] },
  { href: "/hr",           label: "인사·면담",        icon: Users,           roles: ["DIRECTOR", "TEAM_LEAD"] },
  { href: "/intelligence", label: "외부 정보",        icon: Globe,           roles: ["DIRECTOR"] },
  { href: "/knowledge",   label: "지식 검색",         icon: BookOpen,        roles: ["DIRECTOR", "TEAM_LEAD", "PRACTITIONER"] },
] as const

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  role: Role
}

export function Sidebar({ isOpen, onClose, role }: SidebarProps) {
  const pathname = usePathname()
  const navItems = ALL_NAV.filter(item => (item.roles as readonly string[]).includes(role))

  return (
    <aside className={cn(
      "fixed inset-y-0 left-0 w-56 bg-slate-900 text-white flex flex-col z-40 transition-transform duration-300 ease-in-out",
      "lg:translate-x-0",
      isOpen ? "translate-x-0" : "-translate-x-full"
    )}>
      <div className="px-6 py-5 border-b border-slate-700 flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-400 leading-tight">LS전선</p>
          <p className="text-sm font-semibold leading-tight mt-0.5">품질부문 대시보드</p>
        </div>
        <button onClick={onClose} className="lg:hidden p-1 rounded text-slate-400 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href)
          return (
            <Link key={href} href={href} onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                active ? "bg-slate-700 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"
              )}>
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>
      <div className="px-3 py-3 border-t border-slate-700 space-y-1">
        <Link href="/feedback" onClick={onClose}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
          <MessageSquare className="w-4 h-4 shrink-0" />
          피드백
        </Link>
        <Link href="/profile" onClick={onClose}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
          <CircleUserRound className="w-4 h-4 shrink-0" />
          내 프로필
        </Link>
        <Link href="/help" onClick={onClose}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
          <HelpCircle className="w-4 h-4 shrink-0" />
          사용 가이드
        </Link>
        {role === "DIRECTOR" && (
          <Link href="/admin/users" onClick={onClose}
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            사용자 관리
          </Link>
        )}
      </div>
    </aside>
  )
}
