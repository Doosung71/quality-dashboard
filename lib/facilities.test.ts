import { describe, it, expect } from "vitest";
import facilitiesRaw from "@/data/facilities.json";
import assetsRaw from "@/data/assets.json";
import type { FacilitiesData } from "@/types/facility";
import type { AssetData } from "@/types/asset";

const facilities = facilitiesRaw as unknown as FacilitiesData;
const assetData  = assetsRaw  as unknown as AssetData;

const allSpaceIds = new Set([
  ...facilities.testHalls.map((h) => h.id),
  ...facilities.testYards.map((y) => y.id),
]);

const allSiteIds = new Set(facilities.sites.map((s) => s.id));

describe("facilities.json", () => {
  it("모든 testHall은 유효한 siteId를 참조한다", () => {
    for (const hall of facilities.testHalls) {
      expect(allSiteIds.has(hall.siteId), `testHall ${hall.id}의 siteId "${hall.siteId}" 가 sites에 없음`).toBe(true);
    }
  });

  it("모든 testYard는 유효한 siteId를 참조한다", () => {
    for (const yard of facilities.testYards) {
      expect(allSiteIds.has(yard.siteId), `testYard ${yard.id}의 siteId "${yard.siteId}" 가 sites에 없음`).toBe(true);
    }
  });
});

describe("assets.json — 무결성 검증", () => {
  it("모든 equipment는 유효한 siteId를 참조한다", () => {
    for (const eq of assetData.equipment) {
      expect(allSiteIds.has(eq.siteId), `equipment ${eq.id}의 siteId "${eq.siteId}" 가 sites에 없음`).toBe(true);
    }
  });

  it("hallId가 있는 equipment는 facilities.json의 testHalls에 실제 존재해야 한다", () => {
    const hallIds = new Set(facilities.testHalls.map((h) => h.id));
    for (const eq of assetData.equipment) {
      if (eq.hallId != null) {
        expect(hallIds.has(eq.hallId), `equipment ${eq.id}의 hallId "${eq.hallId}" 가 testHalls에 없음`).toBe(true);
      }
    }
  });

  it("yardId가 있는 equipment는 facilities.json의 testYards에 실제 존재해야 한다", () => {
    const yardIds = new Set(facilities.testYards.map((y) => y.id));
    for (const eq of assetData.equipment) {
      if (eq.yardId != null) {
        expect(yardIds.has(eq.yardId), `equipment ${eq.id}의 yardId "${eq.yardId}" 가 testYards에 없음`).toBe(true);
      }
    }
  });

  it("각 equipment는 hallId 또는 yardId 중 하나만 가져야 한다", () => {
    for (const eq of assetData.equipment) {
      const hasHall = eq.hallId != null;
      const hasYard = eq.yardId != null;
      expect(hasHall && hasYard, `equipment ${eq.id}는 hallId와 yardId를 동시에 가질 수 없음`).toBe(false);
    }
  });

  it("replacedBy가 있는 equipment는 assets.json 내에 참조 대상이 존재해야 한다", () => {
    const allEqIds = new Set(assetData.equipment.map((e) => e.id));
    for (const eq of assetData.equipment) {
      if (eq.replacedBy != null) {
        expect(allEqIds.has(eq.replacedBy), `equipment ${eq.id}의 replacedBy "${eq.replacedBy}" 가 assets에 없음`).toBe(true);
      }
    }
  });

  it("replaces가 있는 equipment는 assets.json 내에 참조 대상이 존재해야 한다", () => {
    const allEqIds = new Set(assetData.equipment.map((e) => e.id));
    for (const eq of assetData.equipment) {
      if (eq.replaces != null) {
        expect(allEqIds.has(eq.replaces), `equipment ${eq.id}의 replaces "${eq.replaces}" 가 assets에 없음`).toBe(true);
      }
    }
  });

  it("모든 spaceId(hallId/yardId)는 facilities.json에 실제 존재해야 한다 (종합)", () => {
    for (const eq of assetData.equipment) {
      const spaceId = eq.hallId ?? eq.yardId;
      if (spaceId != null) {
        expect(allSpaceIds.has(spaceId), `equipment ${eq.id}의 spaceId "${spaceId}" 가 facilities에 없음`).toBe(true);
      }
    }
  });
});
