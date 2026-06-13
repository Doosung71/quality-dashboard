"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard, FlaskConical,
  X, MessageSquare, Newspaper,
  ClipboardList, ShieldAlert, Briefcase, Layers, Wrench, CheckSquare, UserCheck,
  PanelLeftClose, PanelLeftOpen, ChevronDown, ChevronRight,
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
  href?: string
  label: string
  icon: LucideIcon
  roles: string[]
  readonlyFor: string[]
  children?: NavChild[]
}

const ALL = ["DIRECTOR", "ADMIN", "TEAM_LEAD", "PRACTITIONER"]

const ALL_NAV: NavItem[] = [
  {
    href: "/", label: "대시보드", icon: LayoutDashboard,
    roles: ALL, readonlyFor: [],
  },
  {
    label: "프로젝트 관리", icon: Briefcase,
    roles: ALL, readonlyFor: [],
    children: [
      { href: "/dashboard",        label: "입찰 프로젝트", roles: ALL, readonlyFor: [] },
      { href: "/projects/awarded", label: "수주 프로젝트", roles: ALL, readonlyFor: [] },
    ],
  },
  {
    label: "공급망 품질관리", icon: ClipboardList,
    roles: ALL, readonlyFor: [],
    children: [
      { href: "/vendors/qpa",         label: "공정감사 (QPA)", roles: ALL, readonlyFor: [] },
      { href: "/vendors/inspections", label: "출장 검사",      roles: ALL, readonlyFor: [] },
      { href: "/vendors/incoming",    label: "수입 검사",      roles: ALL, readonlyFor: [] },
    ],
  },
  {
    label: "시험 및 품질 보증", icon: FlaskConical,
    roles: ALL, readonlyFor: [],
    children: [
      { href: "/facilities/analysis", label: "시험/분석 관리", roles: ALL, readonlyFor: [] },
    ],
  },
  {
    label: "시험설비/계측기 관리", icon: Wrench,
    roles: ALL, readonlyFor: [],
    children: [
      { href: "/assets",          label: "전체 설비 현황", roles: ALL, readonlyFor: [] },
      { href: "/assets/new",      label: "설비 등록",      roles: ["DIRECTOR", "ADMIN", "TEAM_LEAD"], readonlyFor: [] },
      { href: "/assets/repairs",  label: "설비 수선",      roles: ["DIRECTOR", "ADMIN", "TEAM_LEAD"], readonlyFor: [] },
    ],
  },
  {
    label: "품질 이상/사후 관리", icon: ShieldAlert,
    roles: ALL, readonlyFor: [],
    children: [
      { href: "/ncr",      label: "부적합품 (NCR)", roles: ALL, readonlyFor: [] },
      { href: "/claims",   label: "고객 클레임",    roles: ALL, readonlyFor: [] },
      { href: "/qcost",    label: "품질 비용 관리", roles: ALL, readonlyFor: ["PRACTITIONER"] },
      { href: "/meetings", label: "회의록",         roles: ALL, readonlyFor: [] },
    ],
  },
  {
    label: "고객 품질 관리", icon: UserCheck,
    roles: ALL, readonlyFor: [],
    children: [
      { href: "/witness", label: "입회검사", roles: ALL, readonlyFor: [] },
    ],
  },
  {
    label: "기준 정보 및 지원", icon: Layers,
    roles: ALL, readonlyFor: [],
    children: [
      { href: "/knowledge/status", label: "지식/규격 현황", roles: ALL,                                readonlyFor: [] },
      { href: "/knowledge",        label: "지식/규격 등록", roles: ["DIRECTOR", "ADMIN", "TEAM_LEAD"], readonlyFor: [] },
      { href: "/knowledge/search", label: "AI 지식 검색",  roles: ALL,                                readonlyFor: [] },
      { href: "/intelligence",     label: "외부 정보",     roles: ["DIRECTOR", "ADMIN", "TEAM_LEAD"], readonlyFor: [] },
      { href: "/hr",               label: "인사·면담",     roles: ["DIRECTOR", "ADMIN"],              readonlyFor: [] },
    ],
  },
]

// 현재 경로가 속한 섹션 label 목록 반환
function getActiveSections(pathname: string): Set<string> {
  const active = new Set<string>()
  for (const item of ALL_NAV) {
    if (!item.children) continue
    const isActive = item.children.some(
      c => pathname === c.href || pathname.startsWith(c.href + "/")
    )
    if (isActive) active.add(item.label)
  }
  return active
}

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  role: Role
  isCollapsed: boolean
  onToggleCollapse: () => void
}

