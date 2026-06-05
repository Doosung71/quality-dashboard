# DB 반영 Runbook — 시험장·자산관리 마이그레이션

**작성일**: 2026-06-05  
**작성자**: Claude Code (클로이)  
**환경**: Neon PostgreSQL (ep-shy-brook-ap3nla48-pooler) — 로컬·프로덕션 동일 인스턴스

---

## 개요

`prisma db push`가 `knowledge_chunks` 테이블(PKM, 19,520행) 드롭을 시도하여, 3개의 SQL 파일을 직접 실행하는 방식으로 마이그레이션을 적용했다.

---

## 적용된 마이그레이션 (순서)

### 1. `manual_001_facilities.sql`
**적용 일시**: 2026-06-05  
**내용**: Equipment, TestPlan 테이블 신규 생성

```sql
CREATE TABLE "Equipment" (id TEXT PRIMARY KEY, hallId TEXT, yardId TEXT, ...);
CREATE TABLE "TestPlan" (id TEXT PRIMARY KEY, equipmentId TEXT REFERENCES "Equipment"(id) ON DELETE CASCADE, ...);
CREATE INDEX "Equipment_siteId_idx" ON "Equipment"("siteId");
CREATE INDEX "TestPlan_equipmentId_idx" ON "TestPlan"("equipmentId");
```

**적용 명령**:
```bash
npx prisma db execute --file prisma/migrations/manual_001_facilities.sql
# 결과: Script executed successfully.
```

### 2. `manual_002_equipment_owner.sql`
**적용 일시**: 2026-06-05  
**내용**: Equipment에 managingTeam·ownerId·ownerName 컬럼 추가, EquipmentOwnerHistory 테이블 생성

```sql
ALTER TABLE "Equipment" ADD COLUMN IF NOT EXISTS "managingTeam" TEXT, ...;
CREATE TABLE "EquipmentOwnerHistory" (..., CONSTRAINT fk_equipment FOREIGN KEY("equipmentId") REFERENCES "Equipment"("id") ON DELETE CASCADE);
```

**적용 명령**:
```bash
npx prisma db execute --file prisma/migrations/manual_002_equipment_owner.sql
# 결과: Script executed successfully.
```

### 3. `manual_003_testplan_owner.sql`
**적용 일시**: 2026-06-05  
**내용**: TestPlan에 managingTeam·ownerId·ownerName 추가, TestPlanOwnerHistory 테이블 생성

```sql
ALTER TABLE "TestPlan" ADD COLUMN IF NOT EXISTS "managingTeam" TEXT, ...;
CREATE TABLE "TestPlanOwnerHistory" (...);
```

**적용 명령**:
```bash
npx prisma db execute --file prisma/migrations/manual_003_testplan_owner.sql
# 결과: Script executed successfully.
```

---

## 초기 데이터 시딩

**스크립트**: `scripts/seed-facilities.ts`  
**소스**: `data/assets.json` (30개) + `data/tests.json` (12개)  
**적용 방식**: `upsert` (중복 실행 안전)

```bash
npx tsx scripts/seed-facilities.ts
# 결과:
# 🌱 시설 데이터 시딩 시작...
#   Equipment 30개 처리 중...
#   ✅ Equipment 30개 완료
#   TestPlan 12개 처리 중...
#   ✅ TestPlan 12개 완료
# 🌱 시딩 완료!
```

---

## 운영 DB 검증

### 테이블 존재 확인
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('Equipment','TestPlan','EquipmentOwnerHistory','TestPlanOwnerHistory');
-- 결과: 4개 행 반환 확인
```

### 데이터 건수 확인
```sql
SELECT
  (SELECT COUNT(*) FROM "Equipment")             AS equipment_count,
  (SELECT COUNT(*) FROM "TestPlan")               AS testplan_count,
  (SELECT COUNT(*) FROM "EquipmentOwnerHistory")  AS eq_owner_hist_count,
  (SELECT COUNT(*) FROM "TestPlanOwnerHistory")   AS tp_owner_hist_count;
-- 기대값: equipment=30, testplan=12, 이력 테이블=0 (초기)
```

### knowledge_chunks 보호 확인
```sql
SELECT COUNT(*) FROM knowledge_chunks;
-- 결과: 19,520행 유지 (마이그레이션 전후 동일)
```

---

## 롤백 절차 (필요 시)

```sql
-- 신규 테이블 삭제 (역순)
DROP TABLE IF EXISTS "TestPlanOwnerHistory";
DROP TABLE IF EXISTS "EquipmentOwnerHistory";
DROP TABLE IF EXISTS "TestPlan";
DROP TABLE IF EXISTS "Equipment";

-- Equipment 추가 컬럼 롤백 (필요 시)
ALTER TABLE "Equipment"
  DROP COLUMN IF EXISTS "managingTeam",
  DROP COLUMN IF EXISTS "ownerId",
  DROP COLUMN IF EXISTS "ownerName";
```

**주의**: Equipment/TestPlan 테이블 삭제 전 운영 데이터 백업 필수.

---

## 향후 마이그레이션 정책

`prisma db push`는 `knowledge_chunks` 드롭 위험으로 사용 불가.  
스키마 변경 시 **항상 `prisma/migrations/manual_NNN_*.sql`** 파일로 직접 적용.  
적용 후 이 runbook에 이력 추가.
