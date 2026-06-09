"use client"

import { useState } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { NoticeBanner } from "@/components/board/notice-banner"
import type { Session } from "next-auth"

export function DashboardShell({
  children,
  session,
}: {
  children: React.ReactNode
  session: Session
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

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
        <NoticeBanner />
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}
