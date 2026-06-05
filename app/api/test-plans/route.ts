import { NextRequest, NextResponse } from "next/server";
import { requireActiveSession } from "@/lib/session-guard";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/permissions";
import { validateDateRange, OCCUPIED_TEST_STATUSES } from "@/lib/facilities-utils";

// GET /api/test-plans — 시험 계획 목록 (쿼리: equipmentId, status)
// 설계 의도(M-4): PRACTITIONER는 equipmentId 지정 없이 전체 조회 불가
export async function GET(req: NextRequest) {
  const session = await requireActiveSession();
  if (session instanceof NextResponse) return session;

  const role = session.user.role as string;
  const { searchParams } = new URL(req.url);
  const equipmentId = searchParams.get("equipmentId") ?? undefined;
  const status      = searchParams.get("status")      ?? undefined;

  if (role === "PRACTITIONER" && !equipmentId) {
    return NextResponse.json(
      { error: "실무자는 설비(equipmentId)를 지정해 조회해야 합니다." },
      { status: 403 }
    );
  }

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
    managingTeam, ownerId, ownerName,
  } = body;

  if (!equipmentId || !testCategory || !projectName?.trim() || !plannedStart || !plannedEnd) {
    return NextResponse.json(
      { error: "필수 항목을 입력하세요 (설비·시험종류·프로젝트명·계획 기간)." },
      { status: 400 }
    );
  }

  // H-3: 날짜 형식 및 순서 검증
  const dateCheck = validateDateRange(plannedStart, plannedEnd);
  if (!dateCheck.valid) {
    return NextResponse.json({ error: dateCheck.error }, { status: 400 });
  }

  // 설비 존재 확인
  const eq = await prisma.equipment.findUnique({ where: { id: equipmentId } });
  if (!eq) return NextResponse.json({ error: "설비를 찾을 수 없습니다." }, { status: 404 });

  // 서버 측 일정 충돌 검사 (High — 클라이언트 우회 방어)
  // 준비중/시험중 상태이며 날짜가 겹치는 TestPlan 존재 여부 확인
  const conflicting = await prisma.testPlan.findFirst({
    where: {
      equipmentId,
      status: { in: [...OCCUPIED_TEST_STATUSES] },
      plannedStart: { lte: plannedEnd },
      plannedEnd:   { gte: plannedStart },
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
      status:       status          || "준비중",
      progress:     Number(progress) || 0,
      logs:         [],
      managingTeam: managingTeam || null,
      ownerId:      ownerId      || null,
      ownerName:    ownerName    || null,
    },
    include: { equipment: { select: { id: true, name: true, type: true, siteId: true } } },
  });

  return NextResponse.json(plan, { status: 201 });
}
