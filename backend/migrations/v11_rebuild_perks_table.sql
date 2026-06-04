-- v11_rebuild_perks_table.sql
-- Drops the old 22-item perks catalog and rebuilds it with the new 7-perk system.
-- The perks table is reference data — the live loot logic reads from LootData.js.
-- Run this once against your DB.

DROP TABLE IF EXISTS perks CASCADE;

CREATE TABLE perks (
  id          SERIAL        PRIMARY KEY,
  name        VARCHAR(100)  NOT NULL UNIQUE,
  rarity      VARCHAR(20)   NOT NULL,
  drop_chance NUMERIC(6,4)  NOT NULL,
  category    VARCHAR(50)   NOT NULL DEFAULT 'Perk',
  description TEXT,
  effect_value VARCHAR(100),
  color_hex   VARCHAR(10),
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

INSERT INTO perks (name, rarity, drop_chance, category, description, effect_value, color_hex) VALUES
  (
    'Flow State Crystal',
    'Mythic',
    0.0050,
    'Perk',
    'Incredibly rare. You''re locked in — every second in this state counts double. Equip it and feel the difference.',
    '+100% XP',
    '#FF00FF'
  ),
  (
    'Clarity Prism',
    'Legendary',
    0.0200,
    'Perk',
    'Everything sharpens. All XP you earn is amplified by 50% for as long as this stays equipped.',
    '+50% XP',
    '#FFAE00'
  ),
  (
    'Second Wind',
    'Epic',
    0.0800,
    'Perk',
    'Push harder for less cost. Every task you start consumes half the Bandwidth it normally would.',
    '-50% BW Cost',
    '#A335EE'
  ),
  (
    'Spark Stone',
    'Rare',
    0.1200,
    'Perk',
    'Quietly multiplies your credit haul on every completed session. Small advantage, consistent return.',
    '+25% Credits',
    '#0070DD'
  ),
  (
    'Streak Guard',
    'Rare',
    0.1200,
    'Perk',
    'One miss won''t break you. Keeps your streak alive through your next missed day, then self-destructs.',
    'Streak Shield',
    '#00C2FF'
  ),
  (
    'Calm Stone',
    'Uncommon',
    0.2500,
    'Perk',
    'Reduces Bandwidth drain on every task start by 20%. Keeps you in the game longer on tough days.',
    '-20% BW Cost',
    '#1EFF00'
  ),
  (
    'Quick Start',
    'Common',
    0.4000,
    'Perk',
    'A small but real edge. Every completed session earns 10% more XP than it would bare-handed.',
    '+10% XP',
    '#FFFFFF'
  );
