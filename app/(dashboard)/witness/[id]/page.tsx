import { requireActivePageSession } from "@/lib/session-guard"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { ArrowLeft, Users } from "lucide-react"
import WitnessDetailClient from "./WitnessDetailClient"

const STATUS_BADGE: Record<string, string> = {
  SCHEDULED:   "bg-blue-50 text-blue-700 border-blue-200",
  IN_PROGRESS: "bg-amber-50 text-amber-700 border-amber-200",
  COMPLETED:   "bg-emerald-50 text-emerald-700 border-emerald-200",
  CANCELLED:   "bg-slate-100 text-slate-500 border-slate-200",
}
const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: "예정", IN_PROGRESS: "진행중", COMPLETED: "완료", CANCELLED: "취소"
}

export default async function WitnessDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireActivePageSession()
  const { id } = await params

  const inspection = await prisma.witnessInspection.findUnique({
    where: { id },
    include: {
      createdBy: { select: { name: true, nickname: true } },
      voCs:      { orderBy: { createdAt: "asc" } },
      room:      { select: { id: true, name: true, siteId: true } },
    },
  })
  if (!inspection) redirect("/witness")

  return (
    <div className="flex flex-col gap-6">
      {/* 헤더 */}
      <div className="flex items-start gap-3">
        <Link href="/witness" className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors shrink-0 mt-0.5">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Users className="w-4 h-4 text-indigo-500" />
            <h1 className="text-xl font-bold text-slate-900">{inspection.customer}</h1>
            <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded">{inspection.inspNo}</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${STATUS_BADGE[inspection.status]}`}>
              {STATUS_LABEL[inspection.status]}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {inspection.projectName}
            {inspection.projectNumber && ` · ${inspection.projectNumber}`}
            {" · "}{new Date(inspection.inspectionDate).toLocaleDateString("ko-KR")}
            {inspection.endDate && ` ~ ${new Date(inspection.endDate).toLocaleDateString("ko-KR")}`}
            {" · 담당: "}{inspection.assigneeName}
            {" · 등록: "}{inspection.createdBy.nickname ?? inspection.createdBy.name}
          </p>
        </div>
      </div>

      <WitnessDetailClient
        inspection={{
          id:             inspection.id,
          inspNo:         inspection.inspNo,
          customer:       inspection.customer,
          projectName:    inspection.projectName,
          projectNumber:  inspection.projectNumber,
          productName:    inspection.productName,
          inspectionDate: inspection.inspectionDate.toISOString(),
          endDate:        inspection.endDate?.toISOString() ?? null,
          location:       inspection.location,
          region:         inspection.region ?? null,
          room:           inspection.room ?? null,
          roomId:         inspection.roomId ?? null,
          assigneeId:     inspection.assigneeId,
          assigneeName:   inspection.assigneeName,
          status:         inspection.status,
          result:         inspection.result ?? null,
          description:    inspection.description,
          notes:          inspection.notes,
          attachments:    (inspection.attachments as { url: string; name: string; size: number; contentType: string }[]) ?? [],
        }}
        voCs={inspection.voCs.map(v => ({
          id:          v.id,
          content:     v.content,
          category:    v.category,
          priority:    v.priority,
          status:      v.status,
          response:    v.response,
          dueDate:     v.dueDate?.toISOString() ?? null,
          closedAt:    v.closedAt?.toISOString() ?? null,
          createdAt:   v.createdAt.toISOString(),
        }))}
      />
    </div>
  )
}
