import { NextRequest, NextResponse } from "next/server";
import { requireActiveSession } from "@/lib/session-guard";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/permissions";

type Params = { params: Promise<{ id: string }> };

// GET /api/test-plans/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await requireActiveSession();
  if (session instanceof NextResponse) return session;

  const { id } = await params;
  const plan = await prisma.testPlan.findUnique({
    where: { id },
    include: {
      equipment:    true,
      owner:        { select: { id: true, name: true, department: true } },
      ownerHistory: {
        include: {
          owner:     { select: { id: true, name: true, department: true } },
          changedBy: { select: { id: true, name: true } },
        },
        orderBy: { changedAt: "desc" },
        take: 10,
      },
    },
  });

  if (!plan) return NextResponse.json({ error: "시험 계획을 찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json(plan);
}

// PATCH /api/test-plans/[id] — 수정 + 담당자 변경 시 이력 자동 기록
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await requireActiveSession();
  if (session instanceof NextResponse) return session;

  const role = session.user.role as string;
  if (!canWrite(role, "/facilities")) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  const ALLOWED_BASE = [
    "equipmentId","testCategory","projectName","sampleType","sampleDescription",
    "plannedStart","plannedEnd","actualStart","actualEnd","status","progress","logs",
  ] as const;

  const OWNER_FIELDS = ["managingTeam","ownerId","ownerName"] as const;

  const data: Record<string, unknown> = {};
  for (const key of ALLOWED_BASE) { if (key in body) data[key] = body[key]; }

  let ownerChanged = false;
  for (const key of OWNER_FIELDS) {
    if (key in body) { data[key] = body[key]; ownerChanged = true; }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "변경할 항목이 없습니다." }, { status: 400 });
  }

  // Medium-F: changerId 방어 가드
  const changerId = session.user.id;
  if (!changerId) {
    return NextResponse.json({ error: "세션 오류: 변경자 ID를 확인할 수 없습니다." }, { status: 401 });
  }

  const [plan] = await prisma.$transaction(
    async (tx) => {
      const updated = await tx.testPlan.update({ where: { id }, data });

      if (ownerChanged) {
        await tx.testPlanOwnerHistory.create({
          data: {
            testPlanId:   id,
            managingTeam: updated.managingTeam ?? null,
            ownerId:      updated.ownerId      ?? null,
            ownerName:    updated.ownerName    ?? null,
            changedById:  changerId,
            note:         body.ownerChangeNote ?? null,
          },
        });
      }
      return [updated];
    },
    { maxWait: 5000, timeout: 10000 }  // Medium-B: Neon 서버리스 트랜잭션 타임아웃 명시
  );

  return NextResponse.json(plan);
}

// DELETE /api/test-plans/[id]
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await requireActiveSession();
  if (session instanceof NextResponse) return session;

  const role = session.user.role as string;
  if (!canWrite(role, "/facilities")) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { id } = await params;
  await prisma.testPlan.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
