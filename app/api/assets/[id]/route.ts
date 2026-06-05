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
    include: { testPlans: { orderBy: { plannedStart: "asc" } } },
  });

  if (!equipment) return NextResponse.json({ error: "설비를 찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json(equipment);
}

// PATCH /api/assets/[id] — 설비 수정 (TEAM_LEAD 이상)
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await requireActiveSession();
  if (session instanceof NextResponse) return session;

  const role = session.user.role as string;
  if (!canWrite(role, "/facilities")) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  const ALLOWED = [
    "hallId","yardId","siteId","category","name","type","spec",
    "maker","makerCountry","yearIntroduced","quantity","status",
    "replacedById","replacesId","notes",
  ] as const;

  const data: Record<string, unknown> = {};
  for (const key of ALLOWED) {
    if (key in body) data[key] = body[key];
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "변경할 항목이 없습니다." }, { status: 400 });
  }

  const equipment = await prisma.equipment.update({ where: { id }, data });
  return NextResponse.json(equipment);
}

// DELETE /api/assets/[id] — 설비 삭제 (TEAM_LEAD 이상, 관련 TestPlan CASCADE)
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
