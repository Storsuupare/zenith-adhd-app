-- v7_daily_stats.sql
-- Stores aggregated daily focus minutes per user.
-- The /api/stats/elevation endpoint queries this alongside generate_series
-- to guarantee 7 days are always returned (0 for empty days).
-- Future: UPSERT here on task completion to keep stats live.

CREATE TABLE IF NOT EXISTS daily_stats (
    id            SERIAL PRIMARY KEY,
    user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date          DATE    NOT NULL,
    focus_minutes INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT daily_stats_user_date_unique UNIQUE (user_id, date)
);

CREATE INDEX IF NOT EXISTS daily_stats_user_date_idx
    ON daily_stats(user_id, date DESC);
