/**
 * seed-loop4-demo.ts
 * 고리④ surface 브라우저 테스트용 데모 데이터.
 * 같은 project_key(qat-demo-3003)를 가진 종결 NCR·클레임 + 입찰 1건을 생성한다.
 * 실고객명·민감정보 없음(가짜 키·제목만). 고정 id로 멱등(재실행 안전).
 * 실행:  npx tsx scripts/seed-loop4-demo.ts
 * 정리:  npx tsx scripts/seed-loop4-demo.ts --clean
 */
import { PrismaClient } from "../lib/generated/prisma/client";
import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import * as dotenv from "dotenv";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

neonConfig.webSocketConstructor = globalThis.WebSocket;
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as never);

const KEY = "qat-demo-3003";
const NCR_ID = "demo-loop4-ncr";
const CLAIM_ID = "demo-loop4-claim";
const TENDER_ID = "demo-loop4-tender";

async function main() {
  const clean = process.argv.includes("--clean");

  if (clean) {
    await prisma.ncr.deleteMany({ where: { id: NCR_ID } });
    await prisma.claim.deleteMany({ where: { id: CLAIM_ID } });
    await prisma.tender.deleteMany({ where: { id: TENDER_ID } });
    console.log("🧹 데모 데이터 삭제 완료 (NCR·Claim·Tender)");
    return;
  }

  const user = await prisma.user.findFirst({ select: { id: true, name: true } });
  if (!user) throw new Error("User가 없습니다 — 최소 1명 필요");
  console.log(`👤 createdBy = ${user.name} (${user.id})`);

  const now = new Date();

  // 종결 NCR (past history)
  await prisma.ncr.upsert({
    where: { id: NCR_ID },
    update: { projectKey: KEY, status: "Closed" },
    create: {
      id: NCR_ID,
      ncrNo: "NCR-DEMO-3003",
      title: "[데모] 케이블 단말 접속부 부분방전 초과",
      source: "출하검사",
      projectKey: KEY,
      severity: "Major",
      status: "Closed",
      disposition: "Rework",
      issuedDate: now,
      targetDate: now,
      closedDate: now,
      assignee: "데모담당",
      description: "[데모 데이터] 230kV 케이블 단말 PD 측정값이 기준 초과. 재작업 후 종결.",
      createdById: user.id,
    },
  });
  console.log("✅ 종결 NCR: NCR-DEMO-3003");

  // 종결 Claim (past history)
  await prisma.claim.upsert({
    where: { id: CLAIM_ID },
    update: { projectKey: KEY, status: "Closed" },
    create: {
      id: CLAIM_ID,
      claimNo: "CLM-DEMO-3003",
      title: "[데모] 시운전 중 외피 손상 클레임",
      customer: "데모고객",
      projectKey: KEY,
      priority: "High",
      status: "Closed",
      receivedAt: now,
      closedAt: now,
      assignee: "데모담당",
      description: "[데모 데이터] 포설 중 외피 손상 발견. 보수 후 합의 종결.",
      createdById: user.id,
    },
  });
  console.log("✅ 종결 Claim: CLM-DEMO-3003");

  // 입찰 (같은 키) — 이 페이지에서 위 이력이 surface돼야 함
  await prisma.tender.upsert({
    where: { id: TENDER_ID },
    update: { projectKey: KEY },
    create: {
      id: TENDER_ID,
      title: "[데모] 카타르 GTC 3003 230kV 입찰 (고리④ 테스트)",
      projectKey: KEY,
      createdById: user.id,
    },
  });
  console.log("✅ 입찰: demo-loop4-tender");

  console.log(`\n🔗 브라우저에서 열기: http://localhost:3000/tender/${TENDER_ID}`);
  console.log(`   → project_key '${KEY}' 의 종결 NCR 1건 + 클레임 1건이 "이 프로젝트의 과거 이력" 패널에 표시돼야 합니다.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
