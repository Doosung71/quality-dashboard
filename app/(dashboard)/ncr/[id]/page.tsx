import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireActivePageSession } from "@/lib/session-guard";
import { canWrite, canVerifyLesson } from "@/lib/permissions";
import { NCRDetailPage } from "./NCRDetailPage";
import type { NCR, NCRTimelineItem, NCRAttachment } from "@/types/ncr";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function NCRDetailRoute({ params }: Props) {
  const { id } = await params;
  const session = await requireActivePageSession();
  const editable = canWrite(session.user.role, "/ncr");
  const verifyLesson = canVerifyLesson(session.user.role);

  const raw = await prisma.ncr.findUnique({ where: { id } });
  if (!raw) notFound();

  const ncr: NCR = {
    id:          raw.id,
    ncrNo:       raw.ncrNo,
    title:       raw.title,
    source:      raw.source,
    projectKey:  raw.projectKey,
    severity:    raw.severity    as NCR["severity"],
    status:      raw.status      as NCR["status"],
    disposition: raw.disposition as NCR["disposition"],
    issuedDate:  raw.issuedDate.toISOString().slice(0, 10),
    targetDate:  raw.targetDate.toISOString().slice(0, 10),
    closedDate:  raw.closedDate?.toISOString().slice(0, 10),
    assignee:    raw.assignee,
    description: raw.description,
    timeline:    (raw.timeline as unknown as NCRTimelineItem[]) ?? [],
    attachments: (raw.attachments as unknown as NCRAttachment[]) ?? [],
  };

  return (
    <div className="flex flex-col gap-6">
      <NCRDetailPage
        ncr={ncr}
        canEdit={editable}
        canVerifyLesson={verifyLesson}
        userName={session.user.name ?? undefined}
      />
    </div>
  );
}
