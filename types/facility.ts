export type SiteId = "gumi" | "indon" | "donghae" | "external";
export type HallStatus = "가동중" | "건축중";

export interface Site {
  id: SiteId;
  name: string;
  fullName: string;
  country: string;
}

export interface TestHall {
  id: string;
  siteId: SiteId;
  name: string;
  type: string;
  purpose: string;
  status: HallStatus;
  dimensions: { length: number | null; width: number | null; height: number | null; area: number | null };
}

export interface TestYard {
  id: string;
  siteId: SiteId;
  name: string;
  type: string;
  purpose: string;
  status: HallStatus;
  dimensions: { length: number | null; width: number | null; area: number | null };
}

export interface FacilitiesData {
  sites: Site[];
  testHalls: TestHall[];
  testYards: TestYard[];
}
