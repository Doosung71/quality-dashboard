"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight, Calendar, Plus } from "lucide-react"
import Link from "next/link"

type Inspection = {
  id: string; inspNo: string; customer: string; projectName: string
  inspectionDate: string; endDate?: string | null
  assigneeName: string; status: string; result?: string | null
}

const STATUS_COLOR: Record<string, string> = {
  SCHEDULED:   "bg-blue-100 text-blue-800 border-blue-200",
  IN_PROGRESS: "bg-amber-100 text-amber-800 border-amber-200",
  COMPLETED:   "bg-emerald-100 text-emerald-800 border-emerald-200",
  CANCELLED:   "bg-slate-100 text-slate-500 border-slate-200",
}

const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: "예정", IN_PROGRESS: "진행중", COMPLETED: "완료", CANCELLED: "취소"
}

const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"]

export default function WitnessCalendar() {
  const router = useRouter()
  const now = new Date()
  const [year, setYear]   = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1) // 1-based
  const [items, setItems] = useState<Inspection[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/witness?year=${year}&month=${month}`)
      const data = await res.json() as Inspection[]
      setItems(data)
    } finally {
      setLoading(false)
    }
  }, [year, month])

  useEffect(() => { fetchData() }, [fetchData])

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }
  function goToday() { setYear(now.getFullYear()); setMonth(now.getMonth() + 1) }

  // Build calendar grid
  const firstDay = new Date(year, month - 1, 1).getDay() // 0=Sun
  const daysInMonth = new Date(year, month, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null)

  function getInspectionsForDay(day: number): Inspection[] {
    return items.filter(item => {
      const d = new Date(item.inspectionDate)
      return d.getDate() === day && d.getMonth() + 1 === month && d.getFullYear() === year
    })
  }

  const isToday = (day: number) =>
    day === now.getDate() && month === now.getMonth() + 1 && year === now.getFullYear()

  return (
    <div className="flex flex-col gap-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h2 className="text-lg font-bold text-slate-900 min-w-[120px] text-center">
            {year}년 {month}월
          </h2>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600">
            <ChevronRight className="w-4 h-4" />
          </button>
          <button onClick={goToday} className="ml-1 px-2.5 py-1 text-xs text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">
            오늘
          </button>
        </div>
        <Link href="/witness/new"
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
          <Plus className="w-3.5 h-3.5" />
          입회검사 등록
        </Link>
      </div>

      {/* 달력 */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 border-b border-slate-100">
          {DAY_NAMES.map((d, i) => (
            <div key={d} className={`py-2 text-center text-xs font-semibold ${
              i === 0 ? "text-rose-500" : i === 6 ? "text-blue-500" : "text-slate-500"
            }`}>{d}</div>
          ))}
        </div>

        {loading ? (
          <div className="h-80 flex items-center justify-center text-sm text-slate-400">
            <Calendar className="w-5 h-5 mr-2 animate-pulse" />불러오는 중...
          </div>
        ) : (
          <div className="grid grid-cols-7">
            {cells.map((day, idx) => {
              const dayItems = day ? getInspectionsForDay(day) : []
              const isSun = idx % 7 === 0
              const isSat = idx % 7 === 6
              return (
                <div key={idx} className={`min-h-[100px] border-b border-r border-slate-100 p-1.5 ${
                  day ? "bg-white" : "bg-slate-50/50"
                } ${isSun ? "border-l-0" : ""}`}>
                  {day && (
                    <>
                      <span className={`text-xs font-semibold block mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                        isToday(day)
                          ? "bg-indigo-600 text-white"
                          : isSun ? "text-rose-500" : isSat ? "text-blue-500" : "text-slate-700"
                      }`}>{day}</span>
                      <div className="space-y-0.5">
                        {dayItems.slice(0, 3).map(item => (
                          <button
                            key={item.id}
                            onClick={() => router.push(`/witness/${item.id}`)}
                            className={`w-full text-left text-[10px] font-medium px-1.5 py-0.5 rounded border truncate hover:opacity-80 transition-opacity ${STATUS_COLOR[item.status]}`}
                            title={`${item.customer} — ${item.projectName}\n담당: ${item.assigneeName}`}
                          >
                            {item.customer}
                          </button>
                        ))}
                        {dayItems.length > 3 && (
                          <span className="text-[10px] text-slate-400 pl-1">+{dayItems.length - 3}건</span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 이번 달 요약 리스트 */}
      {items.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700">{year}년 {month}월 입회검사 ({items.length}건)</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {items.map(item => (
              <Link key={item.id} href={`/witness/${item.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_COLOR[item.status]}`}>
                  {STATUS_LABEL[item.status]}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{item.customer}</p>
                  <p className="text-xs text-slate-500 truncate">{item.projectName}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-medium text-slate-700">
                    {new Date(item.inspectionDate).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" })}
                  </p>
                  <p className="text-[10px] text-slate-400">{item.assigneeName}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="text-center py-12 text-sm text-slate-400">
          이번 달 등록된 입회검사가 없습니다.
        </div>
      )}
    </div>
  )
}
