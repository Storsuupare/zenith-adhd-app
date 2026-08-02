// ── Zenith shared types ───────────────────────────────────────────────────────

export type Role = "FREE" | "PRO" | "ELITE";

export type Rarity = "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary";

export type TaskStatus = "ACTIVE" | "SUCCESS" | "FAILED";

// ── Skill mastery entry (one row per skill per user) ─────────────────────────
export type UserSkill = {
  id: number;
  skill_id: number;
  skill_name: string;
  current_xp: number;
  current_level: number;
  next_level_xp: number;
  prestige_level: number;
  prestige_boost_until: string | null;
};

// ── User (full object returned by the API and SSE patch) ─────────────────────
export type User = {
  id: number;
  system_credits: number;
  xp: number;
  level: number;
  total_xp: number;
  streak: number;
  account_tier: number;
  role: Role;
  daily_bonus_claimed_at: string | null;
  daily_challenge_claimed_date: string | null;
  has_seen_onboarding: boolean;
  mastery: UserSkill[];
};

// ── Task (active session contract) ───────────────────────────────────────────
export type Task = {
  id: number;
  taskName: string;
  durationMinutes: number;
  stakeAmount: number;
  userId: number;
  status: TaskStatus;
  skill_id: number | null;
  skill_name: string | null;
  deadline: string;
  deadlinePassed: boolean;
  secondsRemaining: number;
};

// ── Loot drop (returned on session completion) ────────────────────────────────
export type LootDrop = {
  rarity: Rarity;
  credits_earned: number;
};

// ── Session completion response ───────────────────────────────────────────────
export type CompleteTaskResponse = {
  success: boolean;
  reward: number;
  credits_earned: number;
  xp_earned: number;
  skill_name: string | null;
  user: User;
  drop: LootDrop | null;
  leveledUp: boolean;
  newLevel: number;
};
