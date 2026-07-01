"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { ChevronLeft, ChevronRight, Calendar, Plus, X } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

type Room = { id: string; name: string; siteId: string }
type Inspection = {
  id: string; inspNo: string; customer: string; projectName: string
  inspectionDate: string; endDate?: string | null
  assigneeName: string; status: string; result?: string | null
  region?: string | null
  room?: Room | null
}

// ─── 권역 배경색 (설계 판단 ④) ──────────────────────────────────────
const REGION_BG: Record<string, string> = {
  DOMESTIC:    "bg-amber-50   text-amber-900",
  EUROPE:      "bg-rose-50    text-rose-900",
  ASIA:        "bg-blue-50    text-blue-900",
  MIDDLE_EAST: "bg-emerald-50 text-emerald-900",
  OTHER:       "bg-purple-50  text-purple-900",
}
const REGION_LABEL: Record<string, string> = {
  DOMESTIC: "국내", EUROPE: "유럽", ASIA: "아시아", MIDDLE_EAST: "중동", OTHER: "기타",
}
// ─── 상태 좌측 테두리 색 (설계 판단 ④) ─────────────────────────────
const STATUS_BORDER: Record<string, string> = {
  SCHEDULED:   "border-l-blue-500",
  IN_PROGRESS: "border-l-amber-500",
  COMPLETED:   "border-l-emerald-500",
  CANCELLED:   "border-l-slate-400",
}
const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: "예정", IN_PROGRESS: "진행중", COMPLETED: "완료", CANCELLED: "취소",
}
const STATUS_BADGE: Record<string, string> = {
  SCHEDULED:   "bg-blue-100   text-blue-800   border-blue-200",
  IN_PROGRESS: "bg-amber-100  text-amber-800  border-amber-200",
  COMPLETED:   "bg-emerald-100 text-emerald-800 border-emerald-200",
  CANCELLED:   "bg-slate-100  text-slate-500  border-slate-200",
}

const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"]

function calendarItemClass(item: Inspection) {
  const bg = REGION_BG[item.region ?? ""] ?? "bg-slate-50 text-slate-800"
  const border = STATUS_BORDER[item.status] ?? "border-l-slate-400"
  return `${bg} ${border}`
}

