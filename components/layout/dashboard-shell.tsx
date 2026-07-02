"use client"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { NoticeModal } from "@/components/board/notice-modal"
import type { Session } from "next-auth"

export function DashboardShell({
  children,
  session,
  isAdminUser,
}: {
  children: React.ReactNode
  session: Session
  isAdminUser: boolean
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const pathname = usePathname()

  // localStorage에서 사이드바 접힘 상태 복원 (hydration 이후)
  useEffect(() => {
    const stored = localStorage.getItem("sidebar-collapsed")
    if (stored === "true") setIsCollapsed(true)
  }, [])

  const handleToggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev
      localStorage.setItem("sidebar-collapsed", String(next))
      return next
    })
  }

  useEffect(() => {
    const send = () => {
      fetch("/api/presence/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPage: pathname }),
      }).catch(() => {})
    }
    send()
    const id = setInterval(send, 45_000)
    return () => clearInterval(id)
  }, [pathname])

  return (
    <div className="min-h-screen bg-slate-50">
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-30 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      <Sidebar
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        role={session.user.role}
        isCollapsed={isCollapsed}
        onToggleCollapse={handleToggleCollapse}
      />
      <div className={cn(
        "flex flex-col min-h-screen transition-all duration-300",
        isCollapsed ? "lg:ml-14" : "lg:ml-56"
      )}>
        <Header
          onMenuOpen={() => setIsMobileMenuOpen(true)}
          session={session}
          isAdminUser={isAdminUser}
        />
        <NoticeModal />
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}
