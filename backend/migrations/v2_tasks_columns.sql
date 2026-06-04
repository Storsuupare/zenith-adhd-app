-- V2.0 — Add columns missing from the Prisma-created tasks table
-- Run once against your database before starting the V2 server.

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deadline       TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS "skillId"      INTEGER;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS "cognitiveLoad" INTEGER NOT NULL DEFAULT 0;
