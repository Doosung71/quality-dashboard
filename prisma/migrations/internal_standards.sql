CREATE TABLE IF NOT EXISTS "InternalStandard" (
  "id"           TEXT         NOT NULL,
  "title"        TEXT         NOT NULL,
  "code"         TEXT,
  "internalCat"  TEXT         NOT NULL DEFAULT '재료규격',
  "description"  TEXT         NOT NULL DEFAULT '',
  "publisher"    TEXT         NOT NULL DEFAULT '내부',
  "publishYear"  TEXT         NOT NULL DEFAULT '',
  "fileUrl"      TEXT,
  "fileName"     TEXT,
  "fileSize"     INTEGER,
  "keywords"     TEXT[]       NOT NULL DEFAULT '{}',
  "uploadedById" TEXT         NOT NULL,
  "createdAt"    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updatedAt"    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT "InternalStandard_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InternalStandard_uploadedById_fkey"
    FOREIGN KEY ("uploadedById") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);
