-- V4.0 — Add sub_tasks JSONB for ShatterModal Phase 1 deconstruction
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS sub_tasks JSONB;
