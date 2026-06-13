"use client"

import { useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { CalendarDays, List } from "lucide-react"
import WitnessCalendar from "@/components/witness/witness-calendar"
import WitnessList from "@/components/witness/witness-list"

export default function WitnessPageClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [view, setView] = useState<"calendar" | "list">(
    (searchParams.get("view") as "calendar" | "list") ?? "calendar"
  )

  function switchView(v: "calendar" | "list") {
    setView(v)
    router.replace(`/witness?view=${v}`, { scroll: false })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">입회검사</h1>
          <p className="text-sm text-slate-500 mt-0.5">고객사 입회검사 일정·이력·VoC를 관리합니다.</p>
        </div>
        {/* 뷰 전환 */}
        <div className="flex items-center bg-slate-100 rounded-lg p-0.5 gap-0.5">
          <button
            onClick={() => switchView("calendar")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              view === "calendar" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            달력
          </button>
          <button
            onClick={() => switchView("list")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              view === "list" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <List className="w-3.5 h-3.5" />
            리스트
          </button>
        </div>
      </div>

      {view === "calendar" ? <WitnessCalendar /> : <WitnessList />}
    </div>
  )
}
