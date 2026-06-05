import { NextRequest, NextResponse } from "next/server";
import { requireActiveSession } from "@/lib/session-guard";
import { prisma } from "@/lib/prisma";
type Params = { params: Promise<{ id: string }> };

// PRACTITIONER는 /facilities 쓰기 권한이 있어 canWrite("/facilities") 로는 구분 불가.
// 이력(담당자 변경 내역)은 인사 정보를 포함할 수 있으므로 TEAM_LEAD 이상만 허용.
const HISTORY_ROLES = ["DIRECTOR", "ADMIN", "TEAM_LEAD"] as const;

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await requireActiveSession();
  if (session instanceof NextResponse) return session;

  const role = session.user.role as string;
  if (!(HISTORY_ROLES as readonly string[]).includes(role)) {
    return NextResponse.json({ error: "이력 조회는 팀장 이상 권한이 필요합니다." }, { status: 403 });
  }

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
      id:            h.id,
      equipmentId:   h.equipmentId,
      managingTeam:  h.managingTeam,
      ownerId:       h.ownerId,
      ownerName:     h.owner?.name ?? h.ownerName,
      ownerDept:     h.owner?.department ?? null,
      changedById:   h.changedById,
      changedByName: h.changedBy.name,
      note:          h.note,
      changedAt:     h.changedAt.toISOString(),
    }))
  );
}
