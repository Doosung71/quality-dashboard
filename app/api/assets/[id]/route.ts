import { NextRequest, NextResponse } from "next/server";
import { requireActiveSession } from "@/lib/session-guard";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/permissions";

type Params = { params: Promise<{ id: string }> };

// GET /api/assets/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await requireActiveSession();
  if (session instanceof NextResponse) return session;

  const { id } = await params;
  const equipment = await prisma.equipment.findUnique({
    where: { id },
    include: {
      testPlans:    { orderBy: { plannedStart: "asc" } },
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

  if (!equipment) return NextResponse.json({ error: "설비를 찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json(equipment);
}

// PATCH /api/assets/[id] — 설비 수정 + 소유자 변경 시 이력 자동 기록
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
    "hallId","yardId","siteId","category","name","type","spec",
    "maker","makerCountry","yearIntroduced","quantity","status",
    "replacedById","replacesId","notes",
  ] as const;

  const OWNER_FIELDS = ["managingTeam","ownerId","ownerName","ownerChangeNote"] as const;

  const data: Record<string, unknown> = {};
  for (const key of ALLOWED_BASE) {
    if (key in body) data[key] = body[key];
  }

  const ownerUpdate: { managingTeam?: string | null; ownerId?: string | null; ownerName?: string | null } = {};
  let ownerChanged = false;

  for (const key of OWNER_FIELDS) {
    if (key in body && key !== "ownerChangeNote") {
      ownerUpdate[key as "managingTeam" | "ownerId" | "ownerName"] = body[key];
      data[key] = body[key];
      ownerChanged = true;
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "변경할 항목이 없습니다." }, { status: 400 });
  }

  const [equipment] = await prisma.$transaction(async (tx) => {
    const updated = await tx.equipment.update({ where: { id }, data });

    if (ownerChanged) {
      await tx.equipmentOwnerHistory.create({
        data: {
          equipmentId:  id,
          managingTeam: updated.managingTeam ?? null,
          ownerId:      updated.ownerId      ?? null,
          ownerName:    updated.ownerName    ?? null,
          changedById:  session.user.id,
          note:         body.ownerChangeNote ?? null,
        },
      });
    }

    return [updated];
  });

  return NextResponse.json(equipment);
}

// DELETE /api/assets/[id]
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await requireActiveSession();
  if (session instanceof NextResponse) return session;

  const role = session.user.role as string;
  if (!canWrite(role, "/facilities")) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { id } = await params;
  await prisma.equipment.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
