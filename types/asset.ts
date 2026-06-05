import type { SiteId } from "./facility";

export type AssetCategory = "시험설비" | "계측설비" | "보조설비";
export type EquipmentStatus = "new" | "normal" | "aging" | "planned";

export interface Equipment {
  id: string;
  hallId?: string;
  yardId?: string;
  siteId: SiteId;
  category: AssetCategory;
  name: string;
  type: string;
  spec: Record<string, string>;
  maker: string;
  makerCountry: string | null;
  yearIntroduced: number;
  quantity: number;
  status: EquipmentStatus;
  replacedBy: string | null;
  replaces: string | null;
  notes: string;
}

export interface AssetData {
  equipment: Equipment[];
}
