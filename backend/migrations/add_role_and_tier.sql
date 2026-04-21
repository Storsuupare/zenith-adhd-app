-- ============================================================
-- Migration: Add role and account_tier to users table
-- ============================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role         TEXT    NOT NULL DEFAULT 'FREE',
  ADD COLUMN IF NOT EXISTS account_tier INTEGER NOT NULL DEFAULT 0;

-- Backfill any existing rows that pre-date the column addition
UPDATE users SET role         = 'FREE' WHERE role IS NULL;
UPDATE users SET account_tier = 0      WHERE account_tier IS NULL;
