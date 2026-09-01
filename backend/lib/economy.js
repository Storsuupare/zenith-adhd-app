// Stake amounts per duration — mirrors client getMissionStakes but is authoritative.
// Red Zone (0–4am server time) halves the stake so the server, not the client, decides.
const STAKE_BY_DURATION      = { 5: 250, 15: 1200, 30: 4000, 60: 10000, 90: 15800, 120: 30000 };
const SESSION_CR_BY_DURATION = { 5:  25, 15:   60, 30:  120, 60:   220, 90: 320, 120:   420 };

function calculateStake(durationMinutes) {
  const base = STAKE_BY_DURATION[durationMinutes] ?? Math.floor(Number(durationMinutes) * 10);
  const hour = new Date().getHours();
  return (hour >= 0 && hour < 5) ? Math.floor(base / 2) : base;
}

// Returns the XP multiplier for the current time window.
// Applied at session COMPLETION to skill XP.
// stakeXp is already REDZONE-adjusted at creation via calculateStake — this covers the skill XP side.
function getNeuralMult() {
  const hour = new Date().getHours();
  if (hour >= 0  && hour < 5)  return 0.5;  // REDZONE — halves skill XP to match halved stake
  if (hour >= 8  && hour < 11) return 1.25; // Peak window
  if (hour >= 22)              return 1.5;  // Hyperfocus window — best XP of the day
  return 1.0;
}

// First Prestige perk: a skill mastered enough to prestige is immune to its
// own REDZONE penalty from then on. PEAK and HYPERFOCUS bonuses still apply in
// full — this only floors the penalty multiplier, it doesn't cap the upside.
function applyPrestigeImmunity(neuralMult, prestigeLevel) {
  if (prestigeLevel > 0 && neuralMult < 1) return 1.0;
  return neuralMult;
}

// A lapsed user is eligible for the once-per-absence re-engagement push once
// they've been away 7+ days. Kept as its own function, separate from the SQL
// query that fetches candidates, so the threshold is unit-testable without a
// database — mirrors how getNeuralMult keeps its own threshold logic isolated.
const REENGAGEMENT_THRESHOLD_DAYS = 7;
function isEligibleForReengagementPush(daysSinceLastSession) {
  return daysSinceLastSession >= REENGAGEMENT_THRESHOLD_DAYS;
}

const TIER_MAX_TASKS = { 0: 5, 1: 15, 2: Infinity };
const LOOT_DROP_CHANCE = 0.25; // Flat 1-in-4 chance for all tiers


// Server-side cosmetic prices for purchase validation.
// null = tier-only (subscription required, not purchaseable with credits).
// All purchasable cosmetics with their credit price.
// Classic is free (not listed — purchase attempt returns COSMETIC_NOT_FOUND).
// PRO/ELITE themes require the matching subscription tier before the credit purchase is allowed.
const COSMETICS_PRICES = {
  cobalt: 4500, amber: 4500, crimson: 6000, violet: 7500, jade: 9000,
  neon: 6000, arctic: 6000, solar: 7500,
  nebula: 9000, obsidian: 9000, ember: 10500,
  rain: 600, library: 600, lofi: 900, cyberpunk: 1200,
  deepspace: null, spacestation: null, deepsea: null,
};


// Consumable prices — deducted on purchase, effect applied immediately.
const CONSUMABLE_PRICES = {
  streak_rescue:   500,
  extra_loot_pull: 250,
};

// Milestone rewards at specific streak counts.
// credits: flat CR award. lootRarity: null means no guaranteed loot.
// shieldUnlock: whether this milestone grants a streak shield.
const STREAK_MILESTONES = {
  7:   { credits: 150,  lootRarity: null,        shieldUnlock: false },
  14:  { credits: 300,  lootRarity: "Rare",       shieldUnlock: false },
  30:  { credits: 500,  lootRarity: "Epic",       shieldUnlock: true  },
  60:  { credits: 1000, lootRarity: "Legendary",  shieldUnlock: false },
  100: { credits: 2500, lootRarity: "Mythic",     shieldUnlock: false },
};

async function calculateNeuralCost(baseLoad, userId, client) {
  const neuralHour = new Date().getHours();

  let timeModifier = 1.0;
  let timeLabel = null;

  if (neuralHour >= 8 && neuralHour < 11) {
    timeModifier = 0.9;
    timeLabel = "Peak Sync";
  } else if (neuralHour >= 14 && neuralHour < 16) {
    timeModifier = 1.3;
    timeLabel = "Drag";
  } else if (neuralHour >= 22 || neuralHour < 2) {
    timeModifier = 0.8;
    timeLabel = "Hyperfocus";
  }

  const fatigueRes = await client.query(
    `SELECT COALESCE(SUM(duration_minutes), 0) AS total_minutes
     FROM tasks
     WHERE user_id::text = $1
       AND status = 'SUCCESS'
       AND completed_at >= NOW() - INTERVAL '4 hours'`,
    [String(userId)],
  );
  const totalMinutes = parseFloat(fatigueRes.rows[0].total_minutes);
  const fatiguePenalty = totalMinutes > 120 ? 1.1 : 1.0;

  const neuralFinalCost = Math.ceil(baseLoad * timeModifier * fatiguePenalty);

  return { finalCost: neuralFinalCost, timeModifier, fatiguePenalty, timeLabel };
}

function getEffectiveAccountTier(accountTier) {
  return accountTier ?? 0;
}

const DAILY_BONUS_CREDITS = { 0: 30, 1: 120, 2: 250 };
const BONUS_WINDOW_MS     = 24 * 60 * 60 * 1000;

// Flat credit reward every 10 skill levels, once per skill per account — not
// reset by Prestige. Reaching 99 already takes real time; re-farming these on
// every prestige cycle would turn a milestone into a grind loop. Kept well
// under the Mythic-based prestige reward so prestige stays the biggest moment.
const SKILL_LEVEL_MILESTONES = {
  10: 50,
  20: 75,
  30: 100,
  40: 150,
  50: 200,
  60: 300,
  70: 400,
  80: 500,
  90: 750,
};

// Returns every milestone threshold strictly between the old and new level —
// a single session can cross more than one (e.g. a big XP gain taking a skill
// from level 8 to level 22 crosses both 10 and 20). Kept separate from the SQL
// insert loop so the crossing logic itself is unit-testable without a database.
function crossedSkillLevelMilestones(oldLevel, newLevel) {
  return Object.keys(SKILL_LEVEL_MILESTONES)
    .map(Number)
    .filter(threshold => threshold > oldLevel && threshold <= newLevel);
}

module.exports = {
  STAKE_BY_DURATION, SESSION_CR_BY_DURATION, calculateStake, getNeuralMult, applyPrestigeImmunity,
  REENGAGEMENT_THRESHOLD_DAYS, isEligibleForReengagementPush,
  TIER_MAX_TASKS, LOOT_DROP_CHANCE, COSMETICS_PRICES, CONSUMABLE_PRICES, STREAK_MILESTONES,
  calculateNeuralCost, getEffectiveAccountTier,
  DAILY_BONUS_CREDITS, BONUS_WINDOW_MS,
  SKILL_LEVEL_MILESTONES, crossedSkillLevelMilestones,
};
