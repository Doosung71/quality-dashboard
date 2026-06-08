"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard, FlaskConical, Wrench, ClipboardList, Users,
  AlertTriangle, ChevronRight,
} from "lucide-react"

const DEMO_NAV = [
  { href: "/review-demo", label: "메인 대시보드", icon: LayoutDashboard, exact: true },
  { href: "/review-demo/assets", label: "장비 현황", icon: Wrench },
  { href: "/review-demo/facilities", label: "시험실 관리", icon: FlaskConical },
  { href: "/review-demo/vendors", label: "검사·시험 일정", icon: ClipboardList },
  { href: "/review-demo/claims", label: "E2E 워크플로우", icon: ChevronRight },
  { href: "/review-demo/roles", label: "역할별 뷰", icon: Users },
]

export function DemoShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Demo Banner */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-amber-400 text-amber-900 flex items-center justify-center gap-2 py-2 px-4 text-sm font-bold shadow-md">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        Review Demo Mode — Test Data Only. No real users, no real data, no DB writes.
        <AlertTriangle className="w-4 h-4 shrink-0" />
      </div>

      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-56 bg-slate-900 text-white flex flex-col z-40 pt-10">
        <div className="px-6 py-5 border-b border-slate-700">
          <p className="text-[10px] text-amber-400 font-bold uppercase tracking-widest leading-tight">Demo Mode</p>
          <p className="text-sm font-semibold leading-tight mt-0.5">품질부문 대시보드</p>
          <p className="text-[10px] text-slate-500 mt-1">LS Cable QMS 2.0</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {DEMO_NAV.map(({ href, label, icon: Icon, exact }) => {
            const isActive = exact ? pathname === href : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                  isActive
                    ? "bg-slate-700 text-white"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{label}</span>
              </Link>
            )
          })}
        </nav>
        <div className="px-4 py-4 border-t border-slate-700">
          <p className="text-[10px] text-slate-500 leading-relaxed">
            이 모드는 외부 검토용 데모입니다.<br />
            실제 데이터·계정과 무관합니다.
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <div className="ml-56 flex flex-col min-h-screen pt-10">
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}
