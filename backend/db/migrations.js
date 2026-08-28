// Bootstraps/updates the schema on startup. Guarded by require.main === module
// at the call site so requiring server.js as a module (tests) never touches
// the live database.
function runMigrations(pool) {
pool.query(`
  ALTER TABLE users
    ADD COLUMN IF NOT EXISTS streak_last_updated TIMESTAMPTZ DEFAULT NOW()
`).catch(() => {});

// Backfill NULLs left by the ADD COLUMN migration — set to yesterday so the
// next task completion counts toward the streak immediately.
pool.query(`
  UPDATE users SET streak_last_updated = NOW() - INTERVAL '1 day'
  WHERE streak_last_updated IS NULL
`).catch(() => {});

// Drop BW columns — bandwidth removed from product
pool.query(`ALTER TABLE users DROP COLUMN IF EXISTS current_bandwidth`).catch(() => {});
pool.query(`ALTER TABLE users DROP COLUMN IF EXISTS max_bandwidth`).catch(() => {});
pool.query(`ALTER TABLE users DROP COLUMN IF EXISTS bw_pulse_date`).catch(() => {});
pool.query(`ALTER TABLE tasks DROP COLUMN IF EXISTS staked_bw`).catch(() => {});
pool.query(`ALTER TABLE tasks DROP COLUMN IF EXISTS cognitive_load`).catch(() => {});
pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS purchased_cosmetics JSONB DEFAULT '[]'`).catch(() => {});

pool.query(`
  ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false
`).catch(() => {});

// Achievement unlocks. Definitions live in achievements.js, not here — only the
// fact that a given user earned one is persisted. The composite primary key is
// what makes the ON CONFLICT in evaluateAchievements() safe against double-paying
// a reward when two session completions land at once.
pool.query(`
  CREATE TABLE IF NOT EXISTS user_achievements (
    user_id         INTEGER     NOT NULL,
    achievement_key TEXT        NOT NULL,
    unlocked_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, achievement_key)
  )
`).catch(() => {});

pool.query(`UPDATE users SET system_credits = 0 WHERE system_credits IS NULL`).catch(() => {});

pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_bonus_claimed_at TIMESTAMPTZ`).catch(() => {});
pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS has_seen_onboarding BOOLEAN DEFAULT false`).catch(() => {});
pool.query(`ALTER TABLE user_skills ADD COLUMN IF NOT EXISTS prestige_boost_until TIMESTAMPTZ`).catch(() => {});
pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS first_task_completed BOOLEAN NOT NULL DEFAULT false`).catch(() => {});
pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS streak_shield BOOLEAN DEFAULT false`).catch(() => {});
pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS streak_in_grace BOOLEAN DEFAULT false`).catch(() => {});
pool.query(`
  CREATE TABLE IF NOT EXISTS streak_milestones (
    user_id   INTEGER NOT NULL,
    milestone INTEGER NOT NULL,
    claimed_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, milestone)
  )
`).catch(() => {});
pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT false`).catch(() => {});
pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_challenge_claimed_date DATE`).catch(() => {});
pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ban_reason TEXT`).catch(() => {});
pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT`).catch(() => {});
pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC'`).catch(() => {});
// Upgrade DATE → TIMESTAMPTZ for existing deployments (no-op if already correct type)
pool.query(`
  DO $$ BEGIN
    IF (SELECT data_type FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'daily_bonus_claimed_at') = 'date' THEN
      ALTER TABLE users ALTER COLUMN daily_bonus_claimed_at TYPE TIMESTAMPTZ
        USING daily_bonus_claimed_at::TIMESTAMPTZ;
    END IF;
  END $$
`).catch(() => {});


pool.query(`UPDATE inventory SET rarity = 'Junk' WHERE name = 'Quick Start' AND rarity = 'Common'`).catch(() => {});

pool.query(`
  CREATE TABLE IF NOT EXISTS push_subscriptions (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER NOT NULL,
    endpoint   TEXT NOT NULL UNIQUE,
    subscription JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )
`).catch(() => {});

pool.query(`
  CREATE TABLE IF NOT EXISTS expo_push_tokens (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token      TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )
`).catch(() => {});

pool.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS halfway_ping_sent BOOLEAN DEFAULT false`).catch(() => {});

pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reengagement_push_sent BOOLEAN DEFAULT false`).catch(() => {});
}

module.exports = { runMigrations };




