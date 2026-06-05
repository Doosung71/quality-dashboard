import { NextRequest, NextResponse } from "next/server";
import { requireActiveSession } from "@/lib/session-guard";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/permissions";

// GET /api/test-plans — 시험 계획 목록 (쿼리: equipmentId, status)
export async function GET(req: NextRequest) {
  const session = await requireActiveSession();
  if (session instanceof NextResponse) return session;

  const { searchParams } = new URL(req.url);
  const equipmentId = searchParams.get("equipmentId") ?? undefined;
  const status      = searchParams.get("status")      ?? undefined;

  const plans = await prisma.testPlan.findMany({
    where: {
      ...(equipmentId ? { equipmentId } : {}),
      ...(status      ? { status }      : {}),
    },
    include: { equipment: { select: { id: true, name: true, type: true, siteId: true, hallId: true, yardId: true } } },
    orderBy: { plannedStart: "asc" },
  });

  return NextResponse.json(plans);
}

// POST /api/test-plans — 시험 계획 신규 등록 (TEAM_LEAD 이상)
export async function POST(req: NextRequest) {
  const session = await requireActiveSession();
  if (session instanceof NextResponse) return session;

  const role = session.user.role as string;
  if (!canWrite(role, "/facilities")) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const body = await req.json();
  const {
    equipmentId, testCategory, projectName, sampleType,
    sampleDescription, plannedStart, plannedEnd,
    actualStart, actualEnd, status, progress,
  } = body;

  if (!equipmentId || !testCategory || !projectName?.trim() || !plannedStart || !plannedEnd) {
    return NextResponse.json(
      { error: "필수 항목을 입력하세요 (설비·시험종류·프로젝트명·계획 기간)." },
      { status: 400 }
    );
  }

  // 설비 존재 확인
  const eq = await prisma.equipment.findUnique({ where: { id: equipmentId } });
  if (!eq) return NextResponse.json({ error: "설비를 찾을 수 없습니다." }, { status: 404 });

  const plan = await prisma.testPlan.create({
    data: {
      equipmentId,
      testCategory,
      projectName:      projectName.trim(),
      sampleType:       sampleType       || "cable",
      sampleDescription: sampleDescription || "",
      plannedStart,
      plannedEnd,
      actualStart:  actualStart  || null,
      actualEnd:    actualEnd    || null,
      status:       status       || "준비중",
      progress:     Number(progress) || 0,
      logs:         [],
    },
    include: { equipment: { select: { id: true, name: true, type: true, siteId: true } } },
  });

  return NextResponse.json(plan, { status: 201 });
}