export function Sidebar({ isOpen, onClose, role, isCollapsed, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname()

  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    () => getActiveSections(pathname)
  )

  // 경로 이동 시 해당 섹션 자동 펼침
  useEffect(() => {
    setExpandedSections(prev => {
      const active = getActiveSections(pathname)
      if (active.size === 0) return prev
      const next = new Set(prev)
      active.forEach(label => next.add(label))
      return next
    })
  }, [pathname])

  const toggleSection = (label: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  }

  const navItems = ALL_NAV
    .filter(item => item.roles.includes(role))
    .map(item => ({
      ...item,
      isReadonly: item.readonlyFor.includes(role),
      children: item.children
        ?.filter(child => child.roles.includes(role))
        .map(child => ({ ...child, isReadonly: child.readonlyFor.includes(role) })),
    }))
    .filter(item => item.href !== undefined || (item.children && item.children.length > 0))

  const iconOnlyLink = (href: string, label: string, Icon: LucideIcon, active: boolean) => (
    <Link
      href={href}
      title={label}
      className={cn(
        "flex items-center justify-center w-10 h-10 mx-auto rounded-md transition-colors",
        active ? "bg-slate-700 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"
      )}
    >
      <Icon className="w-5 h-5" />
    </Link>
  )

  return (
    <aside className={cn(
      "fixed inset-y-0 left-0 bg-slate-900 text-white flex flex-col z-40 transition-all duration-300 ease-in-out",
      isCollapsed ? "w-14" : "w-56",
      "lg:translate-x-0",
      isOpen ? "translate-x-0" : "-translate-x-full"
    )}>
      {/* 헤더 */}
      <div className={cn(
        "py-4 border-b border-slate-700 flex items-center gap-2",
        isCollapsed ? "justify-center px-2 flex-col" : "justify-between px-4"
      )}>
        {isCollapsed ? (
          <>
            <div className="w-8 h-8 bg-slate-700 rounded-md flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-white">Q</span>
            </div>
            <button
              onClick={onToggleCollapse}
              title="사이드바 펼치기"
              className="hidden lg:flex items-center justify-center w-8 h-8 rounded-md text-slate-500 hover:bg-slate-700 hover:text-white transition-colors"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
          </>
        ) : (
          <>
            <div className="min-w-0">
              <p className="text-xs text-slate-400 leading-tight">LS전선</p>
              <p className="text-sm font-semibold leading-tight mt-0.5">품질부문 대시보드</p>
            </div>
            <button
              onClick={onToggleCollapse}
              title="사이드바 접기"
              className="hidden lg:flex items-center justify-center w-8 h-8 rounded-md text-slate-500 hover:bg-slate-700 hover:text-white transition-colors shrink-0"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </>
        )}
        <button onClick={onClose} className="lg:hidden p-1 rounded text-slate-400 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 네비게이션 */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {navItems.map(({ href, label, icon: Icon, children }) => {
          const hasActiveChild = children?.some(c => pathname === c.href || pathname.startsWith(c.href + "/")) ?? false
          const selfActive = href
            ? (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/"))
            : false
          const parentActive = selfActive || hasActiveChild
          const isExpanded = expandedSections.has(label)
          const targetHref = href ?? children?.[0]?.href

          // 접힌 사이드바: 아이콘만
          if (isCollapsed) {
            return (
              <div key={label} className="flex justify-center">
                {targetHref
                  ? iconOnlyLink(targetHref, label, Icon, parentActive)
                  : (
                    <div title={label} className={cn(
                      "flex items-center justify-center w-10 h-10 rounded-md",
                      parentActive ? "text-slate-300" : "text-slate-600"
                    )}>
                      <Icon className="w-5 h-5" />
                    </div>
                  )
                }
              </div>
            )
          }

          // 자식 없는 단독 링크 (대시보드)
          if (!children || children.length === 0) {
            return (
              <Link key={label} href={href!} onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                  selfActive ? "bg-slate-700 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"
                )}>
                <Icon className="w-4 h-4 shrink-0" />
                <span className="flex-1">{label}</span>
              </Link>
            )
          }

          // 아코디언 섹션
          return (
            <div key={label}>
              <button
                onClick={() => toggleSection(label)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                  parentActive ? "text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="flex-1 text-left">{label}</span>
                {isExpanded
                  ? <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-60" />
                  : <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-40" />
                }
              </button>

              {/* 자식 메뉴 — max-height 트랜지션 */}
              <div className={cn(
                "overflow-hidden transition-all duration-200 ease-in-out",
                isExpanded ? "max-h-96" : "max-h-0"
              )}>
                <div className="mt-0.5 ml-4 pl-3 pb-1 space-y-0.5 border-l border-slate-700">
                  {children.map(({ href: childHref, label: childLabel, isReadonly: childReadonly }) => {
                    const childActive = pathname === childHref || pathname.startsWith(childHref + "/")
                    return (
                      <Link key={childHref} href={childHref} onClick={onClose}
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
              </div>
            </div>
          )
        })}
      </nav>

      {/* 하단: 소통 채널 */}
      <div className={cn(
        "border-t border-slate-700",
        isCollapsed ? "px-2 py-3 space-y-1" : "px-3 py-3 space-y-0.5"
      )}>
        {!isCollapsed && (
          <p className="px-3 pb-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">소통 채널</p>
        )}
        {isCollapsed ? (
          <>
            {iconOnlyLink("/my-job", "내 할 일", CheckSquare, pathname === "/my-job")}
            {iconOnlyLink("/board", "게시판", Newspaper, pathname === "/board")}
            {iconOnlyLink("/feedback", "피드백", MessageSquare, pathname === "/feedback")}
          </>
        ) : (
          <>
            {[
              { href: "/my-job",   label: "내 할 일", Icon: CheckSquare },
              { href: "/board",    label: "게시판",   Icon: Newspaper   },
              { href: "/feedback", label: "피드백",   Icon: MessageSquare },
            ].map(({ href, label, Icon }) => (
              <Link key={href} href={href} onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                  pathname === href ? "bg-slate-700 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"
                )}>
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </Link>
            ))}
          </>
        )}
      </div>
    </aside>
  )
}
