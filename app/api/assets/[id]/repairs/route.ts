import { NextRequest, NextResponse } from "next/server";
import { requireActiveSession } from "@/lib/session-guard";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/permissions";

type Params = { params: Promise<{ id: string }> };

// GET /api/assets/[id]/repairs — 수선 이력 조회 (인증 사용자 전체)
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await requireActiveSession();
  if (session instanceof NextResponse) return session;

  const { id } = await params;

  const repairs = await prisma.equipmentRepair.findMany({
    where: { equipmentId: id },
    include: { reportedBy: { select: { id: true, name: true } } },
    orderBy: { reportedAt: "desc" },
  });

  return NextResponse.json(
    repairs.map((r) => ({
      id:             r.id,
      equipmentId:    r.equipmentId,
      type:           r.type,
      title:          r.title,
      description:    r.description,
      status:         r.status,
      reportedAt:     r.reportedAt.toISOString(),
      completedAt:    r.completedAt?.toISOString() ?? null,
      cost:           r.cost,
      vendor:         r.vendor,
      result:         r.result,
      reportedById:   r.reportedById,
      reportedByName: r.reportedBy.name,
      createdAt:      r.createdAt.toISOString(),
    }))
  );
}

// POST /api/assets/[id]/repairs — 수선 등록 (TEAM_LEAD 이상)
export async function POST(req: NextRequest, { params }: Params) {
  const session = await requireActiveSession();
  if (session instanceof NextResponse) return session;

  const role = session.user.role as string;
  if (!canWrite(role, "/facilities")) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const reporterId = session.user.id;
  if (!reporterId) {
    return NextResponse.json({ error: "세션 오류: 사용자 ID를 확인할 수 없습니다." }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  const { type, title, description, status, vendor, cost, result, reportedAt, completedAt } = body;

  if (!type || !title) {
    return NextResponse.json({ error: "유형과 제목은 필수입니다." }, { status: 400 });
  }

  const repair = await prisma.equipmentRepair.create({
    data: {
      id:          `repair-${Date.now()}`,
      equipmentId: id,
      type,
      title,
      description: description ?? "",
      status:      status      ?? "접수",
      vendor:      vendor      ?? null,
      cost:        cost        != null ? Number(cost) : null,
      result:      result      ?? "",
      reportedAt:  reportedAt  ? new Date(reportedAt) : new Date(),
      completedAt: completedAt ? new Date(completedAt) : null,
      reportedById: reporterId,
    },
    include: { reportedBy: { select: { id: true, name: true } } },
  });

  return NextResponse.json(
    {
      id:             repair.id,
      equipmentId:    repair.equipmentId,
      type:           repair.type,
      title:          repair.title,
      description:    repair.description,
      status:         repair.status,
      reportedAt:     repair.reportedAt.toISOString(),
      completedAt:    repair.completedAt?.toISOString() ?? null,
      cost:           repair.cost,
      vendor:         repair.vendor,
      result:         repair.result,
      reportedById:   repair.reportedById,
      reportedByName: repair.reportedBy.name,
      createdAt:      repair.createdAt.toISOString(),
    },
    { status: 201 }
  );
}

// PATCH /api/assets/[id]/repairs — 수선 상태 업데이트 (result, status, completedAt)
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await requireActiveSession();
  if (session instanceof NextResponse) return session;

  const role = session.user.role as string;
  if (!canWrite(role, "/facilities")) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { repairId, status, result, completedAt } = body;

  if (!repairId) {
    return NextResponse.json({ error: "repairId가 필요합니다." }, { status: 400 });
  }

  const updated = await prisma.equipmentRepair.update({
    where: { id: repairId, equipmentId: id },
    data: {
      ...(status      !== undefined && { status }),
      ...(result      !== undefined && { result }),
      ...(completedAt !== undefined && { completedAt: completedAt ? new Date(completedAt) : null }),
      updatedAt: new Date(),
    },
    include: { reportedBy: { select: { id: true, name: true } } },
  });

  return NextResponse.json({
    id:             updated.id,
    status:         updated.status,
    result:         updated.result,
    completedAt:    updated.completedAt?.toISOString() ?? null,
    reportedByName: updated.reportedBy.name,
  });
}
