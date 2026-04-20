-- ============================================================
-- ZENITH OS — System Resource Schema Extensions
-- Run once against zenith_io_db
-- ============================================================

-- Extend users table with System Resource columns
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS system_version    INT          NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS experience_data   INT          NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS system_credits    INT          NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_bandwidth INT          NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS max_bandwidth     INT          NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS last_reboot       TIMESTAMPTZ  DEFAULT NOW();

-- Extend contracts table with System Contract columns
ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS rarity_tier    INT     NOT NULL DEFAULT 1
      CHECK (rarity_tier BETWEEN 1 AND 4),
  ADD COLUMN IF NOT EXISTS bandwidth_cost INT     NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS credit_reward  INT     NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS xp_reward      INT     NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS is_failed      BOOLEAN NOT NULL DEFAULT false;

-- System modules table
CREATE TABLE IF NOT EXISTS system_modules (
  id           SERIAL        PRIMARY KEY,
  owner_id     INT           NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  module_name  VARCHAR(100)  NOT NULL,
  module_type  VARCHAR(50)   NOT NULL DEFAULT 'UTILITY',
  is_installed BOOLEAN       NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_modules_owner ON system_modules(owner_id);
