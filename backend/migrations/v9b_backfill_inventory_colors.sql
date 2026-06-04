-- v9b_backfill_inventory_colors.sql
-- Backfills color_hex and effect_value for all existing inventory rows.
-- Safe to run multiple times — only updates rows where the name matches.
-- Run AFTER v9_inventory_color_effect.sql (columns must already exist).

UPDATE inventory SET color_hex = '#FF00FF', effect_value = 'Deep Focus Mode'   WHERE name = 'Flow State Crystal';
UPDATE inventory SET color_hex = '#FFAE00', effect_value = '+50% XP'           WHERE name = 'Clarity Prism';
UPDATE inventory SET color_hex = '#A335EE', effect_value = 'Refresh Cooldown'  WHERE name = 'Second Wind';
UPDATE inventory SET color_hex = '#0070DD', effect_value = '+10% Energy'        WHERE name = 'Spark Stone';
UPDATE inventory SET color_hex = '#0070DD', effect_value = 'Streak Shield'      WHERE name = 'Streak Guard';
UPDATE inventory SET color_hex = '#0070DD', effect_value = '+10% Focus'         WHERE name = 'Calm Stone';
UPDATE inventory SET color_hex = '#1EFF00', effect_value = 'Show Stats'         WHERE name = 'Progress Lens';
UPDATE inventory SET color_hex = '#FFFFFF', effect_value = '-2m Startup'        WHERE name = 'Quick Start';
UPDATE inventory SET color_hex = '#9D9D9D', effect_value = '+1% XP'            WHERE name = 'Old Habit';
UPDATE inventory SET color_hex = '#9D9D9D', effect_value = 'Recycle Me'         WHERE name = 'Distraction Dust';
UPDATE inventory SET color_hex = '#9D9D9D', effect_value = 'Cosmetic'           WHERE name = 'Mirror Shard';
