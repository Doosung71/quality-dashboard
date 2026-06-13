"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Plus, Search, Filter } from "lucide-react"

type Inspection = {
  id: string; inspNo: string; customer: string; projectName: string
  projectNumber?: string | null; productName?: string | null
  inspectionDate: string; endDate?: string | null
  assigneeName: string; status: string; result?: string | null
}

const STATUS_COLOR: Record<string, string> = {
  SCHEDULED:   "bg-blue-50 text-blue-700 border-blue-200",
  IN_PROGRESS: "bg-amber-50 text-amber-700 border-amber-200",
  COMPLETED:   "bg-emerald-50 text-emerald-700 border-emerald-200",
  CANCELLED:   "bg-slate-100 text-slate-500 border-slate-200",
}
const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: "예정", IN_PROGRESS: "진행중", COMPLETED: "완료", CANCELLED: "취소"
}
const RESULT_COLOR: Record<string, string> = {
  PASS:             "text-emerald-700",
  FAIL:             "text-rose-700",
  CONDITIONAL_PASS: "text-amber-700",
}
const RESULT_LABEL: Record<string, string> = {
  PASS: "합격", FAIL: "불합격", CONDITIONAL_PASS: "조건부합격"
}

export default function WitnessList() {
  const [items, setItems]       = useState<Inspection[]>([])
  const [loading, setLoading]   = useState(true)
  const [query, setQuery]       = useState("")
  const [statusFilter, setStatusFilter] = useState("")

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/witness")
      const data = await res.json() as Inspection[]
      setItems(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const filtered = items.filter(i => {
    const q = query.toLowerCase()
    const matchQ = !q || i.customer.toLowerCase().includes(q) || i.projectName.toLowerCase().includes(q) ||
      (i.projectNumber ?? "").toLowerCase().includes(q) || i.assigneeName.toLowerCase().includes(q)
    const matchS = !statusFilter || i.status === statusFilter
    return matchQ && matchS
  })

  return (
    <div className="flex flex-col gap-4">
      {/* 툴바 */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            value={query} onChange={e => setQuery(e.target.value)}
            placeholder="고객사·프로젝트·담당자 검색..."
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
        <div className="flex items-center gap-1">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400">
            <option value="">전체 상태</option>
            <option value="SCHEDULED">예정</option>
            <option value="IN_PROGRESS">진행중</option>
            <option value="COMPLETED">완료</option>
            <option value="CANCELLED">취소</option>
          </select>
        </div>
        <Link href="/witness/new"
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
          <Plus className="w-3.5 h-3.5" />
          입회검사 등록
        </Link>
      </div>

      {/* 테이블 (desktop) */}
      <div className="hidden md:block bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">검사번호</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">고객사</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">프로젝트</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">검사 일정</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">담당자</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">상태</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">결과</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={7} className="py-12 text-center text-sm text-slate-400">불러오는 중...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="py-12 text-center text-sm text-slate-400">검색 결과가 없습니다.</td></tr>
            ) : filtered.map(item => (
              <tr key={item.id} className="hover:bg-slate-50 cursor-pointer">
                <td className="px-4 py-3">
                  <Link href={`/witness/${item.id}`} className="text-xs font-mono text-indigo-600 hover:underline">
                    {item.inspNo}
                  </Link>
                </td>
                <td className="px-4 py-3 font-medium text-slate-900">
                  <Link href={`/witness/${item.id}`} className="hover:text-indigo-600">{item.customer}</Link>
                </td>
                <td className="px-4 py-3 text-slate-600 max-w-[160px] truncate">{item.projectName}</td>
                <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                  {new Date(item.inspectionDate).toLocaleDateString("ko-KR")}
                  {item.endDate && <span className="text-slate-400"> ~ {new Date(item.endDate).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" })}</span>}
                </td>
                <td className="px-4 py-3 text-slate-600">{item.assigneeName}</td>
                <td className="px-4 py-3">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_COLOR[item.status]}`}>
                    {STATUS_LABEL[item.status]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {item.result && (
                    <span className={`text-xs font-semibold ${RESULT_COLOR[item.result]}`}>
                      {RESULT_LABEL[item.result]}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 카드 뷰 (mobile) */}
      <div className="md:hidden flex flex-col gap-2">
        {loading ? (
          <p className="text-center py-8 text-sm text-slate-400">불러오는 중...</p>
        ) : filtered.map(item => (
          <Link key={item.id} href={`/witness/${item.id}`}
            className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-slate-900">{item.customer}</p>
                <p className="text-sm text-slate-500 mt-0.5 truncate">{item.projectName}</p>
              </div>
              <span className={`shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_COLOR[item.status]}`}>
                {STATUS_LABEL[item.status]}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
              <span>{new Date(item.inspectionDate).toLocaleDateString("ko-KR")}</span>
              <span>·</span>
              <span>{item.assigneeName}</span>
              {item.result && (
                <><span>·</span><span className={`font-semibold ${RESULT_COLOR[item.result]}`}>{RESULT_LABEL[item.result]}</span></>
              )}
            </div>
          </Link>
        ))}
        {!loading && filtered.length === 0 && (
          <p className="text-center py-8 text-sm text-slate-400">검색 결과가 없습니다.</p>
        )}
      </div>
    </div>
  )
}
