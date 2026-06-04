-- V6 — Warden Module: strike tracking, penalty lockout, BW regen timestamp
ALTER TABLE users ADD COLUMN IF NOT EXISTS strikes       INTEGER     NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS penalty_until TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_reboot   TIMESTAMPTZ NOT NULL DEFAULT NOW();
