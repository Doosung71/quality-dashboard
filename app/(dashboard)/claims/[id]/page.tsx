import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireActivePageSession } from "@/lib/session-guard";
import { canWrite, canVerifyLesson } from "@/lib/permissions";
import { ClaimDetailPage } from "./ClaimDetailPage";
import type { Claim, ClaimTimelineItem, ClaimAttachment } from "@/types/claim";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ClaimDetailRoute({ params }: Props) {
  const { id } = await params;
  const session = await requireActivePageSession();
  const editable = canWrite(session.user.role, "/claims");
  const verifyLesson = canVerifyLesson(session.user.role);

  const raw = await prisma.claim.findUnique({ where: { id } });
  if (!raw) notFound();

  const claim: Claim = {
    id:          raw.id,
    claimNo:     raw.claimNo,
    title:       raw.title,
    customer:    raw.customer,
    projectKey:  raw.projectKey,
    priority:    raw.priority as Claim["priority"],
    status:      raw.status as Claim["status"],
    receivedAt:  raw.receivedAt.toISOString().slice(0, 10),
    targetDate:  raw.targetDate?.toISOString().slice(0, 10),
    closedAt:    raw.closedAt?.toISOString().slice(0, 10),
    assignee:         raw.assignee,
    description:      raw.description,
    responsibleParty: raw.responsibleParty ?? undefined,
    timeline:         (raw.timeline as unknown as ClaimTimelineItem[]) ?? [],
    attachments:      (raw.attachments as unknown as ClaimAttachment[]) ?? [],
  };

  return (
    <div className="flex flex-col gap-6">
      <ClaimDetailPage
        claim={claim}
        canEdit={editable}
        canVerifyLesson={verifyLesson}
        userName={session.user.name ?? undefined}
      />
    </div>
  );
}
