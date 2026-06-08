"use client"

import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import Link from "next/link"
import { Menu, LogOut, CircleUserRound, HelpCircle, ShieldCheck } from "lucide-react"
import { RoleBadge } from "@/components/layout/role-gate"
import { displayName } from "@/lib/display-name"
import type { Session } from "next-auth"
import type { Role } from "@/lib/generated/prisma/client"

const titles: Record<string, string> = {
  "/": "메인 대시보드",
  "/qcost": "품질 비용 관리",
  "/claims": "고객 클레임",
  "/ncr": "부적합품보고 (NCR)",
  "/vendors": "입고품질관리",
  "/vendors/incoming": "수입검사",
  "/vendors/incoming/new": "수입검사 등록",
  "/vendors/inspections": "출장검사",
  "/vendors/inspections/new": "출장검사 등록",
  "/vendors/audits": "협력업체 감사",
  "/vendors/audits/new": "협력업체 감사 등록",
  "/knowledge": "지식 관리",
  "/facilities": "시험 및 품질 보증",
  "/assets": "자산 관리",
  "/projects": "프로젝트 관리",
  "/projects/awarded": "수주 프로젝트",
  "/dashboard": "입찰 프로젝트",
  "/intelligence": "외부 정보",
  "/hr": "인사·면담",
  "/board": "품질부문 게시판",
  "/feedback": "피드백 게시판",
  "/help": "사용 가이드",
}

function NavBtn({ href, icon: Icon, label, active }: {
  href: string; icon: React.ElementType; label: string; active: boolean
}) {
  return (
    <Link href={href} title={label}
      className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
        active ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
      }`}>
      <Icon className="w-4 h-4 shrink-0" />
      <span className="hidden lg:block">{label}</span>
    </Link>
  )
}

export function Header({ onMenuOpen, session }: { onMenuOpen: () => void; session: Session }) {
  const pathname = usePathname()
  const title = titles[pathname] ?? "대시보드"
  const name = displayName({ nickname: session.user.nickname, name: session.user.name })
  const role = session.user.role as Role
  const isAdmin = role === "ADMIN" || role === "DIRECTOR"

  return (
    <header className="h-14 border-b border-slate-200 bg-white flex items-center px-3 lg:px-6 gap-2 shrink-0 overflow-hidden">
      {/* 모바일 햄버거 */}
      <button onClick={onMenuOpen}
        className="lg:hidden p-2 -ml-1 rounded-md text-slate-500 hover:bg-slate-100 shrink-0"
        aria-label="메뉴 열기">
        <Menu className="w-5 h-5" />
      </button>

      {/* 페이지 제목 */}
      <h1 className="text-sm font-semibold text-slate-800 flex-1 truncate min-w-0">{title}</h1>

      {/* 우측 액션 영역 */}
      <div className="flex items-center gap-0.5 shrink-0">
        {/* 역할 배지 */}
        <span className="mr-1 shrink-0">
          <RoleBadge role={role} />
        </span>

        <div className="w-px h-5 bg-slate-200 mx-1 shrink-0" />

        <NavBtn href="/profile"     icon={CircleUserRound} label={name}        active={pathname === "/profile"} />
        <NavBtn href="/help"        icon={HelpCircle}      label="가이드"       active={pathname === "/help"} />
        {isAdmin && (
          <NavBtn href="/admin/users" icon={ShieldCheck}   label="사용자 관리"  active={pathname.startsWith("/admin")} />
        )}

        <div className="w-px h-5 bg-slate-200 mx-1" />

        <button onClick={() => signOut({ callbackUrl: "/login" })}
          className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
          title="로그아웃">
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  )
}
