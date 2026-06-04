-- v8: Seed all skill definitions and backfill any missing user_skills rows.
-- Safe to run repeatedly — ON CONFLICT clauses are no-ops if rows already exist.

INSERT INTO skills (name)
VALUES
  ('Logic Flow'),
  ('Vitality'),
  ('Nutrition'),
  ('Environment'),
  ('Deep Focus'),
  ('Synthesis'),
  ('Logistics'),
  ('Creative'),
  ('Wealth'),
  ('Presence'),
  ('Restoration'),
  ('Resolve')
ON CONFLICT (name) DO NOTHING;

-- Give every existing user a user_skills row for each skill they are missing.
INSERT INTO user_skills (user_id, skill_id, xp, level, next_level_xp, prestige_level)
SELECT u.id, s.id, 0, 1, 500, 0
FROM users u
CROSS JOIN skills s
WHERE NOT EXISTS (
  SELECT 1
  FROM user_skills us
  WHERE us.user_id = u.id
    AND us.skill_id = s.id
);
