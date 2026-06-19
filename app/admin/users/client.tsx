"use client"

import React, { useState, useEffect, useCallback } from "react"

// ─── 접속 현황 ───────────────────────────────────────────────────────────────

type PresenceUser = {
  id: string
  name: string
  role: string
  currentPage: string
  lastSeen: string
}

const PAGE_LABELS: [string, string][] = [
  ["/vendors/incoming",    "수입검사"],
  ["/vendors/inspections", "출장검사"],
  ["/vendors/audits",      "협력업체감사"],
  ["/vendors/qpa",         "QPA 공정감사"],
  ["/vendors",             "공급망 품질관리"],
  ["/assets/repairs",      "설비 수선"],
  ["/assets/new",          "설비 등록"],
  ["/assets",              "시험설비/계측기"],
  ["/facilities",          "시험/분석 관리"],
  ["/claims",              "클레임"],
  ["/ncr",                 "부적합품(NCR)"],
  ["/board",               "게시판"],
  ["/feedback",            "소통방"],
  ["/hr",                  "인사·면담"],
  ["/knowledge",           "지식관리"],
  ["/intelligence",        "외부정보"],
  ["/projects/awarded",    "수주 프로젝트"],
  ["/projects",            "프로젝트관리"],
  ["/admin",               "관리자"],
  ["/profile",             "내 프로필"],
  ["/help",                "사용 가이드"],
  ["/",                    "대시보드"],
]

function getPageLabel(path: string): string {
  for (const [prefix, label] of PAGE_LABELS) {
    if (path.startsWith(prefix)) return label
  }
  return path
}

function relativeTime(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 10) return "방금 전"
  if (diff < 60) return `${diff}초 전`
  const m = Math.floor(diff / 60)
  if (m < 60) return `${m}분 전`
  return `${Math.floor(m / 60)}시간 전`
}

const ROLE_COLOR: Record<string, string> = {
  PRACTITIONER: "bg-indigo-100 text-indigo-700",
  TEAM_LEAD:    "bg-violet-100 text-violet-700",
  DIRECTOR:     "bg-emerald-100 text-emerald-700",
  ADMIN:        "bg-rose-100 text-rose-700",
}

