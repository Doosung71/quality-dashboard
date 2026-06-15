import { auth } from "@/auth"
import { isAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

const AUDIT_TYPE_LABEL: Record<string, string> = {
  INITIAL: "초기심사", PERIODIC: "정기심사", FOLLOW_UP: "사후관리", SPECIAL: "특별심사",
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await auth()
  if (!session || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { userId } = await params
  const { searchParams } = new URL(req.url)
  const period = searchParams.get("period") ?? "all"
  const raw = searchParams.get("limit") ?? "100"
  const parsed = Number.parseInt(raw, 10)
  const limit = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 500) : 100

  let since: Date | undefined
  if (period === "7")  since = new Date(Date.now() - 7  * 86400000)
  if (period === "30") since = new Date(Date.now() - 30 * 86400000)
  const dateFilter = since ? { createdAt: { gte: since } } : {}

  const [
    boardPosts, boardComments,
    feedbackPosts, feedbackReplies,
    claims, ncrs,
    incoming, source, audits,
    tenders, witnessInspections, meetings, qpaAudits, awardedProjects,
  ] = await Promise.all([
    prisma.boardPost.findMany({
      where: { authorId: userId, ...dateFilter },
      select: { id: true, title: true, category: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.boardComment.findMany({
      where: { authorId: userId, ...dateFilter },
      select: { id: true, content: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.feedback.findMany({
      where: { authorId: userId, ...dateFilter },
      select: { id: true, content: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.feedbackReply.findMany({
      where: { authorId: userId, ...dateFilter },
      select: { id: true, content: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.claim.findMany({
      where: { createdById: userId, ...dateFilter },
      select: { id: true, claimNo: true, title: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.ncr.findMany({
      where: { createdById: userId, ...dateFilter },
      select: { id: true, ncrNo: true, title: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.incomingInspection.findMany({
      where: { createdById: userId, ...dateFilter },
      select: { id: true, itemName: true, vendorName: true, result: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.sourceInspection.findMany({
      where: { createdById: userId, ...dateFilter },
      select: { id: true, itemName: true, vendorName: true, result: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.supplierAudit.findMany({
      where: { createdById: userId, ...dateFilter },
      select: { id: true, vendorName: true, auditType: true, overallGrade: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.tender.findMany({
      where: { createdById: userId, ...dateFilter },
      select: { id: true, title: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.witnessInspection.findMany({
      where: { createdById: userId, ...dateFilter },
      select: { id: true, inspNo: true, customer: true, projectName: true, result: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.meeting.findMany({
      where: { createdById: userId, ...dateFilter },
      select: { id: true, title: true, type: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.qpaAudit.findMany({
      where: { createdById: userId, ...dateFilter },
      select: { id: true, qpaNo: true, vendorName: true, result: true, level: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.awardedProject.findMany({
      where: { createdById: userId, ...dateFilter },
      select: { id: true, title: true, status: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
  ])

  const CATEGORY_LABEL: Record<string, string> = { NOTICE: "공지", GENERAL: "일반" }
  const RESULT_LABEL: Record<string, string> = { PASS: "합격", FAIL: "불합격", CONDITIONAL_PASS: "조건부합격" }
  const MEETING_TYPE_LABEL: Record<string, string> = {
    QUALITY_REVIEW: "품질검토", CLAIM_REVIEW: "클레임검토", NCR_REVIEW: "NCR검토",
    SUPPLIER_MEETING: "협력업체회의", INTERNAL: "내부회의", OTHER: "기타",
  }

  type Item = { type: string; label: string; detail: string; createdAt: string }

  const items: Item[] = [
    ...boardPosts.map(r => ({
      type: "게시글",
      label: r.title,
      detail: CATEGORY_LABEL[r.category] ?? r.category,
      createdAt: r.createdAt.toISOString(),
    })),
    ...boardComments.map(r => ({
      type: "댓글",
      label: r.content.slice(0, 120),
      detail: "게시판",
      createdAt: r.createdAt.toISOString(),
    })),
    ...feedbackPosts.map(r => ({
      type: "게시글",
      label: r.content.slice(0, 120),
      detail: "소통방",
      createdAt: r.createdAt.toISOString(),
    })),
    ...feedbackReplies.map(r => ({
      type: "댓글",
      label: r.content.slice(0, 120),
      detail: "소통방",
      createdAt: r.createdAt.toISOString(),
    })),
    ...claims.map(r => ({
      type: "클레임",
      label: r.title,
      detail: r.claimNo,
      createdAt: r.createdAt.toISOString(),
    })),
    ...ncrs.map(r => ({
      type: "NCR",
      label: r.title,
      detail: r.ncrNo,
      createdAt: r.createdAt.toISOString(),
    })),
    ...incoming.map(r => ({
      type: "수입검사",
      label: r.itemName,
      detail: `${r.vendorName} · ${RESULT_LABEL[r.result] ?? r.result}`,
      createdAt: r.createdAt.toISOString(),
    })),
    ...source.map(r => ({
      type: "출장검사",
      label: r.itemName,
      detail: `${r.vendorName} · ${RESULT_LABEL[r.result] ?? r.result}`,
      createdAt: r.createdAt.toISOString(),
    })),
    ...audits.map(r => ({
      type: "협력업체감사",
      label: r.vendorName,
      detail: `${AUDIT_TYPE_LABEL[r.auditType] ?? r.auditType}${r.overallGrade ? ` · ${r.overallGrade}등급` : ""}`,
      createdAt: r.createdAt.toISOString(),
    })),
    ...tenders.map(r => ({
      type: "입찰등록",
      label: r.title,
      detail: "입찰 프로젝트",
      createdAt: r.createdAt.toISOString(),
    })),
    ...witnessInspections.map(r => ({
      type: "입회검사",
      label: r.projectName,
      detail: `${r.customer}${r.result ? ` · ${RESULT_LABEL[r.result] ?? r.result}` : ""} · ${r.inspNo}`,
      createdAt: r.createdAt.toISOString(),
    })),
    ...meetings.map(r => ({
      type: "회의록",
      label: r.title,
      detail: MEETING_TYPE_LABEL[r.type] ?? r.type,
      createdAt: r.createdAt.toISOString(),
    })),
    ...qpaAudits.map(r => ({
      type: "QPA",
      label: r.vendorName,
      detail: `${r.result}${r.level ? ` · ${r.level}등급` : ""} · ${r.qpaNo}`,
      createdAt: r.createdAt.toISOString(),
    })),
    ...awardedProjects.map(r => ({
      type: "수주PJT",
      label: r.title ?? "수주 프로젝트",
      detail: r.status,
      createdAt: r.createdAt.toISOString(),
    })),
  ]

  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return NextResponse.json(items.slice(0, limit))
}
