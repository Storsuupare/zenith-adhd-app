-- v13: Shop infrastructure — per-user neural buffer level and daily refill tracking.
-- Safe to re-run (IF NOT EXISTS guards all statements).

ALTER TABLE users ADD COLUMN IF NOT EXISTS bw_capacity_level INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bw_refill_count   INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bw_refill_date    DATE;
