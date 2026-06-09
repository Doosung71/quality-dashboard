import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { ArrowLeft, ClipboardList } from "lucide-react"
import QpaDetailClient from "./QpaDetailClient"

export default async function QpaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) redirect("/login")
  const { id } = await params

  const audit = await prisma.qpaAudit.findUnique({
    where: { id },
    include: {
      items:    { orderBy: { itemNo: "asc" } },
      findings: { orderBy: { seq:    "asc" } },
      createdBy: { select: { name: true, nickname: true } },
    },
  })
  if (!audit) redirect("/vendors/qpa")

  const canWrite = ["TEAM_LEAD", "DIRECTOR", "ADMIN"].includes(session.user.role)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-3">
        <Link
          href="/vendors/qpa"
          className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors shrink-0 mt-0.5"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <ClipboardList className="w-4 h-4 text-indigo-500" />
            <span className="text-[11px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{audit.qpaNo}</span>
            <h1 className="text-xl font-bold text-slate-900">{audit.vendorName}</h1>
            {audit.partName && <span className="text-xs text-slate-500">{audit.partName}</span>}
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
              audit.status === "Completed"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-amber-50 text-amber-700 border-amber-200"
            }`}>{audit.status === "Completed" ? "완료" : "진행 중"}</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {new Date(audit.auditDate).toLocaleDateString("ko-KR")} · {audit.auditorNames}
            {audit.location && ` · ${audit.location}`}
          </p>
        </div>
      </div>

      <QpaDetailClient
        audit={{
          id:             audit.id,
          qpaNo:          audit.qpaNo,
          vendorName:     audit.vendorName,
          location:       audit.location,
          partName:       audit.partName,
          auditDate:      audit.auditDate.toISOString(),
          auditorNames:   audit.auditorNames,
          totalPotential: audit.totalPotential,
          totalScore:     audit.totalScore,
          totalPercent:   audit.totalPercent,
          level:          audit.level,
          result:         audit.result,
          status:          audit.status,
          templateVersion: audit.templateVersion,
          items: audit.items.map(i => ({
            id:          i.id,
            itemNo:      i.itemNo,
            category:    i.category,
            subCategory: i.subCategory,
            isKey:       i.isKey,
            checkItem:   i.checkItem,
            criteria:    i.criteria,
            potential:   i.potential,
            score:       i.score,
            isNA:        i.isNA,
            comment:     i.comment,
            evidence:    i.evidence,
          })),
          findings: audit.findings.map(f => ({
            id:          f.id,
            seq:         f.seq,
            category:    f.category,
            finding:     f.finding,
            action:      f.action,
            responsible: f.responsible,
            dueDate:     f.dueDate?.toISOString() ?? null,
            status:      f.status,
          })),
        }}
        canWrite={canWrite}
      />
    </div>
  )
}
