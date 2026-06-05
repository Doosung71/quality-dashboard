import { NextRequest, NextResponse } from "next/server";
import { requireActiveSession } from "@/lib/session-guard";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

// GET /api/assets/[id]/owner-history — 담당자 변경 이력 조회
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await requireActiveSession();
  if (session instanceof NextResponse) return session;

  const { id } = await params;

  const history = await prisma.equipmentOwnerHistory.findMany({
    where: { equipmentId: id },
    include: {
      owner:     { select: { id: true, name: true, department: true } },
      changedBy: { select: { id: true, name: true } },
    },
    orderBy: { changedAt: "desc" },
  });

  return NextResponse.json(
    history.map((h) => ({
      id:           h.id,
      equipmentId:  h.equipmentId,
      managingTeam: h.managingTeam,
      ownerId:      h.ownerId,
      ownerName:    h.owner?.name ?? h.ownerName,
      ownerDept:    h.owner?.department ?? null,
      changedById:  h.changedById,
      changedByName: h.changedBy.name,
      note:         h.note,
      changedAt:    h.changedAt.toISOString(),
    }))
  );
}
