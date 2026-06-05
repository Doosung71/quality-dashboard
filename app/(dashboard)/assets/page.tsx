import { prisma } from "@/lib/prisma";
import { facilitiesData } from "@/data/facilities.data";
import { AssetsView } from "@/components/assets/assets-view";
import { parseSpec, parseLogs } from "@/lib/facilities-utils";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { AssetData } from "@/types/asset";
import type { TestsData } from "@/types/test";

export default async function AssetsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const userRole = session.user.role ?? "PRACTITIONER";

  const [equipmentRaw, testPlansRaw] = await Promise.all([
    prisma.equipment.findMany({ orderBy: [{ siteId: "asc" }, { yearIntroduced: "asc" }] }),
    prisma.testPlan.findMany({ orderBy: { plannedStart: "asc" } }),
  ]);

  const assetData: AssetData = {
    equipment: equipmentRaw.map((eq) => ({
      id:             eq.id,
      hallId:         eq.hallId  ?? undefined,
      yardId:         eq.yardId  ?? undefined,
      siteId:         eq.siteId  as "gumi" | "donghae",
      category:       eq.category as "시험설비" | "계측설비" | "보조설비",
      name:           eq.name,
      type:           eq.type,
      spec:           parseSpec(eq.spec),
      maker:          eq.maker,
      makerCountry:   eq.makerCountry ?? null,
      yearIntroduced: eq.yearIntroduced,
      quantity:       eq.quantity,
      status:         eq.status as "new" | "normal" | "aging" | "planned",
      replacedBy:     eq.replacedById ?? null,
      replaces:       eq.replacesId   ?? null,
      notes:          eq.notes,
      managingTeam:   eq.managingTeam ?? null,
      ownerId:        eq.ownerId      ?? null,
      ownerName:      eq.ownerName    ?? null,
    })),
  };

  const testsData: TestsData = {
    _meta: { version: "db", lastUpdated: new Date().toISOString().slice(0, 10), note: "DB 직접 조회" },
    tests: testPlansRaw.map((t) => ({
      id:               t.id,
      equipmentId:      t.equipmentId,
      testCategory:     t.testCategory as "Type" | "EQ" | "PQ" | "양산" | "개발",
      projectName:      t.projectName,
      sampleType:       t.sampleType as "cable" | "accessory",
      sampleDescription: t.sampleDescription,
      plannedStart:     t.plannedStart,
      plannedEnd:       t.plannedEnd,
      actualStart:      t.actualStart  ?? null,
      actualEnd:        t.actualEnd    ?? null,
      status:           t.status as "준비중" | "시험중" | "완료" | "지연",
      progress:         t.progress,
      logs:             parseLogs(t.logs),
      managingTeam:     t.managingTeam  ?? null,
      ownerId:          t.ownerId       ?? null,
      ownerName:        t.ownerName     ?? null,
    })),
  };

  return (
    <div className="space-y-1">
      <h1 className="text-lg font-semibold text-slate-800">자산관리</h1>
      <p className="text-xs text-slate-400 mb-4">시험설비·계측설비 자산 현황 및 노후도 관리</p>
      <AssetsView
        assetData={assetData}
        testsData={testsData}
        facilitiesData={facilitiesData}
        userRole={userRole}
      />
    </div>
  );
}