export default function WitnessCalendar() {
  const router = useRouter()
  const now = new Date()
  const [year, setYear]   = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [items, setItems] = useState<Inspection[]>([])
  const [loading, setLoading] = useState(true)

  // 필터 (설계 판단 ⑤ — 단일 선택)
  const [filterRegion,   setFilterRegion]   = useState<string | null>(null)
  const [filterAssignee, setFilterAssignee] = useState<string | null>(null)
  const [filterStatus,   setFilterStatus]   = useState<string | null>(null)

  // 클릭 팝업 (설계 판단 ④)
  const [popupItem, setPopupItem] = useState<Inspection | null>(null)
  const popupRef = useRef<HTMLDivElement>(null)

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

  // 팝업 외부 클릭 시 닫기
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setPopupItem(null)
      }
    }
    if (popupItem) document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [popupItem])

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }
  function goToday() { setYear(now.getFullYear()); setMonth(now.getMonth() + 1) }

  // 필터 적용
  const filtered = items.filter(item => {
    if (filterRegion   && item.region       !== filterRegion)   return false
    if (filterAssignee && item.assigneeName !== filterAssignee) return false
    if (filterStatus   && item.status       !== filterStatus)   return false
    return true
  })

  // 필터용 목록 (이번 달 데이터 기준 동적 생성)
  const assignees = [...new Set(items.map(i => i.assigneeName))].sort()
  const regions   = [...new Set(items.map(i => i.region).filter(Boolean))] as string[]
  const statuses  = [...new Set(items.map(i => i.status))]

  // 캘린더 그리드
  const firstDay    = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  function getDayItems(day: number): Inspection[] {
    // 검사 기간(시작일~종료일) 전체에 걸쳐 표시. endDate 없으면 시작일만.
    const cellT = new Date(year, month - 1, day).setHours(0, 0, 0, 0)
    return filtered.filter(item => {
      const start = new Date(item.inspectionDate); start.setHours(0, 0, 0, 0)
      const startT = start.getTime()
      let endT = startT
      if (item.endDate) {
        const end = new Date(item.endDate); end.setHours(0, 0, 0, 0)
        endT = Math.max(end.getTime(), startT) // 잘못된 endDate(<시작일) 방어
      }
      return cellT >= startT && cellT <= endT
    })
  }
  const isToday = (day: number) =>
    day === now.getDate() && month === now.getMonth() + 1 && year === now.getFullYear()

  // 필터 칩 토글 (단일 선택: 같은 값 재클릭 → 해제)
  function toggleRegion(v: string)   { setFilterRegion(p   => p === v ? null : v) }
  function toggleAssignee(v: string) { setFilterAssignee(p => p === v ? null : v) }
  function toggleStatus(v: string)   { setFilterStatus(p   => p === v ? null : v) }

  const activeFilters = [filterRegion, filterAssignee, filterStatus].filter(Boolean).length

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

      {/* 필터 칩 (설계 판단 ⑤) */}
      <div className="space-y-2">
        {/* 권역 필터 */}
        {regions.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-semibold text-slate-400 uppercase mr-1">권역</span>
            {regions.map(r => (
              <button key={r} onClick={() => toggleRegion(r)}
                className={`text-[11px] px-2.5 py-0.5 rounded-full border font-medium transition-colors ${
                  filterRegion === r
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"
                }`}>
                {REGION_LABEL[r] ?? r}
              </button>
            ))}
          </div>
        )}
        {/* 담당자 필터 */}
        {assignees.length > 1 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-semibold text-slate-400 uppercase mr-1">담당자</span>
            {assignees.map(a => (
              <button key={a} onClick={() => toggleAssignee(a)}
                className={`text-[11px] px-2.5 py-0.5 rounded-full border font-medium transition-colors ${
                  filterAssignee === a
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"
                }`}>
                {a}
              </button>
            ))}
          </div>
        )}
        {/* 상태 필터 */}
        {statuses.length > 1 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-semibold text-slate-400 uppercase mr-1">상태</span>
            {statuses.map(s => (
              <button key={s} onClick={() => toggleStatus(s)}
                className={`text-[11px] px-2.5 py-0.5 rounded-full border font-medium transition-colors ${
                  filterStatus === s
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"
                }`}>
                {STATUS_LABEL[s] ?? s}
              </button>
            ))}
          </div>
        )}
        {/* 필터 초기화 */}
        {activeFilters > 0 && (
          <button
            onClick={() => { setFilterRegion(null); setFilterAssignee(null); setFilterStatus(null) }}
            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-600">
            <X className="w-3 h-3" /> 필터 초기화
          </button>
        )}
      </div>

      {/* 캘린더 */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
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
              const dayItems = day ? getDayItems(day) : []
              const isSun = idx % 7 === 0
              const isSat = idx % 7 === 6
              return (
                <div key={idx} className={`min-h-[100px] border-b border-r border-slate-100 p-1.5 ${
                  day ? "bg-white" : "bg-slate-50/50"
                } ${isSun ? "border-l-0" : ""}`}>
                  {day && (
                    <>
                      <span className={`text-xs font-semibold flex mb-1 w-6 h-6 items-center justify-center rounded-full ${
                        isToday(day)
                          ? "bg-indigo-600 text-white"
                          : isSun ? "text-rose-500" : isSat ? "text-blue-500" : "text-slate-700"
                      }`}>{day}</span>
                      <div className="space-y-0.5">
                        {dayItems.slice(0, 3).map(item => (
                          <button
                            key={item.id}
                            onClick={() => setPopupItem(p => p?.id === item.id ? null : item)}
                            className={`w-full text-left text-[10px] font-medium px-1.5 py-0.5 rounded border-l-4 truncate hover:opacity-80 transition-opacity ${calendarItemClass(item)}`}
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

      {/* 범례 */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-500">
        <span className="font-semibold text-slate-400 mr-1">권역</span>
        {Object.entries(REGION_LABEL).map(([k, v]) => (
          <span key={k} className="flex items-center gap-1">
            <span className={`w-3 h-3 rounded-sm ${REGION_BG[k]?.split(" ")[0]}`} />
            {v}
          </span>
        ))}
        <span className="font-semibold text-slate-400 ml-3 mr-1">상태(테두리)</span>
        {Object.entries(STATUS_LABEL).map(([k, v]) => (
          <span key={k} className="flex items-center gap-1">
            <span className={`w-1 h-3 rounded-full ${STATUS_BORDER[k]?.replace("border-l-", "bg-")}`} />
            {v}
          </span>
        ))}
      </div>

      {/* 클릭 팝업 (설계 판단 ④) */}
      {popupItem && (
        <div ref={popupRef} className="bg-white rounded-xl border border-slate-200 shadow-lg p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs text-slate-400">{popupItem.inspNo}</p>
              <p className="text-sm font-bold text-slate-900">{popupItem.customer}</p>
              <p className="text-xs text-slate-600">{popupItem.projectName}</p>
            </div>
            <button onClick={() => setPopupItem(null)} className="text-slate-300 hover:text-slate-500 shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-slate-400 mb-0.5">담당자</p>
              <p className="font-medium text-slate-800">{popupItem.assigneeName}</p>
            </div>
            <div>
              <p className="text-slate-400 mb-0.5">권역</p>
              <p className="font-medium text-slate-800">{REGION_LABEL[popupItem.region ?? ""] ?? "—"}</p>
            </div>
            <div>
              <p className="text-slate-400 mb-0.5">시험장</p>
              <p className="font-medium text-slate-800">{popupItem.room?.name ?? "—"}</p>
            </div>
            <div>
              <p className="text-slate-400 mb-0.5">상태</p>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_BADGE[popupItem.status]}`}>
                {STATUS_LABEL[popupItem.status]}
              </span>
            </div>
          </div>
          <button
            onClick={() => router.push(`/witness/${popupItem.id}`)}
            className="w-full text-center text-xs font-semibold text-indigo-600 hover:text-indigo-800 pt-2 border-t border-slate-100">
            상세보기 →
          </button>
        </div>
      )}

      {/* 이번 달 요약 리스트 */}
      {filtered.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700">
              {year}년 {month}월 입회검사 ({filtered.length}건
              {activeFilters > 0 && <span className="text-indigo-500"> · 필터 적용 중</span>})
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            {filtered.map(item => (
              <Link key={item.id} href={`/witness/${item.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_BADGE[item.status]}`}>
                  {STATUS_LABEL[item.status]}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{item.customer}</p>
                  <p className="text-xs text-slate-500 truncate">
                    {item.projectName}
                    {item.room && <span className="ml-1 text-slate-400">· {item.room.name}</span>}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-medium text-slate-700">
                    {new Date(item.inspectionDate).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" })}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {item.assigneeName}
                    {item.region && <span className={`ml-1 font-semibold ${
                      item.region === "EUROPE"      ? "text-rose-500"    :
                      item.region === "ASIA"        ? "text-blue-500"    :
                      item.region === "MIDDLE_EAST" ? "text-emerald-600" :
                      item.region === "DOMESTIC"    ? "text-amber-600"   : "text-purple-500"
                    }`}>({REGION_LABEL[item.region]})</span>}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-12 text-sm text-slate-400">
          {activeFilters > 0 ? "선택한 필터 조건에 해당하는 입회검사가 없습니다." : "이번 달 등록된 입회검사가 없습니다."}
        </div>
      )}
    </div>
  )
}
