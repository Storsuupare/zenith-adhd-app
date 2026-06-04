-- v12: Clean-slate perks reset. Wipes all perk rows and re-seeds the 7 canonical items.
-- Run after v11. Safe to re-run (TRUNCATE is idempotent on an empty table).

TRUNCATE TABLE perks RESTART IDENTITY CASCADE;

INSERT INTO perks (name, rarity, drop_chance, category, description, effect_value, color_hex) VALUES
  (
    'Flow State Crystal',
    'Mythic',
    0.0050,
    'Perk',
    'Incredibly rare. Every second in this state counts double.',
    '+100% XP',
    '#FF00FF'
  ),
  (
    'Clarity Prism',
    'Legendary',
    0.0200,
    'Perk',
    'Everything sharpens. All XP you earn is amplified by 50%.',
    '+50% XP',
    '#FFAE00'
  ),
  (
    'Second Wind',
    'Epic',
    0.0800,
    'Perk',
    'Push harder for less cost. Every task start consumes half the Bandwidth.',
    '-50% BW Cost',
    '#A335EE'
  ),
  (
    'Spark Stone',
    'Rare',
    0.1200,
    'Perk',
    'Quietly multiplies your credit haul on every completed session.',
    '+25% Credits',
    '#0070DD'
  ),
  (
    'Streak Guard',
    'Rare',
    0.1200,
    'Perk',
    'One miss won''t break you. Keeps your streak alive — then self-destructs.',
    'Streak Shield',
    '#00C2FF'
  ),
  (
    'Calm Stone',
    'Uncommon',
    0.2500,
    'Perk',
    'Reduces Bandwidth drain by 20%. Keeps you in the game longer on tough days.',
    '-20% BW Cost',
    '#1EFF00'
  ),
  (
    'Quick Start',
    'Common',
    0.4000,
    'Perk',
    'A small but real edge. Every completed session earns 10% more XP.',
    '+10% XP',
    '#FFFFFF'
  );
