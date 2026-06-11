"use client"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { NoticeModal } from "@/components/board/notice-modal"
import type { Session } from "next-auth"

export function DashboardShell({
  children,
  session,
}: {
  children: React.ReactNode
  session: Session
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()

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
      />
      <div className="lg:ml-56 flex flex-col min-h-screen">
        <Header
          onMenuOpen={() => setIsMobileMenuOpen(true)}
          session={session}
        />
        <NoticeModal />
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}
