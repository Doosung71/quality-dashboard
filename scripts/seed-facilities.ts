/**
 * seed-facilities.ts
 * assets.json + tests.json → Neon DB (Equipment + TestPlan) 초기 시딩
 * 실행: npx tsx scripts/seed-facilities.ts
 */
import { PrismaClient } from "../lib/generated/prisma/client";
import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import assetsRaw from "../data/assets.json";
import testsRaw  from "../data/tests.json";
import * as dotenv from "dotenv";
import * as path from "path";
import { fileURLToPath } from "url";

// .env.local 로드
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

neonConfig.webSocketConstructor = globalThis.WebSocket;
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as never);

async function main() {
  console.log("🌱 시설 데이터 시딩 시작...");

  // ── Equipment ──────────────────────────────────────────────────
  console.log(`  Equipment ${assetsRaw.equipment.length}개 처리 중...`);

  for (const eq of assetsRaw.equipment) {
    await prisma.equipment.upsert({
      where:  { id: eq.id },
      update: {
        hallId:         eq.hallId  ?? null,
        yardId:         eq.yardId  ?? null,
        siteId:         eq.siteId,
        category:       eq.category,
        name:           eq.name,
        type:           eq.type,
        spec:           eq.spec,
        maker:          eq.maker,
        makerCountry:   eq.makerCountry ?? null,
        yearIntroduced: eq.yearIntroduced,
        quantity:       eq.quantity,
        status:         eq.status,
        replacedById:   eq.replacedBy ?? null,
        replacesId:     eq.replaces   ?? null,
        notes:          eq.notes,
      },
      create: {
        id:             eq.id,
        hallId:         eq.hallId  ?? null,
        yardId:         eq.yardId  ?? null,
        siteId:         eq.siteId,
        category:       eq.category,
        name:           eq.name,
        type:           eq.type,
        spec:           eq.spec,
        maker:          eq.maker,
        makerCountry:   eq.makerCountry ?? null,
        yearIntroduced: eq.yearIntroduced,
        quantity:       eq.quantity,
        status:         eq.status,
        replacedById:   eq.replacedBy ?? null,
        replacesId:     eq.replaces   ?? null,
        notes:          eq.notes,
      },
    });
  }
  console.log(`  ✅ Equipment ${assetsRaw.equipment.length}개 완료`);

  // ── TestPlan ────────────────────────────────────────────────────
  console.log(`  TestPlan ${testsRaw.tests.length}개 처리 중...`);

  for (const t of testsRaw.tests) {
    await prisma.testPlan.upsert({
      where:  { id: t.id },
      update: {
        equipmentId:      t.equipmentId,
        testCategory:     t.testCategory,
        projectName:      t.projectName,
        sampleType:       t.sampleType,
        sampleDescription: t.sampleDescription,
        plannedStart:     t.plannedStart,
        plannedEnd:       t.plannedEnd,
        actualStart:      t.actualStart ?? null,
        actualEnd:        t.actualEnd   ?? null,
        status:           t.status,
        progress:         t.progress,
        logs:             t.logs,
      },
      create: {
        id:               t.id,
        equipmentId:      t.equipmentId,
        testCategory:     t.testCategory,
        projectName:      t.projectName,
        sampleType:       t.sampleType,
        sampleDescription: t.sampleDescription,
        plannedStart:     t.plannedStart,
        plannedEnd:       t.plannedEnd,
        actualStart:      t.actualStart ?? null,
        actualEnd:        t.actualEnd   ?? null,
        status:           t.status,
        progress:         t.progress,
        logs:             t.logs,
      },
    });
  }
  console.log(`  ✅ TestPlan ${testsRaw.tests.length}개 완료`);

  console.log("🌱 시딩 완료!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
