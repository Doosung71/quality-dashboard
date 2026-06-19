import { auth } from "@/auth"
import { isAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

function getISOMonday(date: Date): string {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  d.setHours(0, 0, 0, 0)
  return d.toISOString().slice(0, 10)
}

function buildDateRange(start: Date, end: Date, granularity: "day" | "week"): string[] {
  const result: string[] = []
  const seen = new Set<string>()
  const cur = new Date(start)
  cur.setHours(0, 0, 0, 0)
  const endMs = new Date(end).setHours(23, 59, 59, 999)

  if (granularity === "week") {
    // 주 시작(월요일)으로 정렬
    const day = cur.getDay()
    cur.setDate(cur.getDate() - (day === 0 ? 6 : day - 1))
  }

  while (cur.getTime() <= endMs) {
    const key = cur.toISOString().slice(0, 10)
    if (!seen.has(key)) { seen.add(key); result.push(key) }
    cur.setDate(cur.getDate() + (granularity === "week" ? 7 : 1))
  }
  return result
}

export async function GET(req: Request) {
  const session = await auth()
  if (!session || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const period      = searchParams.get("period")      ?? "month"
  const granularity = (searchParams.get("granularity") ?? "day") as "day" | "week"
  const userIdsParam = searchParams.get("userIds") ?? ""
  const selectedIds  = userIdsParam ? userIdsParam.split(",").filter(Boolean) : []

  const now = new Date()
  let since: Date
  if (period === "week") {
    const day = now.getDay()
    since = new Date(now)
    since.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
    since.setHours(0, 0, 0, 0)
  } else if (period === "month") {
    since = new Date(now.getFullYear(), now.getMonth(), 1)
  } else {
    // all: 1년 전부터 (실제 첫 활동일로 재조정)
    since = new Date(now.getFullYear() - 2, now.getMonth(), 1)
  }

  const dateFilter = { createdAt: { gte: since } }

  const [
    allUsers,
    boardPosts, boardComments,
    feedbackPosts, feedbackReplies,
    claims, ncrs,
    incoming, source, audits,
    tenders, witness, meetings, qpaAudits, awardedProjects,
  ] = await Promise.all([
    prisma.user.findMany({
      where: { role: { not: "ADMIN" }, status: "ACTIVE" },
      select: { id: true, name: true, department: true },
      orderBy: { name: "asc" },
    }),
    prisma.boardPost.findMany({ where: dateFilter, select: { authorId: true, createdAt: true } }),
    prisma.boardComment.findMany({ where: dateFilter, select: { authorId: true, createdAt: true } }),
    prisma.feedback.findMany({ where: dateFilter, select: { authorId: true, createdAt: true } }),
    prisma.feedbackReply.findMany({ where: dateFilter, select: { authorId: true, createdAt: true } }),
    prisma.claim.findMany({ where: dateFilter, select: { createdById: true, createdAt: true } }),
    prisma.ncr.findMany({ where: dateFilter, select: { createdById: true, createdAt: true } }),
    prisma.incomingInspection.findMany({ where: dateFilter, select: { createdById: true, createdAt: true } }),
    prisma.sourceInspection.findMany({ where: dateFilter, select: { createdById: true, createdAt: true } }),
    prisma.supplierAudit.findMany({ where: dateFilter, select: { createdById: true, createdAt: true } }),
    prisma.tender.findMany({ where: dateFilter, select: { createdById: true, createdAt: true } }),
    prisma.witnessInspection.findMany({ where: dateFilter, select: { createdById: true, createdAt: true } }),
    prisma.meeting.findMany({ where: dateFilter, select: { createdById: true, createdAt: true } }),
    prisma.qpaAudit.findMany({ where: dateFilter, select: { createdById: true, createdAt: true } }),
    prisma.awardedProject.findMany({ where: dateFilter, select: { createdById: true, createdAt: true } }),
  ])

  // 모든 활동 통합 → { userId, createdAt }
  const items: { userId: string; date: Date }[] = [
    ...boardPosts.map(r => ({ userId: r.authorId, date: r.createdAt })),
    ...boardComments.map(r => ({ userId: r.authorId, date: r.createdAt })),
    ...feedbackPosts.map(r => ({ userId: r.authorId, date: r.createdAt })),
    ...feedbackReplies.map(r => ({ userId: r.authorId, date: r.createdAt })),
    ...claims.map(r => ({ userId: r.createdById, date: r.createdAt })),
    ...ncrs.map(r => ({ userId: r.createdById, date: r.createdAt })),
    ...incoming.map(r => ({ userId: r.createdById, date: r.createdAt })),
    ...source.map(r => ({ userId: r.createdById, date: r.createdAt })),
    ...audits.map(r => ({ userId: r.createdById, date: r.createdAt })),
    ...tenders.map(r => ({ userId: r.createdById, date: r.createdAt })),
    ...witness.map(r => ({ userId: r.createdById, date: r.createdAt })),
    ...meetings.map(r => ({ userId: r.createdById, date: r.createdAt })),
    ...qpaAudits.map(r => ({ userId: r.createdById, date: r.createdAt })),
    ...awardedProjects.map(r => ({ userId: r.createdById, date: r.createdAt })),
  ]

  // period=all 이면 since를 첫 활동일로 재조정
  let actualSince = since
  if (period === "all" && items.length > 0) {
    const earliest = new Date(Math.min(...items.map(i => i.date.getTime())))
    actualSince = earliest
  }

  // dateKey 생성
  const toKey = (d: Date) => granularity === "week" ? getISOMonday(d) : d.toISOString().slice(0, 10)

  // matrix[dateKey][userId] = count
  const matrix: Record<string, Record<string, number>> = {}
  for (const item of items) {
    const key = toKey(item.date)
    if (!matrix[key]) matrix[key] = {}
    matrix[key][item.userId] = (matrix[key][item.userId] ?? 0) + 1
  }

  const dates = buildDateRange(actualSince, now, granularity)
  const totalUsers = allUsers.length

  // 날짜별 팀 평균 (ADMIN 제외 전체 인원 기준)
  const avgLine = dates.map(d => {
    const dayTotal = Object.values(matrix[d] ?? {}).reduce((s, c) => s + c, 0)
    return totalUsers > 0 ? Math.round((dayTotal / totalUsers) * 10) / 10 : 0
  })

  // 기간 내 활동 합산 (ADMIN 제외) → Top N 계산
  const userTotals: Record<string, number> = {}
  for (const item of items) {
    userTotals[item.userId] = (userTotals[item.userId] ?? 0) + 1
  }
  const topUserIds = [...allUsers]
    .sort((a, b) => (userTotals[b.id] ?? 0) - (userTotals[a.id] ?? 0))
    .filter(u => (userTotals[u.id] ?? 0) > 0)
    .slice(0, 7)
    .map(u => u.id)

  // 선택된 사용자 series (selectedIds가 없으면 top7 사용)
  const seriesIds = selectedIds.length > 0 ? selectedIds : topUserIds
  const series = allUsers
    .filter(u => seriesIds.includes(u.id))
    .map(u => ({
      id: u.id,
      name: u.name,
      department: u.department,
      data: dates.map(d => matrix[d]?.[u.id] ?? 0),
    }))

  return NextResponse.json({
    dates,
    avgLine,
    totalUsers,
    allUsers: allUsers.map(u => ({ id: u.id, name: u.name, department: u.department })),
    series,
    topUserIds,
  })
}
