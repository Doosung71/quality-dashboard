import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { ArrowLeft, ClipboardCheck } from "lucide-react"
import AuditDetailClient from "./AuditDetailClient"

const auditTypeLabel: Record<string, string> = {
  INITIAL: "초기 심사", PERIODIC: "정기 심사", FOLLOW_UP: "사후관리 심사", SPECIAL: "특별 심사",
}

export default async function AuditDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) redirect("/login")
  const { id } = await params

  const audit = await prisma.supplierAudit.findUnique({
    where: { id },
    include: {
      findings: { orderBy: [{ severity: "asc" }, { createdAt: "asc" }] },
      createdBy: { select: { name: true, nickname: true } },
    },
  })
  if (!audit) redirect("/vendors/audits")

  return (
    <div className="flex flex-col gap-6">
      {/* 헤더 */}
      <div className="flex items-start gap-3">
        <Link href="/vendors/audits" className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors shrink-0 mt-0.5">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <ClipboardCheck className="w-4 h-4 text-indigo-500" />
            <h1 className="text-xl font-bold text-slate-900">{audit.vendorName}</h1>
            <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded">{auditTypeLabel[audit.auditType] ?? audit.auditType}</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
              audit.status === "COMPLETED"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-amber-50 text-amber-700 border-amber-200"
            }`}>{audit.status === "COMPLETED" ? "완료" : "예정"}</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {new Date(audit.auditDate).toLocaleDateString("ko-KR")} · 감사자: {audit.auditor}
            {audit.location && ` · ${audit.location}`}
            {" · 등록: "}{audit.createdBy.nickname ?? audit.createdBy.name}
          </p>
        </div>
      </div>

      <AuditDetailClient
        audit={{
          id:           audit.id,
          status:       audit.status,
          overallGrade: audit.overallGrade,
          totalScore:   audit.totalScore,
          summary:      audit.summary,
          attachments:  (audit.attachments as { url: string; name: string; size: number; contentType: string }[]) ?? [],
          findings:     audit.findings.map(f => ({
            id:          f.id,
            category:    f.category,
            description: f.description,
            severity:    f.severity,
            requirement: f.requirement,
            status:      f.status,
            dueDate:     f.dueDate?.toISOString() ?? null,
            response:    f.response,
            closedAt:    f.closedAt?.toISOString() ?? null,
          })),
        }}
      />
    </div>
  )
}
