"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard, FlaskConical, Users, Globe,
  X, MessageSquare, BookOpen, Newspaper, Wrench,
  ClipboardList, ShieldAlert, Briefcase,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import type { Role } from "@/lib/generated/prisma/client"

type NavChild = {
  href: string
  label: string
  roles: string[]
  readonlyFor: string[]
}

type NavItem = {
  href: string
  label: string
  icon: LucideIcon
  roles: string[]
  readonlyFor: string[]
  children?: NavChild[]
}

// 역할별 접근 가능한 메뉴
const ALL_NAV: NavItem[] = [
  {
    href: "/", label: "대시보드", icon: LayoutDashboard,
    roles: ["DIRECTOR", "ADMIN", "TEAM_LEAD", "PRACTITIONER"], readonlyFor: [],
  },

  // ── 품질 이슈 ─────────────────────────────────────────
  {
    href: "/qcost", label: "품질 비용 관리", icon: ShieldAlert,
    roles: ["DIRECTOR", "ADMIN", "TEAM_LEAD", "PRACTITIONER"], readonlyFor: ["PRACTITIONER"],
    children: [
      { href: "/claims", label: "고객 클레임",    roles: ["DIRECTOR", "ADMIN", "TEAM_LEAD", "PRACTITIONER"], readonlyFor: [] },
      { href: "/ncr",    label: "부적합품 (NCR)", roles: ["DIRECTOR", "ADMIN", "TEAM_LEAD", "PRACTITIONER"], readonlyFor: [] },
    ],
  },

  // ── 자산 관리 ─────────────────────────────────────────
  {
    href: "/assets", label: "자산 관리", icon: Wrench,
    roles: ["DIRECTOR", "ADMIN", "TEAM_LEAD", "PRACTITIONER"], readonlyFor: ["PRACTITIONER"],
  },

  // ── 입고품질관리 ──────────────────────────────────────
  {
    href: "/vendors", label: "입고품질관리", icon: ClipboardList,
    roles: ["DIRECTOR", "ADMIN", "TEAM_LEAD", "PRACTITIONER"], readonlyFor: [],
    children: [
      { href: "/vendors/incoming",    label: "수입검사",      roles: ["DIRECTOR", "ADMIN", "TEAM_LEAD", "PRACTITIONER"], readonlyFor: [] },
      { href: "/vendors/inspections", label: "출장검사",      roles: ["DIRECTOR", "ADMIN", "TEAM_LEAD", "PRACTITIONER"], readonlyFor: [] },
      { href: "/vendors/audits",      label: "협력업체 감사", roles: ["DIRECTOR", "ADMIN", "TEAM_LEAD", "PRACTITIONER"], readonlyFor: [] },
    ],
  },

  // ── 프로젝트 관리 ─────────────────────────────────────
  {
    href: "/projects", label: "프로젝트 관리", icon: Briefcase,
    roles: ["DIRECTOR", "ADMIN", "TEAM_LEAD", "PRACTITIONER"], readonlyFor: [],
    children: [
      { href: "/dashboard",        label: "입찰 프로젝트", roles: ["DIRECTOR", "ADMIN", "TEAM_LEAD", "PRACTITIONER"], readonlyFor: [] },
      { href: "/projects/awarded", label: "수주 프로젝트", roles: ["DIRECTOR", "ADMIN", "TEAM_LEAD", "PRACTITIONER"], readonlyFor: [] },
    ],
  },

  // ── 시험 및 품질 보증 ─────────────────────────────────
  {
    href: "/facilities", label: "시험 및 품질 보증", icon: FlaskConical,
    roles: ["DIRECTOR", "ADMIN", "TEAM_LEAD", "PRACTITIONER"], readonlyFor: [],
  },

  // ── 품질 지식 ─────────────────────────────────────────
  {
    href: "/knowledge", label: "지식 관리", icon: BookOpen,
    roles: ["DIRECTOR", "ADMIN", "TEAM_LEAD", "PRACTITIONER"], readonlyFor: [],
  },

  // ── 정보·조직 ─────────────────────────────────────────
  {
    href: "/intelligence", label: "외부 정보", icon: Globe,
    roles: ["DIRECTOR", "ADMIN", "TEAM_LEAD", "PRACTITIONER"], readonlyFor: [],
  },
  {
    href: "/hr", label: "인사·면담", icon: Users,
    roles: ["DIRECTOR", "ADMIN", "TEAM_LEAD"], readonlyFor: [],
  },
]

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  role: Role
}

export function Sidebar({ isOpen, onClose, role }: SidebarProps) {
  const pathname = usePathname()

  const navItems = ALL_NAV
    .filter(item => item.roles.includes(role))
    .map(item => ({
      ...item,
      isReadonly: item.readonlyFor.includes(role),
      children: item.children
        ?.filter(child => child.roles.includes(role))
        .map(child => ({ ...child, isReadonly: child.readonlyFor.includes(role) })),
    }))

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
        {navItems.map(({ href, label, icon: Icon, isReadonly, children }) => {
          const selfActive = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/")
          const hasActiveChild = children?.some(c => pathname === c.href || pathname.startsWith(c.href + "/")) ?? false
          const parentActive = selfActive || hasActiveChild

          return (
            <div key={href}>
              <Link href={href} onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                  parentActive ? "bg-slate-700 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"
                )}>
                <Icon className="w-4 h-4 shrink-0" />
                <span className="flex-1">{label}</span>
                {isReadonly && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-700 text-slate-400 leading-tight">조회</span>
                )}
              </Link>
              {children && children.length > 0 && (
                <div className="mt-0.5 ml-4 pl-3 space-y-0.5 border-l border-slate-700">
                  {children.map(({ href: childHref, label: childLabel, isReadonly: childReadonly }) => {
                    const childActive = pathname === childHref || pathname.startsWith(childHref + "/")
                    return (
                      <Link key={`${href}>${childHref}`} href={childHref} onClick={onClose}
                        className={cn(
                          "flex items-center px-2 py-1.5 rounded-md text-xs transition-colors",
                          childActive ? "bg-slate-600 text-white" : "text-slate-500 hover:bg-slate-800 hover:text-slate-300"
                        )}>
                        <span className="flex-1 leading-tight">{childLabel}</span>
                        {childReadonly && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-700 text-slate-400 leading-tight">조회</span>
                        )}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>
      <div className="px-3 py-3 border-t border-slate-700 space-y-1">
        <Link href="/board" onClick={onClose}
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
            pathname === "/board" ? "bg-slate-700 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"
          )}>
          <Newspaper className="w-4 h-4 shrink-0" />
          게시판
        </Link>
        <Link href="/feedback" onClick={onClose}
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
            pathname === "/feedback" ? "bg-slate-700 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"
          )}>
          <MessageSquare className="w-4 h-4 shrink-0" />
          피드백
        </Link>
      </div>
    </aside>
  )
}