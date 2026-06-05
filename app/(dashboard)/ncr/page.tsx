import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { NCRView } from "@/components/ncr/ncr-view";
import { requireActivePageSession } from "@/lib/session-guard";
import { canWrite } from "@/lib/permissions";
import type { NCR, NCRTimelineItem } from "@/types/ncr";

export default async function NCRPage() {
  const session = await requireActivePageSession();
  const editable = canWrite(session.user.role, "/ncr");

  const raw = await prisma.ncr.findMany({ orderBy: { issuedDate: "desc" } });

  const ncrs: NCR[] = raw.map(n => ({
    id:          n.id,
    ncrNo:       n.ncrNo,
    title:       n.title,
    source:      n.source,
    severity:    n.severity    as NCR["severity"],
    status:      n.status      as NCR["status"],
    disposition: n.disposition as NCR["disposition"],
    issuedDate:  n.issuedDate.toISOString().slice(0, 10),
    targetDate:  n.targetDate.toISOString().slice(0, 10),
    closedDate:  n.closedDate?.toISOString().slice(0, 10),
    assignee:    n.assignee,
    description: n.description,
    timeline:    (n.timeline as unknown as NCRTimelineItem[]) ?? [],
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">부적합품보고(NCR) 트래커</h1>
          <p className="text-slate-500">생산 공정 및 수입 검사에서 검출된 부적합 항목들의 발생 조치부터 최종 효과성 검증 단계까지 관리합니다.</p>
        </div>
        {!editable && (
          <span className="text-xs font-bold px-2 py-1 rounded-full bg-slate-100 text-slate-500 border border-slate-200 mt-1">조회 전용</span>
        )}
      </div>
      <Suspense fallback={<div className="text-sm text-slate-500">부적합 데이터를 불러오는 중...</div>}>
        <NCRView data={{ ncrs }} canEdit={editable} userName={session.user.name ?? undefined} />
      </Suspense>
    </div>
  );
}
