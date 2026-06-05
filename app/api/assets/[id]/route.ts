import { NextRequest, NextResponse } from "next/server";
import { requireActiveSession } from "@/lib/session-guard";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/permissions";
import { OCCUPIED_TEST_STATUSES, ACTIVE_REPAIR_STATUSES } from "@/lib/facilities-utils";

type Params = { params: Promise<{ id: string }> };

// GET /api/assets/[id]
// ADR: 설비 상세는 인증된 전 역할 허용 (PoC 설계 의도, 설비 스펙은 비민감).
// PRACTITIONER는 목록 GET에서 siteId 필수로 범위 제한 적용 중.
// 담당자 이력은 /owner-history에서 TEAM_LEAD 이상만 허용.
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await requireActiveSession();
  if (session instanceof NextResponse) return session;

  const { id } = await params;
  // ownerHistory는 포함하지 않음 — 이력은 /owner-history 전용 엔드포인트(TEAM_LEAD 이상)에서만 제공
  const equipment = await prisma.equipment.findUnique({
    where: { id },
    include: {
      testPlans: { orderBy: { plannedStart: "asc" } },
      owner:     { select: { id: true, name: true, department: true } },
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

  // Medium-F: requireActiveSession()가 DB user 조회를 보장하지만 방어 가드 추가
  const changerId = session.user.id;
  if (!changerId) {
    return NextResponse.json({ error: "세션 오류: 변경자 ID를 확인할 수 없습니다." }, { status: 401 });
  }

  const [equipment] = await prisma.$transaction(
    async (tx) => {
      const updated = await tx.equipment.update({ where: { id }, data });

      if (ownerChanged) {
        await tx.equipmentOwnerHistory.create({
          data: {
            equipmentId:  id,
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

  return NextResponse.json(equipment);
}

// DELETE /api/assets/[id] — 활성 TestPlan 존재 시 삭제 차단 (Critical-H)
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await requireActiveSession();
  if (session instanceof NextResponse) return session;

  const role = session.user.role as string;
  if (!canWrite(role, "/facilities")) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { id } = await params;

  // OCCUPIED_TEST_STATUSES 공통 상수 사용 (재재검수 반영)
  const activeTests = await prisma.testPlan.findMany({
    where: {
      equipmentId: id,
      status: { in: [...OCCUPIED_TEST_STATUSES] },
    },
    select: { id: true, projectName: true, status: true },
  });

  if (activeTests.length > 0) {
    return NextResponse.json(
      {
        error: "진행 중인 시험 계획이 있어 설비를 삭제할 수 없습니다.",
        activeTests: activeTests.map((t) => ({ id: t.id, projectName: t.projectName, status: t.status })),
      },
      { status: 409 }
    );
  }

  const activeRepairs = await prisma.equipmentRepair.findMany({
    where: { equipmentId: id, status: { in: [...ACTIVE_REPAIR_STATUSES] } },
    select: { id: true, title: true, status: true },
  });

  if (activeRepairs.length > 0) {
    return NextResponse.json(
      {
        error: "처리 중인 수선 이력이 있어 설비를 삭제할 수 없습니다. 수선을 완료 또는 보류 처리 후 삭제하세요.",
        activeRepairs: activeRepairs.map((r) => ({ id: r.id, title: r.title, status: r.status })),
      },
      { status: 409 }
    );
  }

  await prisma.equipment.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
