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
  managingTeam: string | null;
  ownerId: string | null;
  ownerName: string | null;
  attachments: { url: string; name: string; size: number; contentType: string }[];
}

export interface EquipmentOwnerHistory {
  id: string;
  equipmentId: string;
  managingTeam: string | null;
  ownerId: string | null;
  ownerName: string | null;
  changedById: string;
  changedByName: string;
  note: string | null;
  changedAt: string; // ISO string
}

export type RepairType   = "고장" | "예방점검" | "수선" | "교정";
export type RepairStatus = "접수" | "진행중" | "완료" | "보류";

export interface EquipmentRepair {
  id: string;
  equipmentId: string;
  type: RepairType;
  title: string;
  description: string;
  status: RepairStatus;
  reportedAt: string;
  completedAt: string | null;
  cost: number | null;
  vendor: string | null;
  result: string;
  reportedById: string;
  reportedByName: string;
  attachments: { url: string; name: string; size: number; contentType: string }[];
  createdAt: string;
}

export interface AssetData {
  equipment: Equipment[];
}
