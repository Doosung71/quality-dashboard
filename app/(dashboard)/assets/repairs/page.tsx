import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { parseSpec } from "@/lib/facilities-utils";
import type { AssetData } from "@/types/asset";
import type { SiteId } from "@/types/facility";
import { RepairRegisterPage } from "@/components/assets/repair-register-page";

export default async function AssetsRepairsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const role = session.user.role ?? "PRACTITIONER";
  if (!["DIRECTOR", "ADMIN", "TEAM_LEAD"].includes(role)) redirect("/assets");

  const equipmentRaw = await prisma.equipment.findMany({
    orderBy: [{ siteId: "asc" }, { name: "asc" }],
  });

  const equipment: AssetData["equipment"] = equipmentRaw.map((eq) => ({
    id:             eq.id,
    hallId:         eq.hallId  ?? undefined,
    yardId:         eq.yardId  ?? undefined,
    siteId:         eq.siteId  as SiteId,
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
    attachments:    (eq.attachments as { url: string; name: string; size: number; contentType: string }[]) ?? [],
  }));

  return (
    <div className="space-y-1">
      <h1 className="text-lg font-semibold text-slate-800">설비 수선 등록</h1>
      <p className="text-xs text-slate-400 mb-4">수선·고장·교정 이력을 등록합니다</p>
      <RepairRegisterPage equipment={equipment} />
    </div>
  );
}
