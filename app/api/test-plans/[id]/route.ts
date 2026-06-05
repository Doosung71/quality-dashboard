import { NextRequest, NextResponse } from "next/server";
import { requireActiveSession } from "@/lib/session-guard";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/permissions";
import { validateDateRange } from "@/lib/facilities-utils";

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

  // H-3: 날짜 형식·순서 검증 (plannedStart/plannedEnd 변경 시)
  if (data.plannedStart !== undefined || data.plannedEnd !== undefined) {
    const current = await prisma.testPlan.findUnique({
      where: { id },
      select: { plannedStart: true, plannedEnd: true },
    });
    const newStart = (data.plannedStart as string | undefined) ?? current?.plannedStart;
    const newEnd   = (data.plannedEnd   as string | undefined) ?? current?.plannedEnd;
    const dateCheck = validateDateRange(newStart, newEnd);
    if (!dateCheck.valid) {
      return NextResponse.json({ error: dateCheck.error }, { status: 400 });
    }

    // H-2: PATCH 일정 충돌 검사 (equipmentId 또는 날짜 변경 시)
    const eqId = (data.equipmentId as string | undefined) ?? (
      await prisma.testPlan.findUnique({ where: { id }, select: { equipmentId: true } })
    )?.equipmentId;

    if (eqId && newStart && newEnd) {
      const conflicting = await prisma.testPlan.findFirst({
        where: {
          id:          { not: id },       // 자기 자신 제외
          equipmentId: eqId,
          status:      { in: ["준비중", "시험중", "지연"] },
          plannedStart: { lte: newEnd },
          plannedEnd:   { gte: newStart },
        },
        select: {
          id: true, projectName: true, status: true,
          plannedStart: true, plannedEnd: true,
          managingTeam: true, ownerName: true,
        },
      });

      if (conflicting) {
        return NextResponse.json(
          {
            error: "해당 설비는 지정 기간에 이미 사용 중입니다. 담당자와 조율 후 진행하세요.",
            conflict: {
              id:           conflicting.id,
              projectName:  conflicting.projectName,
              status:       conflicting.status,
              plannedStart: conflicting.plannedStart,
              plannedEnd:   conflicting.plannedEnd,
              managingTeam: conflicting.managingTeam,
              ownerName:    conflicting.ownerName,
            },
          },
          { status: 409 }
        );
      }
    }
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
