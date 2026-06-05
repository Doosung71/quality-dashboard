import { prisma } from "@/lib/prisma";
import { facilitiesData } from "@/data/facilities.data";
import { FacilitiesView } from "@/components/facilities/facilities-view";
import { parseSpec, parseLogs } from "@/lib/facilities-utils";
import type { TestsData } from "@/types/test";
import type { Equipment } from "@/types/asset";

export default async function FacilitiesPage() {
  const [equipmentRaw, testPlansRaw] = await Promise.all([
    prisma.equipment.findMany({ orderBy: [{ siteId: "asc" }, { yearIntroduced: "asc" }] }),
    prisma.testPlan.findMany({ orderBy: { plannedStart: "asc" } }),
  ]);

  const assets: Equipment[] = equipmentRaw.map((eq) => ({
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
  }));

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
      <h1 className="text-lg font-semibold text-slate-800">시험장·시험 관리</h1>
      <p className="text-xs text-slate-400 mb-4">시험장 현황 및 인증·양산 시험 계획 등록·관리</p>
      <FacilitiesView
        data={facilitiesData}
        assets={assets}
        testsData={testsData}
      />
    </div>
  );
}
