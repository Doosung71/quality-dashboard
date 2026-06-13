"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard, FlaskConical,
  X, MessageSquare, Newspaper,
  ClipboardList, ShieldAlert, Briefcase, Layers, Wrench, CheckSquare, UserCheck,
  PanelLeftClose, PanelLeftOpen,
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
  href?: string          // 없으면 비링크 그룹 헤더
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

  // ── 프로젝트 관리 ─────────────────────────────────────────
  {
    href: "/projects", label: "프로젝트 관리", icon: Briefcase,
    roles: ALL, readonlyFor: [],
    children: [
      { href: "/dashboard",        label: "입찰 프로젝트", roles: ALL, readonlyFor: [] },
      { href: "/projects/awarded", label: "수주 프로젝트", roles: ALL, readonlyFor: [] },
    ],
  },

  // ── 공급망 품질관리 ──────────────────────────────────────
  {
    href: "/vendors", label: "공급망 품질관리", icon: ClipboardList,
    roles: ALL, readonlyFor: [],
    children: [
      { href: "/vendors/qpa",         label: "공정감사 (QPA)", roles: ALL, readonlyFor: [] },
      { href: "/vendors/inspections", label: "출장 검사",      roles: ALL, readonlyFor: [] },
      { href: "/vendors/incoming",    label: "수입 검사",      roles: ALL, readonlyFor: [] },
    ],
  },

  // ── 시험 및 품질 보증 ─────────────────────────────────────
  {
    href: "/facilities", label: "시험 및 품질 보증", icon: FlaskConical,
    roles: ALL, readonlyFor: [],
    children: [
      { href: "/facilities/analysis", label: "시험/분석 관리", roles: ALL, readonlyFor: [] },
    ],
  },

  // ── 시험설비/계측기 관리 ──────────────────────────────────
  {
    href: "/assets", label: "시험설비/계측기 관리", icon: Wrench,
    roles: ALL, readonlyFor: [],
    children: [
      { href: "/assets",          label: "전체 설비 현황", roles: ALL, readonlyFor: [] },
      { href: "/assets/new",      label: "설비 등록",      roles: ["DIRECTOR", "ADMIN", "TEAM_LEAD"], readonlyFor: [] },
      { href: "/assets/repairs",  label: "설비 수선",      roles: ["DIRECTOR", "ADMIN", "TEAM_LEAD"], readonlyFor: [] },
    ],
  },

  // ── 품질 이상/사후 관리 ───────────────────────────────────
  {
    href: "/quality-issues", label: "품질 이상/사후 관리", icon: ShieldAlert,
    roles: ALL, readonlyFor: [],
    children: [
      { href: "/ncr",      label: "부적합품 (NCR)", roles: ALL, readonlyFor: [] },
      { href: "/claims",   label: "고객 클레임",    roles: ALL, readonlyFor: [] },
      { href: "/qcost",    label: "품질 비용 관리", roles: ALL, readonlyFor: ["PRACTITIONER"] },
      { href: "/meetings", label: "회의록",         roles: ALL, readonlyFor: [] },
    ],
  },

  // ── 고객 품질 관리 ────────────────────────────────────────
  {
    href: "/witness", label: "고객 품질 관리", icon: UserCheck,
    roles: ALL, readonlyFor: [],
    children: [
      { href: "/witness", label: "입회검사", roles: ALL, readonlyFor: [] },
    ],
  },

  // ── 기준 정보 및 지원 ─────────────────────────────────────
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

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  role: Role
  isCollapsed: boolean
  onToggleCollapse: () => void
}

export function Sidebar({ isOpen, onClose, role, isCollapsed, onToggleCollapse }: SidebarProps) {
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
            {/* 접힘 상태: 펼치기 버튼 헤더 하단 */}
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
            {/* 펼침 상태: 접기 버튼 헤더 우측 */}
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
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto overflow-x-hidden">
        {navItems.map(({ href, label, icon: Icon, isReadonly, children }) => {
          const hasActiveChild = children?.some(c => pathname === c.href || pathname.startsWith(c.href + "/")) ?? false
          const selfActive = href
            ? (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/"))
            : false
          const parentActive = selfActive || hasActiveChild
          // 접힌 상태에서 이동할 대상: 자체 href 또는 첫 번째 자식 href
          const targetHref = href ?? children?.[0]?.href

          if (isCollapsed) {
            return (
              <div key={href ?? label} className="flex justify-center">
                {targetHref
                  ? iconOnlyLink(targetHref, label, Icon, parentActive)
                  : (
                    <div
                      title={label}
                      className={cn(
                        "flex items-center justify-center w-10 h-10 rounded-md",
                        parentActive ? "text-slate-300" : "text-slate-600"
                      )}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                  )
                }
              </div>
            )
          }

          // 펼침 상태 — 기존 레이아웃
          const innerContent = (
            <>
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{label}</span>
              {isReadonly && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-700 text-slate-400 leading-tight">조회</span>
              )}
            </>
          )

          return (
            <div key={href ?? label}>
              {href ? (
                <Link href={href} onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                    parentActive ? "bg-slate-700 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"
                  )}>
                  {innerContent}
                </Link>
              ) : (
                <div className={cn(
                  "flex items-center gap-3 px-3 py-2 text-sm cursor-default",
                  parentActive ? "text-slate-300" : "text-slate-500"
                )}>
                  {innerContent}
                </div>
              )}
              {children && children.length > 0 && (
                <div className="mt-0.5 ml-4 pl-3 space-y-0.5 border-l border-slate-700">
                  {children.map(({ href: childHref, label: childLabel, isReadonly: childReadonly }) => {
                    const childActive = pathname === childHref || pathname.startsWith(childHref + "/")
                    return (
                      <Link key={`${href ?? label}>${childHref}`} href={childHref} onClick={onClose}
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

      {/* 하단: 소통 채널 + 접기 토글 */}
      <div className={cn(
        "border-t border-slate-700",
        isCollapsed ? "px-2 py-3 space-y-1" : "px-3 py-3 space-y-1"
      )}>
        {!isCollapsed && (
          <p className="px-3 pb-0.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">소통 채널</p>
        )}

        {isCollapsed ? (
          <>
            {iconOnlyLink("/my-job", "내 할 일", CheckSquare, pathname === "/my-job")}
            {iconOnlyLink("/board", "게시판", Newspaper, pathname === "/board")}
            {iconOnlyLink("/feedback", "피드백", MessageSquare, pathname === "/feedback")}
          </>
        ) : (
          <>
            <Link href="/my-job" onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                pathname === "/my-job" ? "bg-slate-700 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"
              )}>
              <CheckSquare className="w-4 h-4 shrink-0" />
              내 할 일
            </Link>
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
          </>
        )}

      </div>
    </aside>
  )
}
