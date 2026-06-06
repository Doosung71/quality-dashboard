import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { ClaimsView } from "@/components/claims/claims-view";
import { requireActivePageSession } from "@/lib/session-guard";
import { canWrite } from "@/lib/permissions";
import type { Claim, ClaimTimelineItem } from "@/types/claim";

export default async function ClaimsPage() {
  const session = await requireActivePageSession();
  const editable = canWrite(session.user.role, "/claims");

  const raw = await prisma.claim.findMany({ orderBy: { receivedAt: "desc" } });

  const claims: Claim[] = raw.map(c => ({
    id:          c.id,
    claimNo:     c.claimNo,
    title:       c.title,
    customer:    c.customer,
    priority:    c.priority as Claim["priority"],
    status:      c.status   as Claim["status"],
    receivedAt:  c.receivedAt.toISOString().slice(0, 10),
    targetDate:  c.targetDate?.toISOString().slice(0, 10),
    closedAt:    c.closedAt?.toISOString().slice(0, 10),
    assignee:    c.assignee,
    description: c.description,
    timeline:    (c.timeline as unknown as ClaimTimelineItem[]) ?? [],
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">고객 클레임 트래커</h1>
          <p className="text-slate-500">품질 이슈의 접수부터 클로징까지 전체 처리 과정을 관리합니다.</p>
        </div>
        {!editable && (
          <span className="text-xs font-bold px-2 py-1 rounded-full bg-slate-100 text-slate-500 border border-slate-200 mt-1">조회 전용</span>
        )}
      </div>
      <Suspense>
        <ClaimsView
          data={{ claims }}
          canEdit={editable}
          userName={session.user.name ?? undefined}
        />
      </Suspense>
    </div>
  );
}
