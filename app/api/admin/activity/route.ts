import { auth } from "@/auth"
import { isAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

// ISO 주 기준: 이번 주 월요일 00:00 KST
function calcSince(period: string): Date | undefined {
  const now = new Date()
  if (period === "week") {
    const day = now.getDay() // 0=일, 1=월, ..., 6=토
    const monday = new Date(now)
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
    monday.setHours(0, 0, 0, 0)
    return monday
  }
  if (period === "month") {
    return new Date(now.getFullYear(), now.getMonth(), 1)
  }
  return undefined
}

export async function GET(req: Request) {
  const session = await auth()
  if (!session || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const period = searchParams.get("period") ?? "all" // "week" | "month" | "all"

  const since = calcSince(period)
  const dateFilter = since ? { createdAt: { gte: since } } : {}

  const [
    users,
    posts, comments,
    feedbackPosts, feedbackReplies,
    claims, ncrs,
    incoming, source, audits,
    tenders, witnessInspections, meetings, qpaAudits, awardedProjects,
  ] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, email: true, role: true, status: true, department: true, createdAt: true },
    }),
    prisma.boardPost.groupBy({
      by: ["authorId"], where: dateFilter,
      _count: { _all: true }, _max: { createdAt: true },
    }),
    prisma.boardComment.groupBy({
      by: ["authorId"], where: dateFilter,
      _count: { _all: true }, _max: { createdAt: true },
    }),
    prisma.feedback.groupBy({
      by: ["authorId"], where: dateFilter,
      _count: { _all: true }, _max: { createdAt: true },
    }),
    prisma.feedbackReply.groupBy({
      by: ["authorId"], where: dateFilter,
      _count: { _all: true }, _max: { createdAt: true },
    }),
    prisma.claim.groupBy({
      by: ["createdById"], where: dateFilter,
      _count: { _all: true }, _max: { createdAt: true },
    }),
    prisma.ncr.groupBy({
      by: ["createdById"], where: dateFilter,
      _count: { _all: true }, _max: { createdAt: true },
    }),
    prisma.incomingInspection.groupBy({
      by: ["createdById"], where: dateFilter,
      _count: { _all: true }, _max: { createdAt: true },
    }),
    prisma.sourceInspection.groupBy({
      by: ["createdById"], where: dateFilter,
      _count: { _all: true }, _max: { createdAt: true },
    }),
    prisma.supplierAudit.groupBy({
      by: ["createdById"], where: dateFilter,
      _count: { _all: true }, _max: { createdAt: true },
    }),
    prisma.tender.groupBy({
      by: ["createdById"], where: dateFilter,
      _count: { _all: true }, _max: { createdAt: true },
    }),
    prisma.witnessInspection.groupBy({
      by: ["createdById"], where: dateFilter,
      _count: { _all: true }, _max: { createdAt: true },
    }),
    prisma.meeting.groupBy({
      by: ["createdById"], where: dateFilter,
      _count: { _all: true }, _max: { createdAt: true },
    }),
    prisma.qpaAudit.groupBy({
      by: ["createdById"], where: dateFilter,
      _count: { _all: true }, _max: { createdAt: true },
    }),
    prisma.awardedProject.groupBy({
      by: ["createdById"], where: dateFilter,
      _count: { _all: true }, _max: { createdAt: true },
    }),
  ])

  const toMap = (rows: { _count: { _all: number }; _max: { createdAt: Date | null } }[], key: string) =>
    Object.fromEntries(
      rows.map(r => [(r as Record<string, unknown>)[key] as string, { count: r._count._all, last: r._max.createdAt }])
    )

  const postMap              = toMap(posts,             "authorId")
  const commentMap           = toMap(comments,          "authorId")
  const feedPostMap          = toMap(feedbackPosts,     "authorId")
  const feedReplyMap         = toMap(feedbackReplies,   "authorId")
  const claimMap             = toMap(claims,            "createdById")
  const ncrMap               = toMap(ncrs,             "createdById")
  const incomingMap          = toMap(incoming,          "createdById")
  const sourceMap            = toMap(source,            "createdById")
  const auditMap             = toMap(audits,            "createdById")
  const tenderMap            = toMap(tenders,           "createdById")
  const witnessMap           = toMap(witnessInspections,"createdById")
  const meetingMap           = toMap(meetings,          "createdById")
  const qpaMap               = toMap(qpaAudits,         "createdById")
  const awardedMap           = toMap(awardedProjects,   "createdById")

  const rows = users.map(u => {
    const pc  = (postMap[u.id]?.count      ?? 0) + (feedPostMap[u.id]?.count  ?? 0)
    const cc  = (commentMap[u.id]?.count   ?? 0) + (feedReplyMap[u.id]?.count ?? 0)
    const cl  = claimMap[u.id]?.count    ?? 0
    const nc  = ncrMap[u.id]?.count      ?? 0
    const ic  = incomingMap[u.id]?.count ?? 0
    const sc  = sourceMap[u.id]?.count   ?? 0
    const ac  = auditMap[u.id]?.count    ?? 0
    const tc  = tenderMap[u.id]?.count   ?? 0
    const wc  = witnessMap[u.id]?.count  ?? 0
    const mc  = meetingMap[u.id]?.count  ?? 0
    const qc  = qpaMap[u.id]?.count      ?? 0
    const arc = awardedMap[u.id]?.count  ?? 0
    const total = pc + cc + cl + nc + ic + sc + ac + tc + wc + mc + qc + arc

    const dates = [
      postMap[u.id]?.last, commentMap[u.id]?.last,
      feedPostMap[u.id]?.last, feedReplyMap[u.id]?.last,
      claimMap[u.id]?.last, ncrMap[u.id]?.last,
      incomingMap[u.id]?.last, sourceMap[u.id]?.last,
      auditMap[u.id]?.last, tenderMap[u.id]?.last,
      witnessMap[u.id]?.last, meetingMap[u.id]?.last,
      qpaMap[u.id]?.last, awardedMap[u.id]?.last,
    ].filter(Boolean) as Date[]

    const lastActivity = dates.length > 0
      ? new Date(Math.max(...dates.map(d => new Date(d).getTime())))
      : null

    return {
      id: u.id, name: u.name, email: u.email,
      role: u.role, status: u.status, department: u.department,
      posts: pc, comments: cc,
      claims: cl, ncrs: nc,
      incomingInspections: ic, sourceInspections: sc, audits: ac,
      tenders: tc, witnessInspections: wc, meetings: mc, qpaAudits: qc, awardedProjects: arc,
      total,
      lastActivity: lastActivity?.toISOString() ?? null,
    }
  }).sort((a, b) => b.total - a.total)

  // 전체 기간의 경우 가장 오래된 사용자 등록일 반환 → 프론트에서 "전체 (YYYY.MM~)" 표시에 활용
  const periodStart = period === "all" && users.length > 0
    ? users[0].createdAt.toISOString()
    : undefined

  return NextResponse.json({ rows, periodStart })
}