function PresenceView() {
  const [users, setUsers] = useState<PresenceUser[]>([])
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)

  const load = useCallback(async () => {
    const res = await fetch("/api/presence")
    if (res.ok) setUsers(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // 15초마다 자동 갱신
  useEffect(() => {
    const id = setInterval(() => {
      load()
      setTick(t => t + 1)
    }, 15_000)
    return () => clearInterval(id)
  }, [load])

  // 상대시간 표시를 매초 갱신
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 10_000)
    return () => clearInterval(id)
  }, [])

  void tick

  const ROLE_LABEL_P: Record<string, string> = {
    PRACTITIONER: "실무자", TEAM_LEAD: "팀장", DIRECTOR: "임원", ADMIN: "관리자"
  }

  return (
    <div className="space-y-4">
      {/* 요약 카드 */}
      <div className="flex items-center gap-4">
        <div className="bg-white border border-slate-200 rounded-xl px-6 py-4 flex items-center gap-4">
          <div className="relative">
            <div className="w-3 h-3 bg-emerald-500 rounded-full" />
            {users.length > 0 && (
              <div className="absolute inset-0 w-3 h-3 bg-emerald-400 rounded-full animate-ping opacity-75" />
            )}
          </div>
          <div>
            <p className="text-3xl font-bold text-slate-900">{users.length}</p>
            <p className="text-xs text-slate-500 mt-0.5">현재 접속 중</p>
          </div>
        </div>
        <button
          onClick={() => { setLoading(true); load() }}
          className="px-3 py-1.5 text-xs text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          새로고침
        </button>
        <span className="text-xs text-slate-400">15초마다 자동 갱신</span>
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-slate-400">불러오는 중...</div>
      ) : users.length === 0 ? (
        <div className="py-12 text-center text-sm text-slate-400">
          현재 접속 중인 사용자가 없습니다.
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {["이름", "역할", "현재 화면", "마지막 활동"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-500 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full shrink-0" />
                      <span className="font-medium text-slate-800">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLOR[u.role] ?? "bg-slate-100 text-slate-700"}`}>
                      {ROLE_LABEL_P[u.role] ?? u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    {getPageLabel(u.currentPage)}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                    {relativeTime(u.lastSeen)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

type User = {
  id: string; name: string; email: string
  role: string; status: string
  department: string | null; employeeId: string | null
  phone: string | null
  createdAt: Date; restrictedUntil: Date | null
}

type ActivityRow = {
  id: string; name: string; email: string
  role: string; status: string; department: string | null
  posts: number; comments: number
  claims: number; ncrs: number
  incomingInspections: number; sourceInspections: number; audits: number
  tenders: number; witnessInspections: number; meetings: number; qpaAudits: number; awardedProjects: number
  total: number; lastActivity: string | null
}

type ActivityItem = {
  type: string
  label: string
  detail: string
  createdAt: string
}

const ACTIVITY_COLS: { key: keyof ActivityRow; label: string; color: string }[] = [
  { key: "posts",               label: "게시글",      color: "text-indigo-600" },
  { key: "comments",            label: "댓글",        color: "text-violet-600" },
  { key: "claims",              label: "클레임",      color: "text-blue-600"   },
  { key: "ncrs",                label: "NCR",         color: "text-rose-600"   },
  { key: "incomingInspections", label: "수입검사",    color: "text-sky-600"    },
  { key: "sourceInspections",   label: "출장검사",    color: "text-emerald-600"},
  { key: "audits",              label: "협력업체감사", color: "text-amber-600"  },
  { key: "tenders",             label: "입찰등록",    color: "text-orange-600" },
  { key: "witnessInspections",  label: "입회검사",    color: "text-teal-600"   },
  { key: "meetings",            label: "회의록",      color: "text-purple-600" },
  { key: "qpaAudits",           label: "QPA",         color: "text-cyan-600"   },
  { key: "awardedProjects",     label: "수주PJT",     color: "text-lime-600"   },
]

const TYPE_BADGE: Record<string, string> = {
  게시글: "bg-indigo-100 text-indigo-700",
  댓글: "bg-violet-100 text-violet-700",
  클레임: "bg-blue-100 text-blue-700",
  NCR: "bg-rose-100 text-rose-700",
  수입검사: "bg-sky-100 text-sky-700",
  출장검사: "bg-emerald-100 text-emerald-700",
  협력업체감사: "bg-amber-100 text-amber-700",
  입찰등록: "bg-orange-100 text-orange-700",
  입회검사: "bg-teal-100 text-teal-700",
  회의록: "bg-purple-100 text-purple-700",
  QPA: "bg-cyan-100 text-cyan-700",
  수주PJT: "bg-lime-100 text-lime-700",
}

// ─── ISO 주차 헬퍼 ────────────────────────────────────────────

function getISOMonday(date: Date): Date {
  const day = date.getDay()
  const d = new Date(date)
  d.setDate(date.getDate() - (day === 0 ? 6 : day - 1))
  d.setHours(0, 0, 0, 0)
  return d
}

function getWeekOfMonth(monday: Date): number {
  const y = monday.getFullYear(), m = monday.getMonth()
  const firstOfMonth = new Date(y, m, 1)
  const fd = firstOfMonth.getDay()
  // 해당 달의 첫 번째 월요일
  const firstMonday = new Date(firstOfMonth)
  firstMonday.setDate(firstOfMonth.getDate() + (fd === 0 ? 1 : fd === 1 ? 0 : 8 - fd))
  return Math.floor((monday.getTime() - firstMonday.getTime()) / 604800000) + 1
}

function getPeriodLabel(period: "all" | "month" | "week", startDate?: string | null): string {
  const now = new Date()
  if (period === "week") {
    const monday = getISOMonday(now)
    return `${monday.getMonth() + 1}월 ${getWeekOfMonth(monday)}주차`
  }
  if (period === "month") return `${now.getMonth() + 1}월`
  if (startDate) {
    const d = new Date(startDate)
    return `전체 (${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}~)`
  }
  return "전체"
}

// ─── 활동 추이 ───────────────────────────────────────────────

type TrendUser = { id: string; name: string; department: string | null }
type TrendSeries = TrendUser & { data: number[] }
type TrendData = {
  dates: string[]
  avgLine: number[]
  totalUsers: number
  allUsers: TrendUser[]
  series: TrendSeries[]
}

const TREND_COLORS = [
  "#6366f1", "#f59e0b", "#10b981", "#ef4444",
  "#8b5cf6", "#ec4899", "#14b8a6",
]

function LineChart({ dates, avgLine, series }: {
  dates: string[]
  avgLine: number[]
  series: (TrendSeries & { color: string })[]
}) {
  const W = 800, H = 260
  const PAD = { t: 16, r: 16, b: 44, l: 44 }
  const gW = W - PAD.l - PAD.r
  const gH = H - PAD.t - PAD.b

  const allVals = [...avgLine, ...series.flatMap(s => s.data)]
  const maxVal = Math.max(...allVals, 1)
  const n = dates.length

  const xScale = (i: number) => PAD.l + (n <= 1 ? gW / 2 : (i / (n - 1)) * gW)
  const yScale = (v: number) => PAD.t + gH - (v / maxVal) * gH

  const toPoints = (data: number[]) =>
    data.map((v, i) => `${xScale(i).toFixed(1)},${yScale(v).toFixed(1)}`).join(" ")

  const labelStep = Math.max(1, Math.ceil(n / 10))

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(t => ({
    y: PAD.t + gH * (1 - t),
    val: Math.round(maxVal * t * 10) / 10,
  }))

  const fmtDate = (d: string) => {
    const parts = d.split("-") // YYYY-MM-DD
    return parts.length === 3 ? `${parts[1]}/${parts[2]}` : d
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto select-none">
      {/* 그리드 */}
      {yTicks.map(({ y, val }) => (
        <g key={val}>
          <line x1={PAD.l} y1={y} x2={W - PAD.r} y2={y}
            stroke="#e2e8f0" strokeWidth="1" />
          <text x={PAD.l - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#94a3b8">
            {val}
          </text>
        </g>
      ))}
      {/* X 라벨 */}
      {dates.map((d, i) => i % labelStep !== 0 ? null : (
        <text key={d} x={xScale(i)} y={H - PAD.b + 14}
          textAnchor="middle" fontSize="10" fill="#94a3b8">
          {fmtDate(d)}
        </text>
      ))}
      {/* 평균 선 (회색 점선) */}
      {avgLine.length > 0 && (
        <polyline points={toPoints(avgLine)} fill="none"
          stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4 4" />
      )}
      {/* 사용자 선 */}
      {series.map(s => (
        <g key={s.id}>
          <polyline points={toPoints(s.data)} fill="none"
            stroke={s.color} strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" />
          {s.data.map((v, i) => (
            <circle key={i} cx={xScale(i)} cy={yScale(v)} r="3"
              fill={s.color} />
          ))}
        </g>
      ))}
    </svg>
  )
}

function TrendView() {
  const [period, setPeriod]           = useState<"week" | "month" | "all">("month")
  const [granularity, setGranularity] = useState<"day" | "week">("day")
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [data, setData]               = useState<TrendData | null>(null)
  const [loading, setLoading]         = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const qs = new URLSearchParams({
      period,
      granularity,
      userIds: selectedIds.join(","),
    })
    const res = await fetch(`/api/admin/activity/trend?${qs}`)
    if (res.ok) setData(await res.json() as TrendData)
    setLoading(false)
  }, [period, granularity, selectedIds])

  useEffect(() => { void load() }, [load])

  // 기간 버튼 라벨 (활동 현황과 동일 로직)
  const periodLabels: Record<"week" | "month" | "all", string> = {
    week:  (() => {
      const now = new Date(); const mon = new Date(now)
      const day = now.getDay()
      mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
      return `${mon.getMonth() + 1}월 ${Math.floor((mon.getDate() - 1) / 7) + 1}주차`
    })(),
    month: `${new Date().getMonth() + 1}월`,
    all:   data?.dates[0] ? `전체 (${data.dates[0].slice(0, 7).replace("-", ".")}~)` : "전체",
  }

  const coloredSeries = (data?.series ?? []).map((s, i) => ({
    ...s,
    color: TREND_COLORS[i % TREND_COLORS.length],
  }))

  const toggleUser = (id: string) =>
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : prev.length >= 5 ? prev : [...prev, id]
    )

  return (
    <div className="space-y-4">
      {/* 컨트롤 바 */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-center gap-3">

          {/* 기간 필터 */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400">기간</span>
            {(["all", "month", "week"] as const).map(v => (
              <button key={v} onClick={() => setPeriod(v)}
                className={`px-2.5 py-1 text-xs rounded-full border transition-colors whitespace-nowrap ${
                  period === v
                    ? "bg-slate-800 text-white border-slate-800"
                    : "border-slate-200 text-slate-600 hover:border-slate-400"
                }`}>
                {periodLabels[v]}
              </button>
            ))}
          </div>

          {/* 단위 */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400">단위</span>
            {(["day", "week"] as const).map(v => (
              <button key={v} onClick={() => setGranularity(v)}
                className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                  granularity === v
                    ? "bg-slate-800 text-white border-slate-800"
                    : "border-slate-200 text-slate-600 hover:border-slate-400"
                }`}>
                {v === "day" ? "일별" : "주별"}
              </button>
            ))}
          </div>

          {/* 사용자 선택 드롭다운 */}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-slate-400">사용자 추가</span>
            <select
              onChange={e => { if (e.target.value) { toggleUser(e.target.value); e.target.value = "" } }}
              className="text-xs border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              defaultValue=""
            >
              <option value="">선택...</option>
              {(data?.allUsers ?? [])
                .filter(u => !selectedIds.includes(u.id))
                .map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name}{u.department ? ` (${u.department})` : ""}
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* 선택된 사용자 태그 */}
        {selectedIds.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-100">
            {coloredSeries.map(s => (
              <span key={s.id}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-white"
                style={{ backgroundColor: s.color }}>
                {s.name}
                <button onClick={() => toggleUser(s.id)}
                  className="hover:opacity-75 leading-none text-base">×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 차트 */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        {loading ? (
          <div className="h-48 flex items-center justify-center text-xs text-slate-400">
            불러오는 중...
          </div>
        ) : !data || data.dates.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-xs text-slate-400">
            이 기간에 활동 데이터가 없습니다.
          </div>
        ) : (
          <LineChart
            dates={data.dates}
            avgLine={data.avgLine}
            series={coloredSeries}
          />
        )}

        {/* 범례 */}
        <div className="flex flex-wrap items-center gap-4 mt-4 pt-3 border-t border-slate-100">
          <span className="flex items-center gap-1.5 text-xs text-slate-500">
            <svg width="24" height="10"><line x1="0" y1="5" x2="24" y2="5"
              stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4 4" /></svg>
            팀 평균 ({data?.totalUsers ?? 0}명 기준)
          </span>
          {coloredSeries.map(s => (
            <span key={s.id} className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="w-5 h-0.5 rounded" style={{ backgroundColor: s.color }} />
              {s.name}
              {s.department && <span className="text-slate-400">({s.department})</span>}
            </span>
          ))}
          {selectedIds.length === 0 && (
            <span className="text-xs text-slate-400 italic">
              ↑ 사용자를 추가하면 개인 추이를 비교할 수 있습니다
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── 활동 현황 ───────────────────────────────────────────────

function ActivityView() {
  const [period, setPeriod] = useState<"all" | "month" | "week">("all")
  const [periodStartDate, setPeriodStartDate] = useState<string | null>(null)
  const [rows, setRows] = useState<ActivityRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [detailMap, setDetailMap] = useState<Record<string, ActivityItem[]>>({})
  const [detailLoading, setDetailLoading] = useState<string | null>(null)
  const [lbOpen, setLbOpen] = useState(false)
  const [lbPosting, setLbPosting] = useState(false)
  const [lbResult, setLbResult] = useState<"success" | "error" | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setSelectedUserId(null)
    const res = await fetch(`/api/admin/activity?period=${period}`)
    if (res.ok) {
      const data = await res.json() as { rows: ActivityRow[]; periodStart?: string }
      setRows(data.rows ?? [])
      if (data.periodStart) setPeriodStartDate(data.periodStart)
    }
    setLoading(false)
  }, [period])

  useEffect(() => { load() }, [load])

  async function selectUser(userId: string) {
    if (selectedUserId === userId) { setSelectedUserId(null); return }
    setSelectedUserId(userId)
    const cacheKey = `${userId}|${period}`
    if (detailMap[cacheKey]) return
    setDetailLoading(userId)
    try {
      const res = await fetch(`/api/admin/activity/${userId}?period=${period}`)
      if (res.ok) {
        const items = await res.json()
        setDetailMap(prev => ({ ...prev, [cacheKey]: items }))
      }
    } finally {
      setDetailLoading(null)
    }
  }

  const ROLE_LABEL: Record<string, string> = {
    PRACTITIONER: "실무자", TEAM_LEAD: "팀장", DIRECTOR: "임원", ADMIN: "관리자"
  }

  const currentPeriodLabel = getPeriodLabel(period, periodStartDate)
  const lbTitle = `🏆 ${currentPeriodLabel} Top 7`

  const MEDALS = ["🥇", "🥈", "🥉", "4위", "5위", "6위", "7위"]

  function buildLeaderboardContent(top7: ActivityRow[]): string {
    const rankLines = top7.map((r, i) => {
      const parts = [
        r.posts > 0 && `게시글 ${r.posts}`,
        r.comments > 0 && `댓글 ${r.comments}`,
        r.claims > 0 && `클레임 ${r.claims}`,
        r.ncrs > 0 && `NCR ${r.ncrs}`,
        r.incomingInspections > 0 && `수입검사 ${r.incomingInspections}`,
        r.sourceInspections > 0 && `출장검사 ${r.sourceInspections}`,
        r.audits > 0 && `협력업체감사 ${r.audits}`,
        r.tenders > 0 && `입찰등록 ${r.tenders}`,
        r.witnessInspections > 0 && `입회검사 ${r.witnessInspections}`,
        r.meetings > 0 && `회의록 ${r.meetings}`,
        r.qpaAudits > 0 && `QPA ${r.qpaAudits}`,
        r.awardedProjects > 0 && `수주PJT ${r.awardedProjects}`,
      ].filter(Boolean).join(" · ")
      const dept = r.department ? ` (${r.department})` : ""
      const medal = MEDALS[i] ?? `${i + 1}위`
      return `${medal} **${i + 1}위** ${r.name}${dept} — **${r.total}건**\n> ${parts}`
    }).join("\n\n")

    return `## ${lbTitle.replace("🏆 ", "")}

품질부문 여러분의 열정적인 참여에 감사드립니다!

${currentPeriodLabel} QMS 2.0 시스템을 가장 활발하게 활용하신 분들을 소개합니다.

---

${rankLines}

---

여러분 한 분 한 분의 참여가 더 나은 QMS를 만듭니다.
지속적인 시스템 활용과 피드백 부탁드립니다! 🙌`
  }

  async function postLeaderboard() {
    const top7 = rows.filter(r => r.total > 0 && r.role !== "ADMIN").slice(0, 7)
    if (top7.length === 0) return
    setLbPosting(true)
    setLbResult(null)
    try {
      const res = await fetch("/api/board", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: "NOTICE",
          pinned: true,
          title: lbTitle,
          content: buildLeaderboardContent(top7),
          displayMode: "REAL",
          visibility: "ALL",
          attachments: [],
        }),
      })
      setLbResult(res.ok ? "success" : "error")
      if (res.ok) setTimeout(() => { setLbOpen(false); setLbResult(null) }, 2500)
    } catch {
      setLbResult("error")
    } finally {
      setLbPosting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* 기간 필터 */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500">기간:</span>
        {(["all", "month", "week"] as const).map(v => (
          <button
            key={v}
            onClick={() => setPeriod(v)}
            className={`px-3 py-1 text-xs rounded-full border transition-colors whitespace-nowrap ${
              period === v
                ? "bg-slate-800 text-white border-slate-800"
                : "border-slate-200 text-slate-600 hover:border-slate-400"
            }`}
          >
            {getPeriodLabel(v, periodStartDate)}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-slate-400 hidden sm:block">이름 클릭 시 날짜별 활동 상세</span>
          <button
            onClick={() => { setLbOpen(v => !v); setLbResult(null) }}
            disabled={rows.filter(r => r.total > 0).length === 0}
            className="px-3 py-1.5 text-xs font-medium bg-amber-50 border border-amber-200 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors disabled:opacity-40 whitespace-nowrap"
          >
            🏆 리더보드 공지
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-slate-400">집계 중...</div>
      ) : (
        <>
          {/* 리더보드 공지 패널 */}
          {lbOpen && (() => {
            const top7 = rows.filter(r => r.total > 0 && r.role !== "ADMIN").slice(0, 7)
            return (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-amber-800">{lbTitle} 게시판 공지 작성</h3>
                    <p className="text-xs text-amber-600 mt-0.5">
                      {currentPeriodLabel} 기준 · 게시판에 핀 고정 공지로 등록됩니다
                    </p>
                  </div>
                  <button onClick={() => setLbOpen(false)} className="text-amber-400 hover:text-amber-600 text-xl leading-none mt-0.5">×</button>
                </div>

                {top7.length === 0 ? (
                  <p className="text-xs text-amber-600 py-1">현재 기간에 활동 데이터가 없습니다.</p>
                ) : (
                  <div className="space-y-2">
                    {top7.map((r, i) => {
                      const parts = [
                        r.posts > 0 && `게시글 ${r.posts}`,
                        r.comments > 0 && `댓글 ${r.comments}`,
                        r.claims > 0 && `클레임 ${r.claims}`,
                        r.ncrs > 0 && `NCR ${r.ncrs}`,
                        r.incomingInspections > 0 && `수입검사 ${r.incomingInspections}`,
                        r.sourceInspections > 0 && `출장검사 ${r.sourceInspections}`,
                        r.audits > 0 && `협력업체감사 ${r.audits}`,
                        r.tenders > 0 && `입찰등록 ${r.tenders}`,
                        r.witnessInspections > 0 && `입회검사 ${r.witnessInspections}`,
                        r.meetings > 0 && `회의록 ${r.meetings}`,
                        r.qpaAudits > 0 && `QPA ${r.qpaAudits}`,
                        r.awardedProjects > 0 && `수주PJT ${r.awardedProjects}`,
                      ].filter(Boolean).join(" · ")
                      return (
                        <div key={r.id} className="flex items-center gap-3 bg-white rounded-lg px-3 py-2.5 border border-amber-100">
                          <span className={`shrink-0 ${i < 3 ? "text-2xl" : "text-xs font-bold text-slate-500 w-8 text-center"}`}>
                            {MEDALS[i]}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-sm font-semibold text-slate-800">{r.name}</span>
                              {r.department && <span className="text-xs text-slate-400">({r.department})</span>}
                            </div>
                            <p className="text-[11px] text-slate-400 truncate mt-0.5">{parts}</p>
                          </div>
                          <span className="text-base font-bold text-amber-700 shrink-0">{r.total}건</span>
                        </div>
                      )
                    })}
                  </div>
                )}

                {lbResult === "success" && (
                  <p className="text-xs font-medium text-emerald-600">✓ 게시판에 공지가 등록되었습니다.</p>
                )}
                {lbResult === "error" && (
                  <p className="text-xs text-red-500">공지 등록 중 오류가 발생했습니다. 다시 시도해 주세요.</p>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={postLeaderboard}
                    disabled={lbPosting || top7.length === 0 || lbResult === "success"}
                    className="px-4 py-1.5 text-xs font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors"
                  >
                    {lbPosting ? "등록 중..." : "게시판에 공지 등록"}
                  </button>
                  <button
                    onClick={() => { setLbOpen(false); setLbResult(null) }}
                    className="px-3 py-1.5 text-xs text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
                  >
                    취소
                  </button>
                </div>
              </div>
            )
          })()}

          {/* 요약 카드 */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "총 활동 수",   value: rows.reduce((s, r) => s + r.total, 0),    color: "text-slate-800" },
              { label: "게시글+댓글", value: rows.reduce((s, r) => s + r.posts + r.comments, 0), color: "text-indigo-600" },
              { label: "검사 기록",   value: rows.reduce((s, r) => s + r.incomingInspections + r.sourceInspections + r.audits + r.witnessInspections + r.qpaAudits, 0), color: "text-emerald-600" },
              { label: "입찰+수주",  value: rows.reduce((s, r) => s + r.tenders + r.awardedProjects, 0), color: "text-orange-600" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-slate-50 border border-slate-100 rounded-lg px-4 py-3 text-center">
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* 테이블 */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-2 py-3 text-xs font-medium text-slate-500 whitespace-nowrap">#</th>
                  <th className="text-left px-3 py-3 text-xs font-medium text-slate-500 whitespace-nowrap">이름</th>
                  <th className="text-left px-2 py-3 text-xs font-medium text-slate-500 whitespace-nowrap">역할</th>
                  {ACTIVITY_COLS.map(c => (
                    <th key={c.key} className={`text-right px-2 py-3 text-xs font-medium whitespace-nowrap ${c.color}`}>
                      {c.label}
                    </th>
                  ))}
                  <th className="text-right px-2 py-3 text-xs font-bold text-slate-700 whitespace-nowrap">합계</th>
                  <th className="text-left px-3 py-3 text-xs font-medium text-slate-500 whitespace-nowrap">마지막 활동</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => {
                  const isSelected = selectedUserId === r.id
                  const cacheKey = `${r.id}|${period}`
                  const detailItems = detailMap[cacheKey] ?? []
                  return (
                    <React.Fragment key={r.id}>
                      <tr
                        onClick={() => { if (r.total > 0) selectUser(r.id) }}
                        className={`border-b border-slate-100 transition-colors ${
                          r.total === 0
                            ? "opacity-50"
                            : isSelected
                            ? "bg-indigo-50 border-indigo-100"
                            : "hover:bg-slate-50 cursor-pointer"
                        }`}
                      >
                        <td className="px-2 py-2 text-xs text-slate-400">{idx + 1}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            <p className="font-medium text-slate-800 text-xs">{r.name}</p>
                            {r.total > 0 && (
                              <span className="text-[10px] text-slate-400 select-none">{isSelected ? "▼" : "▶"}</span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400">{r.department ?? r.email}</p>
                        </td>
                        <td className="px-2 py-2 text-xs text-slate-500 whitespace-nowrap">
                          {ROLE_LABEL[r.role] ?? r.role}
                        </td>
                        {ACTIVITY_COLS.map(c => (
                          <td key={c.key} className={`px-2 py-2 text-right text-xs font-medium ${(r[c.key] as number) > 0 ? c.color : "text-slate-200"}`}>
                            {r[c.key] as number}
                          </td>
                        ))}
                        <td className={`px-2 py-2 text-right text-xs font-bold ${
                          r.total >= 10 ? "text-slate-900" : r.total > 0 ? "text-slate-600" : "text-slate-200"
                        }`}>
                          {r.total}
                        </td>
                        <td className="px-3 py-2 text-xs text-slate-400 whitespace-nowrap">
                          {r.lastActivity
                            ? new Date(r.lastActivity).toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
                            : "—"}
                        </td>
                      </tr>

                      {isSelected && (
                        <tr className="border-b border-indigo-100 bg-slate-50/80">
                          <td colSpan={3 + ACTIVITY_COLS.length + 2} className="px-6 py-3">
                            {detailLoading === r.id ? (
                              <p className="text-xs text-slate-400 py-1">불러오는 중...</p>
                            ) : detailItems.length === 0 ? (
                              <p className="text-xs text-slate-400 py-1">이 기간에 활동 없음</p>
                            ) : (() => {
                              // 날짜별 그룹핑 (KST 기준)
                              const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"]
                              const grouped = detailItems.reduce<Record<string, ActivityItem[]>>((acc, item) => {
                                const d = new Date(item.createdAt)
                                const key = `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,"0")}.${String(d.getDate()).padStart(2,"0")} (${WEEKDAYS[d.getDay()]})`
                                ;(acc[key] ??= []).push(item)
                                return acc
                              }, {})
                              const dateKeys = Object.keys(grouped).sort((a, b) => b.localeCompare(a))
                              return (
                                <div>
                                  <p className="text-[11px] text-slate-400 mb-2">
                                    총 <span className="font-semibold text-slate-600">{detailItems.length}</span>건 · {dateKeys.length}일간 활동
                                  </p>
                                  <div className="max-h-80 overflow-y-auto space-y-3">
                                    {dateKeys.map(dateKey => (
                                      <div key={dateKey}>
                                        <p className="text-[10px] font-bold text-slate-500 bg-slate-100 rounded px-2 py-0.5 mb-1.5 inline-block">
                                          {dateKey}
                                        </p>
                                        <div className="divide-y divide-slate-100">
                                          {grouped[dateKey].map((item, i) => (
                                            <div key={i} className="flex items-center gap-3 py-1.5">
                                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 min-w-[52px] text-center ${TYPE_BADGE[item.type] ?? "bg-slate-100 text-slate-700"}`}>
                                                {item.type}
                                              </span>
                                              <div className="flex-1 min-w-0">
                                                <p className="text-xs text-slate-700 truncate">{item.label}</p>
                                                {item.detail && <p className="text-[10px] text-slate-400 truncate">{item.detail}</p>}
                                              </div>
                                              <time className="text-[10px] text-slate-400 whitespace-nowrap shrink-0">
                                                {new Date(item.createdAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                                              </time>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )
                            })()}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
                {rows.length === 0 && (
                  <tr><td colSpan={12} className="text-center py-10 text-sm text-slate-400">활동 데이터 없음</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

function formatPhone(value: string): string {
  const d = value.replace(/\D/g, "")
  if (d.startsWith("02")) {
    if (d.length <= 2) return d
    if (d.length <= 5) return `${d.slice(0, 2)}-${d.slice(2)}`
    if (d.length <= 9) return `${d.slice(0, 2)}-${d.slice(2, 5)}-${d.slice(5)}`
    return `${d.slice(0, 2)}-${d.slice(2, 6)}-${d.slice(6, 10)}`
  }
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}-${d.slice(3)}`
  if (d.length <= 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7, 11)}`
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: "대기", ACTIVE: "활성", RESTRICTED: "정지", BANNED: "강퇴(영구)"
}
const ROLE_LABEL: Record<string, string> = {
  PRACTITIONER: "실무자", TEAM_LEAD: "팀장", DIRECTOR: "임원", ADMIN: "관리자"
}
const STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  ACTIVE: "bg-emerald-100 text-emerald-700",
  RESTRICTED: "bg-orange-100 text-orange-700",
  BANNED: "bg-red-100 text-red-700",
}

const SUSPEND_OPTIONS = [
  { label: "1일",   days: 1 },
  { label: "1주일", days: 7 },
  { label: "1달",   days: 30 },
  { label: "3개월", days: 90 },
  { label: "6개월", days: 180 },
]

function restrictedUntilLabel(until: Date | null | undefined): string {
  if (!until) return ""
  const d = new Date(until)
  if (d < new Date()) return "(정지 만료)"
  return `~${d.toLocaleDateString("ko-KR")} ${d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}까지`
}

export function AdminUsersClient({ users: initial }: { users: User[] }) {
  const [activeTab, setActiveTab] = useState<"users" | "activity" | "trend" | "presence">("users")

  // /admin/users는 DashboardShell 밖이므로 여기서 직접 하트비트 전송
  useEffect(() => {
    const send = () => {
      fetch("/api/presence/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPage: "/admin/users" }),
      }).catch(() => {})
    }
    send()
    const id = setInterval(send, 45_000)
    return () => clearInterval(id)
  }, [])
  const [users, setUsers] = useState(initial)
  const [loading, setLoading] = useState<string | null>(null)
  const [tempPasswords, setTempPasswords] = useState<Record<string, string>>({})
  const [suspendDays, setSuspendDays] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  // 정보 편집 열림 상태 (userId → boolean)
  const [editOpen, setEditOpen] = useState<Record<string, boolean>>({})
  // 편집 폼 값 (userId → {name, email, department, employeeId, phone})
  type InfoForm = { name: string; email: string; department: string; employeeId: string; phone: string }
  const [infoForm, setInfoForm] = useState<Record<string, InfoForm>>({})
  // PENDING 승인 시 선택할 역할 (userId → role)
  const [pendingRole, setPendingRole] = useState<Record<string, string>>({})
  // ACTIVE 사용자 역할 변경 임시값 (userId → role), 저장 버튼 클릭 시 반영
  const [roleEdit, setRoleEdit] = useState<Record<string, string>>({})

  async function refresh() {
    const res = await fetch("/api/admin/users")
    const data = await res.json()
    setUsers(data)
  }

  async function patch(id: string, body: object) {
    setLoading(id)
    setErrors(prev => { const n = { ...prev }; delete n[id]; return n })
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setErrors(prev => ({ ...prev, [id]: data.error ?? "변경 중 오류가 발생했습니다." }))
    }
    await refresh()
    setLoading(null)
  }

  // PENDING → ACTIVE + 역할 동시 저장
  async function approve(id: string) {
    const role = pendingRole[id] ?? "PRACTITIONER"
    await patch(id, { status: "ACTIVE", role })
  }

  // ACTIVE 사용자 역할 저장
  function openEdit(u: User) {
    setEditOpen(prev => ({ ...prev, [u.id]: true }))
    setInfoForm(prev => ({
      ...prev,
      [u.id]: { name: u.name, email: u.email, department: u.department ?? "", employeeId: u.employeeId ?? "", phone: formatPhone(u.phone ?? "") },
    }))
  }

  async function saveInfo(id: string) {
    const form = infoForm[id]
    if (!form || !form.name.trim()) return
    await patch(id, {
      name: form.name,
      email: form.email,
      department: form.department,
      employeeId: form.employeeId,
      phone: form.phone,
    })
    setEditOpen(prev => ({ ...prev, [id]: false }))
  }

  async function saveRole(id: string) {
    const role = roleEdit[id]
    if (!role) return
    setErrors(prev => { const n = { ...prev }; delete n[id]; return n })
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setErrors(prev => ({ ...prev, [id]: data.error ?? "역할 변경 중 오류가 발생했습니다." }))
    }
    setRoleEdit(prev => { const n = { ...prev }; delete n[id]; return n })
    await refresh()
  }

  async function suspend(id: string) {
    const days = parseInt(suspendDays[id] ?? "1")
    const until = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
    const label = days >= 30 ? `${Math.round(days / 30)}개월` : days >= 7 ? `${Math.round(days / 7)}주일` : `${days}일`
    if (!confirm(`${label} 사용정지합니다.\n정지 해제일: ${until.toLocaleDateString("ko-KR")}`)) return
    await patch(id, { status: "RESTRICTED", restrictedUntil: until.toISOString() })
  }

  async function ban(id: string) {
    if (!confirm("영구 강퇴합니다.\n강퇴된 계정은 이 이메일로 다시 가입하거나 복구할 수 없습니다.\n계속하시겠습니까?")) return
    await patch(id, { status: "BANNED" })
  }

  async function deleteUser(id: string, name: string) {
    if (!confirm(`"${name}" 계정과 관련 데이터(입찰 분석 이력 포함)를 완전히 삭제합니다.\n삭제 후 동일 이메일로 재가입이 가능합니다.\n계속하시겠습니까?`)) return
    setLoading(id)
    setErrors(prev => { const n = { ...prev }; delete n[id]; return n })
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setErrors(prev => ({ ...prev, [id]: data.error ?? "삭제 중 오류가 발생했습니다." }))
    }
    await refresh()
    setLoading(null)
  }

  async function resetPassword(id: string) {
    if (!confirm("비밀번호를 초기화하시겠습니까?")) return
    setLoading(id)
    const res = await fetch(`/api/admin/users/${id}/reset-password`, { method: "POST" })
    const data = await res.json()
    setTempPasswords(prev => ({ ...prev, [id]: data.tempPassword }))
    setLoading(null)
  }

  // 역할 셀 — 모바일 카드와 데스크톱 테이블에서 공용
  function RoleCell({ u }: { u: User }) {
    const editingRole = roleEdit[u.id]
    const currentDisplayRole = editingRole ?? u.role
    const roleChanged = editingRole !== undefined && editingRole !== u.role
    if (u.status === "PENDING") {
      return (
        <select
          value={pendingRole[u.id] ?? "PRACTITIONER"}
          onChange={e => setPendingRole(prev => ({ ...prev, [u.id]: e.target.value }))}
          disabled={loading === u.id}
          className="border border-amber-300 rounded px-2 py-1 text-xs bg-amber-50 text-amber-800">
          {Object.entries(ROLE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      )
    }
    if (u.status !== "BANNED") {
      return (
        <div className="flex items-center gap-1">
          <select
            value={currentDisplayRole}
            onChange={e => setRoleEdit(prev => ({ ...prev, [u.id]: e.target.value }))}
            disabled={loading === u.id}
            className={`border rounded px-2 py-1 text-xs ${roleChanged ? "border-indigo-400 bg-indigo-50 text-indigo-800" : "border-slate-200"}`}>
            {Object.entries(ROLE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          {roleChanged && (
            <button onClick={() => saveRole(u.id)} disabled={loading === u.id}
              className="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 whitespace-nowrap">
              저장
            </button>
          )}
        </div>
      )
    }
    return <span className="text-xs text-slate-400">{ROLE_LABEL[u.role]}</span>
  }

  // 액션 버튼 그룹 — 모바일 카드와 데스크톱 테이블에서 공용
  function ActionButtons({ u }: { u: User }) {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap gap-1">
          {u.status === "PENDING" && (
            <button onClick={() => approve(u.id)} disabled={loading === u.id}
              className="px-2 py-1 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50">
              승인 ({ROLE_LABEL[pendingRole[u.id] ?? "PRACTITIONER"]})
            </button>
          )}
          {u.status === "ACTIVE" && (
            <div className="flex items-center gap-1">
              <select
                value={suspendDays[u.id] ?? "1"}
                onChange={e => setSuspendDays(prev => ({ ...prev, [u.id]: e.target.value }))}
                disabled={loading === u.id}
                className="border border-orange-300 rounded px-1.5 py-1 text-xs text-orange-700 bg-orange-50">
                {SUSPEND_OPTIONS.map(o => (
                  <option key={o.days} value={String(o.days)}>{o.label}</option>
                ))}
              </select>
              <button onClick={() => suspend(u.id)} disabled={loading === u.id}
                className="px-2 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50">
                정지
              </button>
            </div>
          )}
          {u.status === "RESTRICTED" && (
            <button onClick={() => patch(u.id, { status: "ACTIVE" })} disabled={loading === u.id}
              className="px-2 py-1 text-xs bg-slate-600 text-white rounded hover:bg-slate-700 disabled:opacity-50">
              정지해제
            </button>
          )}
          {(u.status === "ACTIVE" || u.status === "RESTRICTED") && (
            <button onClick={() => ban(u.id)} disabled={loading === u.id}
              className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50">
              강퇴
            </button>
          )}
          {u.status !== "BANNED" && (
            <button onClick={() => resetPassword(u.id)} disabled={loading === u.id}
              className="px-2 py-1 text-xs bg-amber-500 text-white rounded hover:bg-amber-600 disabled:opacity-50">
              PW초기화
            </button>
          )}
          <button onClick={() => deleteUser(u.id, u.name)} disabled={loading === u.id}
            className="px-2 py-1 text-xs bg-slate-200 text-slate-600 rounded hover:bg-slate-300 disabled:opacity-50">
            삭제
          </button>
        </div>
        {u.status !== "BANNED" && !editOpen[u.id] && (
          <button onClick={() => openEdit(u)} className="text-xs text-indigo-600 hover:underline mt-0.5 text-left">
            정보 편집
          </button>
        )}
        {errors[u.id] && (
          <p className="text-xs text-red-600 mt-1">{errors[u.id]}</p>
        )}
        {tempPasswords[u.id] && (
          <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 rounded px-2 py-1">
            <span className="text-xs font-mono font-bold text-amber-800">{tempPasswords[u.id]}</span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(tempPasswords[u.id])
                setTempPasswords(prev => ({ ...prev, [u.id]: prev[u.id] + " ✓" }))
              }}
              className="text-xs text-amber-600 hover:text-amber-800 ml-1">
              복사
            </button>
          </div>
        )}
      </div>
    )
  }

  // 정보 편집 폼 — 모바일 카드와 데스크톱 테이블에서 공용
  function InfoEditForm({ u }: { u: User }) {
    if (!editOpen[u.id] || !infoForm[u.id]) return null
    return (
      <div className="mt-3 bg-indigo-50/50 border border-indigo-100 rounded-lg px-4 py-3">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {[
            { label: "이름", key: "name" },
            { label: "이메일", key: "email" },
            { label: "부서", key: "department" },
            { label: "사번", key: "employeeId" },
            { label: "연락처", key: "phone" },
          ].map(({ label, key }) => (
            <div key={key} className="flex items-center gap-2">
              <span className="w-14 text-xs text-slate-500 shrink-0">{label}</span>
              <input
                type="text"
                placeholder={key === "phone" ? "010-0000-0000" : undefined}
                value={infoForm[u.id][key as keyof typeof infoForm[string]]}
                onChange={e => {
                  const val = key === "phone" ? formatPhone(e.target.value) : e.target.value
                  setInfoForm(prev => ({ ...prev, [u.id]: { ...prev[u.id], [key]: val } }))
                }}
                className="flex-1 border border-indigo-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
              />
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-3">
          <button onClick={() => saveInfo(u.id)} disabled={loading === u.id}
            className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50">
            저장
          </button>
          <button onClick={() => setEditOpen(prev => ({ ...prev, [u.id]: false }))}
            className="px-3 py-1.5 text-xs bg-white border border-slate-200 text-slate-600 rounded hover:bg-slate-50">
            취소
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 탭 바 */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {([["users", "사용자 목록"], ["activity", "활동 현황"], ["trend", "활동 추이"], ["presence", "접속 현황"]] as const).map(([tab, label]) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              activeTab === tab
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab === "presence" ? (
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-emerald-400 rounded-full inline-block" />
                {label}
              </span>
            ) : label}
          </button>
        ))}
      </div>

      {/* 활동 현황 탭 */}
      {activeTab === "activity" && <ActivityView />}

      {/* 활동 추이 탭 */}
      {activeTab === "trend" && <TrendView />}

      {/* 접속 현황 탭 */}
      {activeTab === "presence" && <PresenceView />}

      {/* 사용자 목록 탭 */}
      {activeTab === "users" && (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">

      {/* 모바일: 카드 목록 (sm 미만) */}
      <div className="sm:hidden divide-y divide-slate-100">
        {users.map(u => (
          <div key={u.id} className="p-4 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-sm">{u.name}</span>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[u.status]}`}>
                  {STATUS_LABEL[u.status]}
                </span>
                {u.status === "RESTRICTED" && u.restrictedUntil && (
                  <span className="text-[10px] text-orange-600">{restrictedUntilLabel(u.restrictedUntil)}</span>
                )}
              </div>
            </div>
            <p className="text-xs text-slate-500 break-all">{u.email}</p>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              {u.department && <span>{u.department}</span>}
              <span className="text-slate-300">|</span>
              <span className="text-slate-400">{new Date(u.createdAt).toLocaleDateString("ko-KR")} 가입</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 shrink-0">역할</span>
              <RoleCell u={u} />
            </div>
            <ActionButtons u={u} />
            <InfoEditForm u={u} />
          </div>
        ))}
      </div>

      {/* 데스크톱: 테이블 (sm 이상) */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {["이름", "이메일", "부서", "상태", "역할", "가입일", "액션"].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-500 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <React.Fragment key={u.id}>
                <tr className="border-b border-slate-100 last:border-0 hover:bg-slate-50 align-top">
                  <td className="px-4 py-3 font-medium whitespace-nowrap">{u.name}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{u.email}</td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{u.department ?? "-"}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${STATUS_COLOR[u.status]}`}>
                      {STATUS_LABEL[u.status]}
                    </span>
                    {u.status === "RESTRICTED" && u.restrictedUntil && (
                      <p className="text-[10px] text-orange-600 mt-0.5">{restrictedUntilLabel(u.restrictedUntil)}</p>
                    )}
                  </td>
                  <td className="px-4 py-3"><RoleCell u={u} /></td>
                  <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                    {new Date(u.createdAt).toLocaleDateString("ko-KR")}
                  </td>
                  <td className="px-4 py-3"><ActionButtons u={u} /></td>
                </tr>
                {editOpen[u.id] && infoForm[u.id] && (
                  <tr className="bg-indigo-50/50 border-b border-indigo-100">
                    <td colSpan={7} className="px-6 py-4">
                      <div className="grid grid-cols-2 gap-3 max-w-xl">
                        {[
                          { label: "이름", key: "name" },
                          { label: "이메일", key: "email" },
                          { label: "부서", key: "department" },
                          { label: "사번", key: "employeeId" },
                          { label: "연락처", key: "phone" },
                        ].map(({ label, key }) => (
                          <div key={key} className="flex items-center gap-2">
                            <span className="w-14 text-xs text-slate-500 shrink-0">{label}</span>
                            <input
                              type="text"
                              placeholder={key === "phone" ? "010-0000-0000" : undefined}
                              value={infoForm[u.id][key as keyof typeof infoForm[string]]}
                              onChange={e => {
                                const val = key === "phone" ? formatPhone(e.target.value) : e.target.value
                                setInfoForm(prev => ({ ...prev, [u.id]: { ...prev[u.id], [key]: val } }))
                              }}
                              className="flex-1 border border-indigo-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
                            />
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button onClick={() => saveInfo(u.id)} disabled={loading === u.id}
                          className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50">
                          저장
                        </button>
                        <button onClick={() => setEditOpen(prev => ({ ...prev, [u.id]: false }))}
                          className="px-3 py-1.5 text-xs bg-white border border-slate-200 text-slate-600 rounded hover:bg-slate-50">
                          취소
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
      )}
    </div>
  )
}
