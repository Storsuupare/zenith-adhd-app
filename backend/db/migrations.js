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

// credited_minutes: how many of a completed task's minutes actually earned
// reward, after deduplicating overlap with the user's other completed tasks'
// windows (see computeCreditableMinutes in lib/economy.js). Backfilling
// existing history as fully creditable — there's no way to retroactively
// determine real overlap for old data, and clawing back XP/credits/
// achievements people already legitimately have would be unfair. Only
// completions from here forward get the real deduplicated computation.
pool.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS credited_minutes INTEGER`).catch(() => {});
pool.query(`UPDATE tasks SET credited_minutes = duration_minutes WHERE status = 'SUCCESS' AND credited_minutes IS NULL`).catch(() => {});

pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reengagement_push_sent BOOLEAN DEFAULT false`).catch(() => {});

// users.username already existed (Clerk-derived fallback: username, then
// full name, then email prefix, then raw Clerk ID — set at account creation,
// see routes/webhooks.js), but was never user-editable, never shown to other
// users, and had no uniqueness constraint. has_set_username is an explicit
// flag rather than inferring "did they choose this" from the value's shape,
// since an auto-derived name and a real chosen handle aren't reliably
// distinguishable after the fact. The unique index is best-effort like every
// other migration here — if legacy auto-derived rows already collide it
// simply won't apply, which is fine: the leaderboard only ever surfaces
// users who've gone through the explicit-set flow, and that endpoint
// enforces uniqueness itself as the real guarantee, not this index.
pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS has_set_username BOOLEAN DEFAULT false`).catch(() => {});
pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_unique ON users (LOWER(username))`).catch(() => {});

// Friend requests for the weekly leaderboard — PENDING until the addressee
// accepts, so search-adding someone never exposes your stats to them without
// consent.
pool.query(`
  CREATE TABLE IF NOT EXISTS friendships (
    id SERIAL PRIMARY KEY,
    requester_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    addressee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (requester_id, addressee_id)
  )
`).catch(() => {});

pool.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ`).catch(() => {});
pool.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS pause_seconds_used INTEGER DEFAULT 0`).catch(() => {});

// Tracks which per-skill level milestones (10/20/.../90) a user has already
// claimed. Once per skill per account, not reset by Prestige — see the note
// on SKILL_LEVEL_MILESTONES in lib/economy.js.
pool.query(`
  CREATE TABLE IF NOT EXISTS skill_level_milestones (
    user_id  INTEGER NOT NULL,
    skill_id INTEGER NOT NULL,
    level    INTEGER NOT NULL,
    claimed_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, skill_id, level)
  )
`).catch(() => {});

// Saved task presets (PRO+ feature) — lets a user re-use a task name/skill/
// duration combo instead of retyping it each session. Count-per-user is
// enforced in the route, not here; this table just stores them.
pool.query(`
  CREATE TABLE IF NOT EXISTS task_templates (
    id               SERIAL PRIMARY KEY,
    user_id          INTEGER NOT NULL,
    task_name        TEXT NOT NULL,
    skill_id         INTEGER,
    duration_minutes INTEGER NOT NULL,
    created_at       TIMESTAMPTZ DEFAULT NOW()
  )
`).catch(() => {});
}

module.exports = { runMigrations };




