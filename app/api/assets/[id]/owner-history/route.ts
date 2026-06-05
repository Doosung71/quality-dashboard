import { NextRequest, NextResponse } from "next/server";
import { requireActiveSession } from "@/lib/session-guard";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/permissions";

type Params = { params: Promise<{ id: string }> };

// GET /api/assets/[id]/owner-history — 담당자 변경 이력 조회
//
// ADR (PoC GET scope 정책):
// - 개별 설비 상세(/[id]): 인증된 전 역할 허용 — 설비 스펙은 민감 개인정보 아님.
//   PRACTITIONER는 목록 GET에서 siteId 필수로 범위 남용 방지.
//   ID를 이미 알아야 직접 접근 가능하므로 추측 위험 낮음.
// - 이력(/[id]/owner-history): 담당자 변경 내역(인사 정보 포함 가능)이므로
//   TEAM_LEAD 이상만 허용 (canWrite 기준 재사용).
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await requireActiveSession();
  if (session instanceof NextResponse) return session;

  const role = session.user.role as string;
  if (!canWrite(role, "/facilities")) {
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
