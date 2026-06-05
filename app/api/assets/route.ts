import { NextRequest, NextResponse } from "next/server";
import { requireActiveSession } from "@/lib/session-guard";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/permissions";

// GET /api/assets — 설비 목록 (쿼리: siteId, category)
export async function GET(req: NextRequest) {
  const session = await requireActiveSession();
  if (session instanceof NextResponse) return session;

  const { searchParams } = new URL(req.url);
  const siteId   = searchParams.get("siteId")   ?? undefined;
  const category = searchParams.get("category") ?? undefined;

  const equipment = await prisma.equipment.findMany({
    where: {
      ...(siteId   ? { siteId }   : {}),
      ...(category ? { category } : {}),
    },
    include: { testPlans: { orderBy: { plannedStart: "asc" } } },
    orderBy: [{ siteId: "asc" }, { yearIntroduced: "asc" }],
  });

  return NextResponse.json(equipment);
}

// POST /api/assets — 설비 신규 등록 (TEAM_LEAD 이상)
export async function POST(req: NextRequest) {
  const session = await requireActiveSession();
  if (session instanceof NextResponse) return session;

  const role = session.user.role as string;
  if (!canWrite(role, "/facilities")) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const body = await req.json();
  const {
    id, hallId, yardId, siteId, category, name, type,
    spec, maker, makerCountry, yearIntroduced, quantity,
    status, replacedById, replacesId, notes,
  } = body;

  if (!siteId || !name?.trim() || !type?.trim() || !yearIntroduced) {
    return NextResponse.json({ error: "필수 항목을 입력하세요 (사이트·설비명·유형·도입연도)." }, { status: 400 });
  }

  const equipment = await prisma.equipment.create({
    data: {
      id:             id?.trim() || undefined,
      hallId:         hallId     || null,
      yardId:         yardId     || null,
      siteId,
      category:       category   || "시험설비",
      name:           name.trim(),
      type:           type.trim(),
      spec:           spec       || {},
      maker:          maker      || "",
      makerCountry:   makerCountry || null,
      yearIntroduced: Number(yearIntroduced),
      quantity:       Number(quantity)  || 1,
      status:         status     || "normal",
      replacedById:   replacedById || null,
      replacesId:     replacesId   || null,
      notes:          notes        || "",
    },
  });

  return NextResponse.json(equipment, { status: 201 });
}
