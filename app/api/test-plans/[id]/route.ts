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
    include: { equipment: true },
  });

  if (!plan) return NextResponse.json({ error: "시험 계획을 찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json(plan);
}

// PATCH /api/test-plans/[id] — 수정 (진행률·상태 업데이트 포함)
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
    "equipmentId","testCategory","projectName","sampleType","sampleDescription",
    "plannedStart","plannedEnd","actualStart","actualEnd",
    "status","progress","logs",
  ] as const;

  const data: Record<string, unknown> = {};
  for (const key of ALLOWED) {
    if (key in body) data[key] = body[key];
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "변경할 항목이 없습니다." }, { status: 400 });
  }

  const plan = await prisma.testPlan.update({ where: { id }, data });
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
