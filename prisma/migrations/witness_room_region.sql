-- 입회검사 장소(InspectionRoom) 테이블 + WitnessInspection 권역/장소 컬럼 추가

-- 1. InspectionRoom 테이블 생성
CREATE TABLE IF NOT EXISTS "InspectionRoom" (
  "id"        TEXT        NOT NULL,
  "name"      TEXT        NOT NULL,
  "siteId"    TEXT        NOT NULL DEFAULT 'gumi',
  "type"      TEXT        NOT NULL DEFAULT 'AC',
  "status"    TEXT        NOT NULL DEFAULT '가동중',
  "notes"     TEXT        NOT NULL DEFAULT '',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "InspectionRoom_pkey" PRIMARY KEY ("id")
);

-- 2. facilities.json testHalls + testYards 초기 시딩
INSERT INTO "InspectionRoom" ("id", "name", "siteId", "type", "status") VALUES
  ('gumi-dc1',        '구미 DC 1시험장(옥내)',          'gumi',     'DC',  '가동중'),
  ('gumi-dc2',        '구미 DC 2시험장(옥내)',          'gumi',     '복합', '가동중'),
  ('gumi-ac1',        '구미 AC 1시험장(실드룸)',        'gumi',     'AC',  '가동중'),
  ('gumi-ac2',        '구미 AC 2시험장(실드룸)',        'gumi',     'AC',  '건축중'),
  ('gumi-junggeom',   '구미 중검장',                   'gumi',     'AC',  '가동중'),
  ('gumi-hvlab',      '구미 고전압시험장(옥내/실드룸)', 'gumi',     'AC',  '가동중'),
  ('gumi-outdoor',    '구미 옥외시험장',                'gumi',     'AC',  '가동중'),
  ('donghae-dc1',     '동해 DC 1시험장(옥내)',          'donghae',  '복합', '가동중'),
  ('donghae-dc2',     '동해 DC 2시험장(옥내)',          'donghae',  '복합', '가동중'),
  ('donghae-dc-prod', '동해 DC 양산시험장(옥내)',       'donghae',  'DC',  '가동중'),
  ('donghae-ac-sr1',  '동해 AC 실드룸1',               'donghae',  'AC',  '가동중'),
  ('donghae-ac-sr2',  '동해 AC 실드룸2',               'donghae',  '복합', '가동중'),
  ('donghae-cert',    '동해 AC/DC 통합 인증센터',       'donghae',  '복합', '건축중'),
  ('donghae-xxl',     '동해 AC XXL시험장(옥내)',        'donghae',  'AC',  '가동중'),
  ('donghae-trailer', '동해 AC Trailer시험장(옥외)',    'donghae',  'AC',  '가동중')
ON CONFLICT ("id") DO NOTHING;

-- 3. WitnessInspection에 region, roomId 컬럼 추가
ALTER TABLE "WitnessInspection"
  ADD COLUMN IF NOT EXISTS "region" TEXT,
  ADD COLUMN IF NOT EXISTS "roomId" TEXT;

-- 4. FK 제약 + 인덱스
ALTER TABLE "WitnessInspection"
  DROP CONSTRAINT IF EXISTS "WitnessInspection_roomId_fkey";
ALTER TABLE "WitnessInspection"
  ADD CONSTRAINT "WitnessInspection_roomId_fkey"
  FOREIGN KEY ("roomId") REFERENCES "InspectionRoom"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "InspectionRoom_siteId_idx"    ON "InspectionRoom"("siteId");
CREATE INDEX IF NOT EXISTS "WitnessInspection_roomId_idx" ON "WitnessInspection"("roomId");
CREATE INDEX IF NOT EXISTS "WitnessInspection_region_idx" ON "WitnessInspection"("region");
