require("dotenv").config();

// ── Startup env validation ────────────────────────────────────────────────────
// Catch missing required variables before any request is served.
// In production this exits the process immediately with a clear error.
const REQUIRED_ENV = [
  "DATABASE_URL",
  "CLERK_SECRET_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "FRONTEND_URL",
  "ALLOWED_ORIGINS",
  "VAPID_EMAIL",
  "VAPID_PUBLIC_KEY",
  "VAPID_PRIVATE_KEY",
  "ADMIN_SECRET",
  "RESEND_API_KEY",
];
const missing = REQUIRED_ENV.filter((envKey) => !process.env[envKey]);
if (missing.length > 0) {
  if (process.env.NODE_ENV === "production") {
    console.error("[STARTUP] Missing required env vars:", missing.join(", "));
    process.exit(1);
  } else {
    console.warn("[STARTUP] Missing env vars (non-fatal in dev):", missing.join(", "));
  }
}

const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const webpush = require("web-push");
const cron = require("node-cron");
const { verifyToken, createClerkClient } = require("@clerk/backend");
const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

webpush.setVapidDetails(
  process.env.VAPID_EMAIL,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY,
);
const { Resend } = require("resend");
const helmet = require("helmet");

const resend = new Resend(process.env.RESEND_API_KEY);

// ── Auth middleware ───────────────────────────────────────────────────────────
// Verifies the Clerk JWT from the Authorization header and attaches the
// authenticated user's Clerk ID to req.auth.userId.
// Every protected route uses req.auth.userId instead of trusting the client.
const requireAuth = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "UNAUTHORIZED" });
  }
  try {
    const payload = await verifyToken(header.slice(7), {
      secretKey: process.env.CLERK_SECRET_KEY,
    });
    req.auth = { userId: payload.sub };
    next();
  } catch {
    return res.status(401).json({ error: "INVALID_TOKEN" });
  }
};

// Checks for the X-Admin-Token header — must match ADMIN_SECRET in .env.
// Runs before the DB check so bad actors are rejected without a DB hit.
const requireAdminToken = (req, res, next) => {
  const token = req.headers['x-admin-token']
  if (!token || token !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ error: 'FORBIDDEN' })
  }
  next()
}

// Checks that the authenticated caller has is_admin = true in the DB.
// is_admin is a separate boolean — it does not affect the role/tier fields.
const requireAdmin = async (req, res, next) => {
  try {
    const adminCheckResult = await pool.query(
      "SELECT is_admin FROM users WHERE external_id = $1",
      [req.auth.userId],
    );
    if (!adminCheckResult.rows[0]?.is_admin)
      return res.status(403).json({ error: "FORBIDDEN" });
    next();
  } catch {
    return res.status(500).json({ error: "DATABASE_ERROR" });
  }
};

// ── Rate limiters ─────────────────────────────────────────────────────────────
const createRateLimiter = (windowMin, max) => rateLimit({
  windowMs: windowMin * 60 * 1000,
  max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "TOO_MANY_REQUESTS" },
});
const globalLimiter   = createRateLimiter(15, 300);  // 300 req per 15 min — general abuse guard
const mutationLimiter = createRateLimiter(60, 60);   // 60 mutations per hour — task/loot/prestige/inventory
const shopLimiter     = createRateLimiter(15, 10);   // 10 purchases per 15 min — shop anti-spam
const bonusLimiter    = createRateLimiter(60, 5);    // 5 attempts per hour — daily bonus anti-spam
const adminLimiter    = createRateLimiter(15, 20);   // 20 req per 15 min — admin panel
const paymentLimiter  = createRateLimiter(60, 5);    // 5 Stripe session creations per hour — prevents API abuse

const app = express();

// Tell Express to trust the X-Forwarded-For header from the first proxy hop.
// Without this, rate limiting keys off the proxy IP (127.0.0.1) and treats
// the entire internet as a single client — making rate limits useless.
app.set("trust proxy", 1);

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "")
  .split(",").map(rawOrigin => rawOrigin.trim()).filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error(`CORS blocked: ${origin}`));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Admin-Token"],
  credentials: true,
}));

// Security headers — HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, etc.
// CSP disabled here; configure separately once all asset origins are locked down.
app.use(helmet({ contentSecurityPolicy: false }));

app.use(globalLimiter);

app.post(
  "/payments/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET,
      );
    } catch (err) {
      console.error("[WEBHOOK] Signature verification failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    const applyTierUpgrade = async (userId, targetTier) => {
      if (!userId || !targetTier) return;
      const upgradeTier = Number(targetTier);
      const role = upgradeTier >= 2 ? "ELITE" : "PRO";
      const upgradeResult = await pool.query(
        "UPDATE users SET account_tier = $1, role = $2 WHERE external_id = $3 RETURNING id, username",
        [upgradeTier, role, userId],
      );
      if (upgradeResult.rowCount === 0)
        console.warn("[WEBHOOK] No user matched external_id:", userId);
      else {
        console.log(`[STRIPE] Upgraded ${upgradeResult.rows[0].username} → Tier ${upgradeTier} (${role})`);
        // Push tier change instantly to the connected client — no polling delay
        pushUserPatch(userId).catch(() => {});
      }
    };

    try {
      if (event.type === "checkout.session.completed") {
        const checkoutSession = event.data.object;
        const { userId, targetTier } = checkoutSession.metadata ?? {};
        console.log(
          "[WEBHOOK] checkout.session.completed — userId:",
          userId,
          "tier:",
          targetTier,
        );
        // Save Stripe customer ID so the billing portal can look it up later
        if (checkoutSession.customer && userId) {
          await pool.query(
            "UPDATE users SET stripe_customer_id = $1 WHERE external_id = $2",
            [checkoutSession.customer, userId],
          ).catch(saveErr => console.warn("[WEBHOOK] Could not save stripe_customer_id:", saveErr.message));
        }
        await applyTierUpgrade(userId, targetTier);
      } else if (event.type === "invoice.payment_succeeded") {
        const invoice = event.data.object;
        if (!invoice.subscription) return res.json({ received: true });
        const invoiceSub = await stripe.subscriptions.retrieve(invoice.subscription);
        const { userId, targetTier } = invoiceSub.metadata ?? {};
        await applyTierUpgrade(userId, targetTier);
      } else if (event.type === "customer.subscription.deleted") {
        const deletedSub = event.data.object;
        const { userId } = deletedSub.metadata ?? {};
        if (userId) {
          await pool.query(
            "UPDATE users SET account_tier = 0, role = 'FREE' WHERE external_id = $1",
            [userId],
          );
          console.log(
            `[STRIPE] Reverted ${userId} → Free tier (subscription cancelled)`,
          );
        }
      }
    } catch (dbErr) {
      console.error("[WEBHOOK] DB operation failed:", dbErr.message);
      return res.status(500).json({ error: "Database update failed." });
    }

    res.json({ received: true });
  },
);

app.use(express.json());

if (process.env.NODE_ENV !== "production") {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
});


// ── DB migrations (run once on startup) ───────────────────────────────────
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

pool.query(`UPDATE users SET system_credits = 0 WHERE system_credits IS NULL`).catch(() => {});

pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_bonus_claimed_at TIMESTAMPTZ`).catch(() => {});
pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS has_seen_onboarding BOOLEAN DEFAULT false`).catch(() => {});
pool.query(`ALTER TABLE user_skills ADD COLUMN IF NOT EXISTS prestige_boost_until TIMESTAMPTZ`).catch(() => {});
pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS first_task_completed BOOLEAN NOT NULL DEFAULT false`).catch(() => {});
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

const sseClients = new Map();

// Anonymous presence: externalId → { sessionId, skillName, duration, startedAt, tier }
const presenceMap = new Map();

// One-time SSE auth tokens: uuid → { userId, expiresAt }
// Clerk JWTs must not live in query-params (logged by proxies/nginx).
// Frontend requests a short-lived UUID here, uses it once to open the stream.
const sseTokens = new Map();

// Stake amounts per duration — mirrors client getMissionStakes but is authoritative.
// Red Zone (0–4am server time) halves the stake so the server, not the client, decides.
const STAKE_BY_DURATION = { 5: 250, 15: 1200, 30: 4000, 60: 10000, 90: 15800, 120: 30000 };

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

function broadcastPresence() {
  const sessions = [...presenceMap.values()];
  const payload = `data: ${JSON.stringify({ type: "presence", data: sessions })}\n\n`;
  for (const stream of sseClients.values()) {
    try { stream.write(payload); } catch { /* stream closed */ }
  }
}

async function pushUserPatch(externalId) {
  const stream = sseClients.get(externalId);
  if (!stream) return;
  try {
    const userDataResult = await pool.query(
      `SELECT id,
              COALESCE(system_credits, 0)      AS system_credits,
              xp, level, total_xp, streak,
              COALESCE(account_tier, 0)        AS account_tier,
              COALESCE(role, 'FREE')           AS role,
              daily_bonus_claimed_at,
              daily_challenge_claimed_date,
              COALESCE(has_seen_onboarding, false) AS has_seen_onboarding
       FROM users WHERE external_id = $1`,
      [externalId],
    );
    if (!userDataResult.rows[0]) return;

    const masteryResult = await pool.query(
      `SELECT us.id, us.skill_id, s.name AS skill_name, us.xp AS current_xp,
              us.level AS current_level, us.next_level_xp, us.prestige_level,
              us.prestige_boost_until
       FROM user_skills us
       JOIN skills s ON us.skill_id = s.id
       WHERE us.user_id = $1
       ORDER BY s.name`,
      [userDataResult.rows[0].id],
    );

    const inventoryResult = await pool.query(
      `SELECT id, id AS "instanceId", name, category, rarity, description,
              is_equipped, color_hex, effect_value
       FROM inventory WHERE user_id = $1
       ORDER BY id`,
      [userDataResult.rows[0].id],
    );

    const data = { ...userDataResult.rows[0], mastery: masteryResult.rows, inventory: inventoryResult.rows };
    stream.write(`data: ${JSON.stringify({ type: "user_patch", data })}\n\n`);
  } catch { /* stream already closed or DB hiccup — silent */ }
}

const TIER_PERK_SLOTS     = { 0: 1,    1: 2,   2: 4        };
const TIER_MAX_TASKS      = { 0: 5,    1: 15,  2: Infinity };
// Chance of getting a loot drop at all — separate from rarity.
// FREE: 1-in-4 sessions. PRO: 2-in-4 (2× base). ELITE: 3-in-4 (3× base).
const TIER_DROP_CHANCE    = { 0: 0.25, 1: 0.50, 2: 0.75   };
// How many items the vault can hold before scrapping extras.
const TIER_VAULT_CAP      = { 0: 10,   1: 20,  2: 40       };


// Per-tier rarity thresholds — all tiers can roll any rarity.
// Higher tiers just have better odds (lower cutoffs), not exclusive access.
// Probabilities per tier (approximate):
//   FREE:  Mythic 0.2% | Legendary 0.8% | Epic 7% | Rare 14% | Uncommon 33% | Junk 45%
//   PRO:   Mythic 0.5% | Legendary 2.5% | Epic 7% | Rare 16% | Uncommon 34% | Junk 40%
//   ELITE: Mythic 0.5% | Legendary 4.5% | Epic 8% | Rare 17% | Uncommon 35% | Junk 35%
const RARITY_THRESHOLDS = {
  0: { Mythic: 99.8, Legendary: 99.0, Epic: 92, Rare: 78, Uncommon: 45 },
  1: { Mythic: 99.5, Legendary: 97.0, Epic: 90, Rare: 74, Uncommon: 40 },
  2: { Mythic: 99.5, Legendary: 95.0, Epic: 87, Rare: 70, Uncommon: 35 },
};

function getTierRarity(roll, accountTier) {
  const rarityThresholdTable = RARITY_THRESHOLDS[accountTier] ?? RARITY_THRESHOLDS[0];
  if (roll > rarityThresholdTable.Mythic)    return "Mythic";
  if (roll > rarityThresholdTable.Legendary) return "Legendary";
  if (roll > rarityThresholdTable.Epic)      return "Epic";
  if (roll > rarityThresholdTable.Rare)      return "Rare";
  if (roll > rarityThresholdTable.Uncommon)  return "Uncommon";
  return "Junk";
}


// Server-side cosmetic prices for purchase validation.
// null = tier-only (subscription required, not purchaseable with credits).
// All purchasable cosmetics with their credit price.
// Classic is free (not listed — purchase attempt returns COSMETIC_NOT_FOUND).
// PRO/ELITE themes require the matching subscription tier before the credit purchase is allowed.
const COSMETICS_PRICES = {
  cobalt: 1500, amber: 1500, crimson: 2000, violet: 2500, jade: 3000,
  neon: 2000, arctic: 2000, solar: 2500,
  nebula: 3000, obsidian: 3000, ember: 3500,
  rain: 600, library: 600, lofi: 900, cyberpunk: 1200,
  deepspace: null, spacestation: null, deepsea: null,
};


// Consumable prices — deducted on purchase, effect applied immediately.
const CONSUMABLE_PRICES = {
  streak_rescue:   500,
  extra_loot_pull: 250,
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

const { CREDIT_BY_RARITY, rollRarity } = require("./LootData.js");

// Terms that impersonate Zenith staff or the brand.
// Checked case-insensitively as substrings after stripping separators.
// Unicode homoglyph normalization handles lookalike characters (ᴢenith, z̷ēnith etc.)
const RESERVED_USERNAME_PATTERNS = [
  
  "zenith",
 
  "admin", "administrator",
  "mod", "moderator", "moderation",
  "staff", "official", "founder", "owner",
  "developer", "sysadmin",
  "verified", "security", "helpdesk", "support",
  "bot", "automod",
  "system",
];

function isReservedUsername(username) {
  // Normalize Unicode to strip homoglyphs (ᴢ → z, é → e etc.)
  const normalized = username
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")   // strip combining diacritics
    .toLowerCase()
    .replace(/[\s_\-\.0@$1!]/g, "");   // strip separators + common leet substitutes
  return RESERVED_USERNAME_PATTERNS.some(pattern =>
    normalized.includes(pattern.replace(/[\s_\-\.]/g, ""))
  );
}


// ── Daily credit bonus ─────────────────────────────────────────────────────────
// Rolling 24h window (not calendar-day) — prevents midnight spam.
// FOR UPDATE row lock prevents duplicate claims from concurrent requests.
const DAILY_BONUS_CREDITS = { 0: 30, 1: 120, 2: 250 };
const BONUS_WINDOW_MS     = 24 * 60 * 60 * 1000;

app.post("/api/daily-bonus/claim", requireAuth, bonusLimiter, async (req, res) => {
  const clerkId = req.auth.userId;
  const client  = await pool.connect();
  try {
    await client.query("BEGIN");

    const row = await client.query(
      `SELECT id,
              COALESCE(system_credits, 0)  AS credits,
              COALESCE(account_tier, 0)    AS account_tier,
              daily_bonus_claimed_at
       FROM users WHERE external_id = $1 FOR UPDATE`,
      [clerkId],
    );
    if (!row.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "USER_NOT_FOUND" });
    }

    const { id, credits, account_tier, daily_bonus_claimed_at } = row.rows[0];

    if (daily_bonus_claimed_at) {
      const elapsedMs   = Date.now() - new Date(daily_bonus_claimed_at).getTime();
      const secondsLeft = Math.ceil((BONUS_WINDOW_MS - elapsedMs) / 1000);
      if (elapsedMs < BONUS_WINDOW_MS) {
        await client.query("ROLLBACK");
        return res.json({
          already_used:      true,
          seconds_remaining: Math.max(secondsLeft, 0),
          system_credits:    parseInt(credits),
        });
      }
    }

    const earned     = DAILY_BONUS_CREDITS[account_tier] ?? 30;
    const newCredits = parseInt(credits) + earned;
    await client.query(
      "UPDATE users SET system_credits = $1, daily_bonus_claimed_at = NOW() WHERE id = $2",
      [newCredits, id],
    );

    await client.query("COMMIT");
    pushUserPatch(clerkId).catch(() => {});
    res.json({ already_used: false, credits_earned: earned, system_credits: newCredits });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});


app.post("/user", requireAuth, async (req, res) => {
  const { username, email } = req.body;
  const clerkId = req.auth.userId;

  if (!username || isReservedUsername(username)) {
    return res.status(403).json({
      error: "USERNAME_RESERVED",
      message: "That username is not available.",
    });
  }

  try {
    const userCreationRes = await pool.query(
      "INSERT INTO users (external_id, username, email_address, level, xp, streak, total_xp, current_level) VALUES ($1, $2, $3, 1, 0, 0, 0, 1) RETURNING *",
      [clerkId, username, email],
    );

    const newUser = userCreationRes.rows[0];

    await pool.query(
      `INSERT INTO user_skills (user_id, skill_id, xp, level, next_level_xp, prestige_level)
       SELECT $1, id, 0, 1, 500, 0 FROM skills`,
      [newUser.id],
    );

    const postUserMasteryRes = await pool.query(
      `SELECT us.id, us.skill_id, s.name AS skill_name, us.xp AS current_xp,
              us.level AS current_level, us.next_level_xp, us.prestige_level
       FROM user_skills us
       JOIN skills s ON us.skill_id = s.id
       WHERE us.user_id = $1
       ORDER BY s.name`,
      [newUser.id],
    );
    newUser.mastery = postUserMasteryRes.rows;

    res.status(201).json(newUser);
  } catch (err) {
    console.error("INITIALIZATION_FATAL:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get("/user/:externalId", requireAuth, async (req, res) => {
  const externalId = req.auth.userId;
  try {
    const userDetailsRes = await pool.query(
      `SELECT *,
              COALESCE(system_credits, 0) AS system_credits,
              COALESCE(role, 'FREE')      AS role,
              COALESCE(account_tier, 0)  AS account_tier,
              (SELECT COUNT(*) FROM tasks
               WHERE user_id::text = users.id::text
                 AND status = 'SUCCESS'
                 AND completed_at::date = CURRENT_DATE) AS sessions_today,
              (SELECT COALESCE(SUM(duration_minutes), 0) FROM tasks
               WHERE user_id::text = users.id::text
                 AND status = 'SUCCESS'
                 AND completed_at::date = CURRENT_DATE) AS minutes_today,
              (SELECT COUNT(DISTINCT skill_id) FROM tasks
               WHERE user_id::text = users.id::text
                 AND status = 'SUCCESS'
                 AND completed_at::date = CURRENT_DATE) AS skills_today
       FROM users WHERE external_id = $1`,
      [externalId],
    );
    if (userDetailsRes.rows.length === 0)
      return res.status(404).json({ error: "USER_NOT_FOUND" });

    const activeUser = userDetailsRes.rows[0];

    if (activeUser.is_banned)
      return res.status(403).json({ error: "USER_BANNED", reason: activeUser.ban_reason || "Your account has been banned." });

    const activeMasteryRes = await pool.query(
      `SELECT us.id, us.skill_id, s.name AS skill_name, us.xp AS current_xp,
              us.level AS current_level, us.next_level_xp, us.prestige_level,
              us.prestige_boost_until
       FROM user_skills us
       JOIN skills s ON us.skill_id = s.id
       WHERE us.user_id = $1
       ORDER BY s.name`,
      [activeUser.id],
    );
    activeUser.mastery = activeMasteryRes.rows;

    res.json(activeUser);
  } catch (err) {
    res.status(500).json({ error: "DATABASE_ERROR" });
  }
});

// ── GDPR account deletion ─────────────────────────────────────────────────────
// Permanently deletes all user data across every table. Irreversible.
app.delete("/user/account", requireAuth, mutationLimiter, async (req, res) => {
  const clerkId = req.auth.userId;
  const client  = await pool.connect();
  try {
    await client.query("BEGIN");

    const userRes = await client.query(
      "SELECT id FROM users WHERE external_id = $1",
      [clerkId],
    );
    if (userRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "USER_NOT_FOUND" });
    }
    const userId = userRes.rows[0].id;

    await client.query("DELETE FROM inventory          WHERE user_id = $1", [userId]);
    await client.query("DELETE FROM user_skills        WHERE user_id = $1", [userId]);
    await client.query("DELETE FROM tasks              WHERE user_id = $1", [userId]);
    await client.query("DELETE FROM daily_stats        WHERE user_id = $1", [userId]);
    await client.query("DELETE FROM push_subscriptions WHERE user_id = $1", [userId]);
    await client.query("DELETE FROM users              WHERE id      = $1", [userId]);

    await client.query("COMMIT");

    // Delete from Clerk after DB succeeds — if this fails the account is
    // already gone from our DB so the user effectively can't log in anyway.
    await clerkClient.users.deleteUser(clerkId);

    res.json({ success: true });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("ACCOUNT_DELETE_FATAL:", err.message);
    res.status(500).json({ error: "DELETE_FAILED" });
  } finally {
    client.release();
  }
});

const VALID_DURATIONS = new Set([5, 15, 30, 60, 90, 120]);
const VALID_SKILLS    = new Set([
  "LOGIC FLOW","VITALITY","NUTRITION","ENVIRONMENT","EXECUTION",
  "LEARNING","LOGISTICS","CREATIVITY","DISCIPLINE","PRESENCE","RECOVERY","RESOLVE",
]);

app.post("/api/tasks", requireAuth, mutationLimiter, async (req, res) => {
  const { taskName, durationMinutes, stakeAmount, skillName, sub_tasks } = req.body;
  const externalId = req.auth.userId;

  if (!taskName || typeof taskName !== "string" || taskName.trim().length === 0 || taskName.length > 200)
    return res.status(400).json({ error: "Task name must be 1–200 characters" });

  if (sub_tasks !== undefined && sub_tasks !== null) {
    if (!Array.isArray(sub_tasks) || sub_tasks.length > 20) {
      return res.status(400).json({ error: "sub_tasks must be an array of at most 20 items" });
    }
    for (const subTask of sub_tasks) {
      if (typeof subTask !== "string" || subTask.length > 200) {
        return res.status(400).json({ error: "Each sub-task must be a string under 200 characters" });
      }
    }
  }

  const parsedDuration = parseInt(durationMinutes);
  if (!VALID_DURATIONS.has(parsedDuration)) {
    return res.status(400).json({ error: "Duration must be 5, 15, 30, 60, 90, or 120 minutes" });
  }

  const taskClient = await pool.connect();
  try {
    await taskClient.query("BEGIN");

    const taskUserRes = await taskClient.query(
      "SELECT id FROM users WHERE external_id = $1",
      [externalId],
    );
    if (taskUserRes.rows.length === 0) {
      await taskClient.query("ROLLBACK");
      return res.status(404).json({ error: "USER_NOT_FOUND" });
    }
    const internalUserId = taskUserRes.rows[0].id;

   
    let pythonGateChecked = false;
    try {
      const pythonPort = process.env.PYTHON_PORT || 8000;
      const gateRes = await fetch(
        `http://localhost:${pythonPort}/security/check?external_id=${encodeURIComponent(externalId)}`
      );
      if (gateRes.ok) {
        pythonGateChecked = true;
        const gate = await gateRes.json();
        if (gate.allowed === false) {
          await taskClient.query("ROLLBACK");
          if (gate.reason === "ACTIVE_SESSION_EXISTS") {
            return res.status(409).json({ error: "ACTIVE_SESSION_EXISTS" });
          }
        }
      } else {
        console.warn(`[SECURITY GATE] Python returned ${gateRes.status} — using local check`);
      }
    } catch (secErr) {
      console.warn("[SECURITY GATE] Python unreachable:", secErr.message, "— using local check");
    }

    const taskTierRow = await taskClient.query(
      "SELECT COALESCE(account_tier,0) AS account_tier, COALESCE(role,'FREE') AS role FROM users WHERE id = $1",
      [internalUserId],
    );
    const { account_tier: cTier, role: cRole } = taskTierRow.rows[0];

    // 120 min sessions are PRO+ only
    if (Number(durationMinutes) === 120 && cTier < 1) {
      await taskClient.query("ROLLBACK");
      return res.status(403).json({ error: "UPGRADE_REQUIRED", message: "120 min sessions require PRO." });
    }

    const taskMaxLimit = cRole === "ADMIN" ? Infinity : (TIER_MAX_TASKS[cTier] ?? 5);
    if (taskMaxLimit !== Infinity) {
      const taskActiveCount = await taskClient.query(
        "SELECT COUNT(*) FROM tasks WHERE user_id = $1 AND status = 'ACTIVE'",
        [internalUserId],
      );
      if (parseInt(taskActiveCount.rows[0].count) >= taskMaxLimit) {
        await taskClient.query("ROLLBACK");
        return res.status(403).json({
          error: "TASK LIMIT REACHED",
          message: `You've reached your ${taskMaxLimit}-task limit. Upgrade your plan to run more missions at once!`,
        });
      }
    }

    let targetSkillId = null;
    let resolvedSkillName = null;
    
    // Skill lookup with fallback to "Resolve" if not found
    if (skillName) {
      const targetSkillRes = await taskClient.query(
        "SELECT id, name FROM skills WHERE LOWER(name) = LOWER($1)",
        [skillName],
      );
      if (targetSkillRes.rows[0]?.id) {
        targetSkillId = targetSkillRes.rows[0].id;
        resolvedSkillName = targetSkillRes.rows[0].name;
      } else {
        // Fallback to "Resolve" skill if not found - prevents UNKNOWN bug
        const fallbackRes = await taskClient.query(
          "SELECT id, name FROM skills WHERE LOWER(name) = LOWER($1)",
          ["Resolve"],
        );
        if (fallbackRes.rows[0]) {
          targetSkillId = fallbackRes.rows[0].id;
          resolvedSkillName = fallbackRes.rows[0].name;
        }
      }
    } else {
      // Default to "Resolve" skill when no skillName provided
      const defaultRes = await taskClient.query(
        "SELECT id, name FROM skills WHERE LOWER(name) = LOWER($1)",
        ["Resolve"],
      );
      if (defaultRes.rows[0]) {
        targetSkillId = defaultRes.rows[0].id;
        resolvedSkillName = defaultRes.rows[0].name;
      }
    }

    // Stake is calculated server-side from duration + server time (Red Zone check).
    // The client value is ignored — this prevents clock-spoofing to bypass Red Zone.
    const serverStake = calculateStake(parsedDuration);

    const newTask = await taskClient.query(
      `INSERT INTO tasks (user_id, title, duration_minutes, stake_amount, status, deadline, skill_id, sub_tasks)
        VALUES ($1, $2, $3, $4, 'ACTIVE', NOW() + ($5 || ' minutes')::interval, $6, $7)
        RETURNING *, NOW() AS server_now`,
      [
        internalUserId,
        taskName,
        durationMinutes,
        serverStake,
        String(parseFloat(durationMinutes)),
        targetSkillId,
        sub_tasks?.length ? JSON.stringify(sub_tasks) : null,
      ],
    );

    await taskClient.query("COMMIT");
    pushUserPatch(externalId).catch(() => {});

    presenceMap.set(externalId, {
      sessionId: Math.random().toString(36).slice(2, 10),
      skillName: resolvedSkillName || "Focus",
      duration:  parsedDuration,
      startedAt: new Date().toISOString(),
      tier:      cTier ?? 0,
    });
    broadcastPresence();

    res.status(201).json({
      ...newTask.rows[0],
      skill_name: resolvedSkillName,
    });
  } catch (err) {
    await taskClient.query("ROLLBACK");
    console.error("TASK_ERROR:", err.message);
    res.status(500).json({ error: err.message });
  } finally {
    taskClient.release();
  }
});

app.post("/api/tasks/batch", requireAuth, mutationLimiter, async (req, res) => {
  const { tasks } = req.body;
  const externalId = req.auth.userId;
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return res.status(400).json({ error: "No tasks provided" });
  }
  if (tasks.length > 4) {
    return res.status(400).json({ error: "Batch limited to 4 tasks" });
  }
  const batchClient = await pool.connect();
  try {
    await batchClient.query("BEGIN");

    const batchUserRes = await batchClient.query(
      "SELECT id FROM users WHERE external_id = $1",
      [externalId],
    );
    if (batchUserRes.rows.length === 0) {
      await batchClient.query("ROLLBACK");
      return res.status(404).json({ error: "USER_NOT_FOUND" });
    }
    const { id: userId } = batchUserRes.rows[0];

    const batchTierRow = await batchClient.query(
      "SELECT COALESCE(account_tier,0) AS account_tier, COALESCE(role,'FREE') AS role FROM users WHERE id = $1",
      [userId],
    );
    const { account_tier: cTier, role: cRole } = batchTierRow.rows[0];

    // Split (batch) is PRO+ only
    if (cTier < 1) {
      await batchClient.query("ROLLBACK");
      return res.status(403).json({ error: "UPGRADE_REQUIRED", message: "Shatter requires PRO." });
    }

    const batchMaxLimit = cRole === "ADMIN" ? Infinity : (TIER_MAX_TASKS[cTier] ?? 5);
    if (batchMaxLimit !== Infinity) {
      const batchActiveCount = await batchClient.query(
        "SELECT COUNT(*) FROM tasks WHERE user_id = $1 AND status = 'ACTIVE'",
        [userId],
      );
      const activeNum = parseInt(batchActiveCount.rows[0].count);
      if (activeNum + tasks.length > batchMaxLimit) {
        await batchClient.query("ROLLBACK");
        return res.status(403).json({
          error: "TASK LIMIT REACHED",
          message: `Not enough task slots. ${batchMaxLimit - activeNum} slot(s) remaining — upgrade to run more missions.`,
        });
      }
    }

    const inserted = [];
    for (const batchTask of tasks) {
      if (!batchTask.taskName || typeof batchTask.taskName !== "string" || batchTask.taskName.trim().length === 0 || batchTask.taskName.length > 200) {
        await batchClient.query("ROLLBACK");
        return res.status(400).json({ error: "Each task name must be 1–200 characters" });
      }
      const parsedBatchDuration = parseInt(batchTask.durationMinutes);
      if (!VALID_DURATIONS.has(parsedBatchDuration)) {
        await batchClient.query("ROLLBACK");
        return res.status(400).json({ error: "Duration must be 5, 15, 30, 60, 90, or 120 minutes" });
      }

      let batchSkillId = null;
      if (batchTask.skillName) {
        const batchSkillRes = await batchClient.query(
          "SELECT id FROM skills WHERE LOWER(name) = LOWER($1)",
          [batchTask.skillName],
        );
        batchSkillId = batchSkillRes.rows[0]?.id || null;
      }
      const deadline = new Date(Date.now() + parsedBatchDuration * 60 * 1000);
      const batchStake = calculateStake(parsedBatchDuration);
      const batchInsertResult = await batchClient.query(
        `INSERT INTO tasks (user_id, title, duration_minutes, stake_amount, status, deadline, skill_id)
          VALUES ($1, $2, $3, $4, 'ACTIVE', $5, $6)
          RETURNING *`,
        [userId, batchTask.taskName.trim(), parsedBatchDuration, batchStake, deadline.toISOString(), batchSkillId],
      );
      inserted.push(batchInsertResult.rows[0]);
    }

    await batchClient.query("COMMIT");
    res.status(201).json(inserted);
  } catch (err) {
    await batchClient.query("ROLLBACK");
    console.error("BATCH_TASK_ERROR:", err.message);
    res.status(500).json({ error: err.message });
  } finally {
    batchClient.release();
  }
});

app.get("/api/tasks", requireAuth, async (req, res) => {
  const externalId = req.auth.userId;
  try {
    const tasksUserRes = await pool.query(
      "SELECT id FROM users WHERE external_id = $1",
      [externalId],
    );
    if (tasksUserRes.rows.length === 0) return res.json([]);

    const tasksListRes = await pool.query(
      `SELECT t.*,
              s.name                        AS skill_name,
              COALESCE(us.prestige_level, 0) AS prestige_level,
              NOW()                          AS server_now
       FROM tasks t
       LEFT JOIN skills s      ON s.id = t.skill_id
       LEFT JOIN user_skills us ON us.skill_id = t.skill_id
                                AND us.user_id  = t.user_id::integer
       WHERE t.user_id = $1 AND t.status = 'ACTIVE'`,
      [tasksUserRes.rows[0].id],
    );
    res.json(tasksListRes.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/tasks/active/:externalId", requireAuth, async (req, res) => {
  try {
    const externalId = req.auth.userId;

    const activeUserRes = await pool.query(
      "SELECT id FROM users WHERE external_id = $1",
      [externalId],
    );
    if (activeUserRes.rows.length === 0)
      return res.status(404).json({ message: "NO ACTIVE MISSION!" });

    const activeTasksRes = await pool.query(
      "SELECT *, NOW() AS server_now FROM tasks WHERE user_id = $1 AND status = 'ACTIVE' LIMIT 1",
      [activeUserRes.rows[0].id],
    );

    if (activeTasksRes.rows.length > 0) {
      res.json(activeTasksRes.rows[0]);
    } else {
      res.status(404).json({ message: "NO ACTIVE MISSION!" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("SERVER ERROR!!!");
  }
});

app.post("/api/tasks/:id/complete", requireAuth, mutationLimiter, async (req, res) => {
  const { id } = req.params;
  const externalId = req.auth.userId;

  const completeClient = await pool.connect();
  try {
    await completeClient.query("BEGIN");

    const taskRes = await completeClient.query(
      `SELECT t.id,
              t.title            AS "taskName",
              t.duration_minutes AS "durationMinutes",
              t.stake_amount     AS "stakeAmount",
              t.user_id          AS "userId",
              t.status,
              t.skill_id         AS "skillId",
              t.deadline,
              (NOW() >= t.deadline)       AS "deadlinePassed",
              EXTRACT(EPOCH FROM (t.deadline - NOW()))::int AS "secondsRemaining"
       FROM tasks t
       JOIN users u ON t.user_id::text = u.id::text
       WHERE t.id::text = $1 AND u.external_id::text = $2`,
      [String(id), String(externalId)],
    );

    const task = taskRes.rows[0];
    if (!task) {
      await completeClient.query("ROLLBACK");
      return res.status(404).json({ error: "TASK_NOT_FOUND" });
    }
    if (task.status === "SUCCESS") {
      await completeClient.query("ROLLBACK");
      return res.status(400).json({ error: "TASK_ALREADY_COMPLETED" });
    }
    if (!task.deadlinePassed) {
      await completeClient.query("ROLLBACK");
      return res.status(425).json({
        error: "TASK_NOT_YET_COMPLETE",
        seconds_remaining: Math.max(0, task.secondsRemaining),
      });
    }

    const userRow = await completeClient.query(
      `SELECT xp, level, total_xp,
              COALESCE(system_credits, 0) AS credits,
              COALESCE(account_tier, 0)   AS account_tier,
              COALESCE(role, 'FREE')      AS role,
              COALESCE(streak, 0)         AS streak,
              COALESCE(first_task_completed, false) AS first_task_completed
       FROM users WHERE id::text = $1`,
      [String(task.userId)],
    );
    const { xp, level, total_xp, credits, account_tier, role, streak, first_task_completed } = userRow.rows[0];

    const durationMins = Math.min(parseInt(task.durationMinutes) || 0, 180);
    const osrsXpRequired = (lvl) => Math.max(1, Math.floor(100 * Math.pow(lvl, 1.8)));

    const streakCount  = parseInt(streak || 0);
    const streakMult   = 1 + Math.min(streakCount, 20) * 0.05;

    const stakeXp     = Math.floor(parseInt(task.stakeAmount || 0) * 1.5 * streakMult);
    let totalXpGained = stakeXp;

    let completedSkillName = null;
    if (task.skillId) {
      const skillRow = await completeClient.query(
        `SELECT us.id, us.xp, us.level, us.next_level_xp, us.prestige_level,
                us.prestige_boost_until, s.name AS skill_name
         FROM user_skills us
         JOIN skills s ON us.skill_id = s.id
         WHERE us.user_id = $1 AND us.skill_id = $2`,
        [task.userId, task.skillId],
      );
      if (skillRow.rows.length > 0) {
        const skillData = skillRow.rows[0];
        completedSkillName = skillData.skill_name;
        const skillLevel       = parseInt(skillData.level);
        const levelMult  = 1 + (skillLevel * 0.05);
        const baseSkillXp  = Math.floor(durationMins * 50 * levelMult);
        const prestigeMult = 1 + (parseInt(skillData.prestige_level || 0) * 0.10);
        // 24h post-prestige boost: doubles skill XP for the first day of the new grind
        const boostActive  = skillData.prestige_boost_until && new Date(skillData.prestige_boost_until) > new Date();
        const boostMult    = boostActive ? 2.0 : 1.0;
        const neuralMult   = getNeuralMult();
        const finalSkillXp = Math.round(baseSkillXp * streakMult * prestigeMult * boostMult * neuralMult);
        totalXpGained += finalSkillXp;
        let skillXp    = parseInt(skillData.xp) + finalSkillXp;
        let newSkillLevel = skillLevel;
        let nextSkillLevelXpRequired   = osrsXpRequired(newSkillLevel);
        while (skillXp >= nextSkillLevelXpRequired && newSkillLevel < 99) { skillXp -= nextSkillLevelXpRequired; newSkillLevel++; nextSkillLevelXpRequired = osrsXpRequired(newSkillLevel); }
        await completeClient.query(
          `UPDATE user_skills SET xp = $1, level = $2, next_level_xp = $3 WHERE id = $4`,
          [skillXp, newSkillLevel, nextSkillLevelXpRequired, skillData.id],
        );
      }
    }

    let globalXp      = parseInt(xp) + totalXpGained;
    let globalLevel     = parseInt(level);
    let globalTotalXp = (parseInt(total_xp) || 0) + totalXpGained;
    let nextGlobalLevelXpRequired    = osrsXpRequired(globalLevel);
    let leveledUp = false;
    while (globalXp >= nextGlobalLevelXpRequired) { globalXp -= nextGlobalLevelXpRequired; globalLevel++; nextGlobalLevelXpRequired = osrsXpRequired(globalLevel); leveledUp = true; }

    // last_reboot = NOW() starts the regen clock fresh from the moment the task ends.
    const updatedUser = await completeClient.query(
      `UPDATE users
       SET xp = $1, level = $2, current_level = $2, total_xp = $3,
           streak = CASE
             WHEN streak_last_updated IS NULL
               OR DATE(streak_last_updated AT TIME ZONE 'UTC') < DATE(NOW() AT TIME ZONE 'UTC')
             THEN streak + 1
             ELSE streak
           END,
           strikes = 0,
           streak_last_updated = NOW(),
           last_reboot = NOW()
       WHERE id::text = $4 RETURNING *`,
      [globalXp, globalLevel, globalTotalXp, String(task.userId)],
    );

    // Loot drop: guaranteed Epic on first ever session, normal RNG after that.
    const dropChance = TIER_DROP_CHANCE[account_tier] ?? 0.25;
    let drop = null;
    if (!first_task_completed || Math.random() < dropChance) {
      const rarity      = !first_task_completed ? "Epic" : rollRarity(Math.random() * 100);
      const dropCredits = CREDIT_BY_RARITY[rarity] ?? 50;
      await completeClient.query(
        `UPDATE users SET system_credits = system_credits + $1, first_task_completed = true WHERE id = $2`,
        [dropCredits, task.userId],
      );
      drop = { rarity, credits_earned: dropCredits };
    } else {
      // Still mark first task done even if no drop rolled after the first
      if (!first_task_completed) {
        await completeClient.query(
          `UPDATE users SET first_task_completed = true WHERE id = $1`,
          [task.userId],
        );
      }
    }

    await completeClient.query(
      `UPDATE tasks SET status = 'SUCCESS', completed_at = NOW() WHERE id::text = $1`,
      [String(id)],
    );

    await completeClient.query(
      `INSERT INTO daily_stats (user_id, date, focus_minutes)
       VALUES ($1::integer, CURRENT_DATE, $2)
       ON CONFLICT (user_id, date)
       DO UPDATE SET focus_minutes = daily_stats.focus_minutes + EXCLUDED.focus_minutes`,
      [task.userId, parseInt(task.durationMinutes) || 0],
    );

    await completeClient.query("COMMIT");

    // Push real-time patch to any connected SSE client before sending response
    pushUserPatch(externalId).catch(() => {});
    presenceMap.delete(externalId);
    broadcastPresence();

    res.json({
      success:        true,
      reward:         totalXpGained,
      credits_earned: 0,
      xp_earned:      totalXpGained,
      skill_name:     completedSkillName,
      user:           updatedUser.rows[0],
      drop,
      leveledUp,
      newLevel:      globalLevel,
    });
  } catch (err) {
    await completeClient.query("ROLLBACK");
    console.error("TASK_COMPLETION_ERROR:", err.message);
    res.status(500).json({ error: err.message });
  } finally {
    completeClient.release();
  }
});

app.post("/api/tasks/:id/fail", requireAuth, mutationLimiter, async (req, res) => {
  const { id } = req.params;
  const externalId = req.auth.userId;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const contractRes = await client.query(
      `SELECT t.stake_amount, t.user_id, t.status, t.created_at,
              (NOW() >= t.deadline) AS deadline_passed
       FROM tasks t
       JOIN users u ON t.user_id::text = u.id::text
       WHERE t.id::text = $1 AND u.external_id::text = $2`,
      [String(id), String(externalId)],
    );

    if (contractRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).send("Mission not found");
    }
    const { stake_amount, user_id, status, created_at, deadline_passed } = contractRes.rows[0];

    if (status !== "ACTIVE") {
      await client.query("ROLLBACK");
      return res.status(400).send("Mission already processed");
    }

    const elapsedSeconds = (Date.now() - new Date(created_at).getTime()) / 1000;
    const inGrace = elapsedSeconds <= 60 || deadline_passed;

    await client.query("UPDATE tasks SET status = 'FAILED' WHERE id = $1", [id]);

    if (inGrace) {
      await client.query("COMMIT");
      pushUserPatch(externalId).catch(() => {});
      presenceMap.delete(externalId);
      broadcastPresence();
      return res.json({ streak_shield_used: false, grace_period: true });
    }

    const userUpdate = await client.query(
      `UPDATE users
       SET streak  = 0,
           strikes = COALESCE(strikes, 0) + 1
       WHERE id = $1
       RETURNING *`,
      [user_id],
    );

    await client.query("COMMIT");
    pushUserPatch(externalId).catch(() => {});
    presenceMap.delete(externalId);
    broadcastPresence();
    res.json({ ...userUpdate.rows[0], streak_shield_used: false });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("ABORT_SEQUENCE_FAILED:", err);
    res.status(500).send("ABORT_SEQUENCE_FAILED");
  } finally {
    client.release();
  }
});

app.post("/skills/prestige", requireAuth, mutationLimiter, async (req, res) => {
  const { skillName } = req.body;
  const externalId = req.auth.userId;

  if (!skillName || !VALID_SKILLS.has(skillName.toUpperCase()))
    return res.status(400).json({ error: "Invalid skill name" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const prestigeUserRes = await client.query(
      "SELECT id FROM users WHERE external_id = $1 FOR UPDATE",
      [externalId],
    );
    if (prestigeUserRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "USER_NOT_FOUND" });
    }
    const userId = prestigeUserRes.rows[0].id;

    const skillRes = await client.query(
      `UPDATE user_skills us
       SET level = 1, xp = 0,
           prestige_level      = COALESCE(us.prestige_level, 0) + 1,
           next_level_xp       = 500,
           prestige_boost_until = NOW() + INTERVAL '24 hours'
       FROM skills s
       WHERE us.skill_id = s.id
         AND us.user_id = $1
         AND LOWER(s.name) = LOWER($2)
         AND us.level >= 99
       RETURNING us.*, s.name AS skill_name`,
      [userId, skillName],
    );

    if (skillRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "REQUIREMENTS_NOT_MET" });
    }

    // Credits scale with prestige level — each prestige pays more than the last
    const newPrestigeLevel = skillRes.rows[0].prestige_level;
    const prestigeReward   = CREDIT_BY_RARITY["Mythic"] * newPrestigeLevel;
    const creditRes = await client.query(
      `UPDATE users
       SET system_credits = COALESCE(system_credits, 0) + $1
       WHERE id = $2
       RETURNING system_credits`,
      [prestigeReward, userId],
    );

    await client.query("COMMIT");

    await pushUserPatch(externalId).catch(() => {});

    res.json({
      success:        true,
      message:        "PRESTIGE_COMPLETE",
      skill:          skillRes.rows[0],
      system_credits: creditRes.rows[0]?.system_credits,
      drop:           { rarity: "Mythic", credits_earned: prestigeReward },
    });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// /api/v1/loot/roll removed — loot is awarded inline during task completion only.
// A standalone roll endpoint with no task gate allowed unlimited free credit farming.


app.post("/api/inventory/equip", requireAuth, mutationLimiter, async (req, res) => {
  const { instanceId } = req.body;
  const externalId = req.auth.userId;

  const equipDbClient = await pool.connect();
  try {
    const equipUserRes = await equipDbClient.query(
      `SELECT id, COALESCE(account_tier,0) AS account_tier, COALESCE(role,'FREE') AS role
       FROM users WHERE external_id = $1`,
      [externalId],
    );
    if (equipUserRes.rows.length === 0) throw new Error("USER_NOT_FOUND");
    const {
      id: internalId,
      account_tier: eTier,
      role: eRole,
    } = equipUserRes.rows[0];

    const slotLimit = eRole === "ADMIN" ? 999 : (TIER_PERK_SLOTS[eTier] ?? 1);

    const itemInfo = await equipDbClient.query(
      "SELECT name, category, is_equipped FROM inventory WHERE id = $1 AND user_id = $2",
      [instanceId, internalId],
    );
    if (itemInfo.rows.length === 0)
      throw new Error("ITEM_NOT_FOUND_IN_INVENTORY");
    const { name: itemName, category, is_equipped: alreadyEquipped } = itemInfo.rows[0];

    await equipDbClient.query("BEGIN");

    if (alreadyEquipped) {
      await equipDbClient.query(
        "UPDATE inventory SET is_equipped = false WHERE id = $1 AND user_id = $2",
        [instanceId, internalId],
      );
    } else {
      // Prevent equipping two copies of the same perk
      const dupRes = await equipDbClient.query(
        "SELECT 1 FROM inventory WHERE user_id = $1 AND name = $2 AND is_equipped = true AND id != $3 LIMIT 1",
        [internalId, itemName, instanceId],
      );
      if (dupRes.rows.length > 0) {
        await equipDbClient.query("ROLLBACK");
        return res.status(400).json({
          code: "DUPLICATE_PERK_EQUIPPED",
          message: `You can't equip two ${itemName}s at once.`,
        });
      }

      const equippedCount = await equipDbClient.query(
        "SELECT COUNT(*) FROM inventory WHERE user_id = $1 AND is_equipped = true",
        [internalId],
      );
      if (parseInt(equippedCount.rows[0].count) >= slotLimit) {
        await equipDbClient.query("ROLLBACK");
        return res.status(403).json({
          code: "SLOT_LIMIT_REACHED",
          message: `You can only equip ${slotLimit} perk${slotLimit === 1 ? "" : "s"} on your current plan. Upgrade to unlock more slots!`,
          slot_limit: slotLimit,
        });
      }
      if (slotLimit === 1) {
        await equipDbClient.query(
          "UPDATE inventory SET is_equipped = false WHERE user_id = $1",
          [internalId],
        );
      }
      await equipDbClient.query(
        "UPDATE inventory SET is_equipped = true WHERE id = $1 AND user_id = $2",
        [instanceId, internalId],
      );
    }

    await equipDbClient.query("COMMIT");

    const equippedResult = await equipDbClient.query(
      "SELECT id FROM inventory WHERE user_id = $1 AND is_equipped = true",
      [internalId],
    );
    const equipped_ids = equippedResult.rows.map((equippedItem) => String(equippedItem.id));

    res.json({ success: true, equipped_ids });
  } catch (err) {
    if (equipDbClient) await equipDbClient.query("ROLLBACK");
    console.error("EQUIP ERROR:", err.message);
    res.status(500).json({ error: err.message });
  } finally {
    equipDbClient.release();
  }
});

app.get("/modules", async (req, res) => {
  try {
    const modulesResult = await pool.query(
      "SELECT id, subject, topic, duration, tier FROM learning_modules ORDER BY duration ASC",
    );
    res.json(modulesResult.rows);
  } catch (err) {
    console.error("DATABASE_ERROR:", err.message);
    res.status(500).json({ error: "COULD_NOT_FETCH_INTEL" });
  }
});

app.get("/api/inventory/:externalId", requireAuth, async (req, res) => {
  const externalId = req.auth.userId;
  try {
    const vaultUserRes = await pool.query(
      "SELECT id FROM users WHERE external_id = $1",
      [externalId],
    );

    if (vaultUserRes.rows.length === 0) {
      return res.json([]);
    }

    const vaultInventoryResult = await pool.query(
      'SELECT id AS "instanceId", name, rarity, category, description, is_equipped, color_hex, effect_value FROM inventory WHERE user_id = $1',
      [vaultUserRes.rows[0].id],
    );

    res.json(vaultInventoryResult.rows);
  } catch (err) {
    console.error("INVENTORY_FETCH_ERROR:", err.message);
    res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
  }
});

app.post("/api/inventory/claim", requireAuth, mutationLimiter, async (req, res) => {
  const { item, equipNow } = req.body;
  const externalId = req.auth.userId;

  try {
    const claimUserQueryResult = await pool.query(
      "SELECT id FROM users WHERE external_id = $1",
      [externalId],
    );

    if (claimUserQueryResult.rows.length === 0)
      return res.status(404).json({ error: "USER_NOT_FOUND_IN_DB" });

    const internalId = claimUserQueryResult.rows[0].id;

    if (equipNow) {
      // Unequip anything currently equipped, then equip the claimed item
      await pool.query(
        "UPDATE inventory SET is_equipped = false WHERE user_id = $1 AND is_equipped = true",
        [internalId],
      );
      await pool.query(
        "UPDATE inventory SET is_equipped = true WHERE id = $1 AND user_id = $2",
        [item.instanceId, internalId],
      );
    }

    const updatedItem = await pool.query(
      `SELECT id AS "instanceId", name, rarity, category, description, is_equipped, color_hex, effect_value
       FROM inventory WHERE id = $1 AND user_id = $2`,
      [item.instanceId, internalId],
    );

    res.json({ success: true, item: updatedItem.rows[0] });
  } catch (err) {
    console.error("CLAIM_ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Stripe: create checkout session ────────────────────────────────────────
app.post("/payments/create-session", requireAuth, paymentLimiter, async (req, res) => {
  const { targetTier } = req.body;
  const userId = req.auth.userId;

  if (!userId || ![1, 2].includes(Number(targetTier))) {
    return res
      .status(400)
      .json({
        error: "Invalid request — userId and targetTier (1 or 2) required.",
      });
  }

  const reqTier = Number(targetTier);
  const PLANS = {
    1: {
      name: "Zenith PRO",
      description:
        "1.5× XP + credits · 15 task slots · 120 min sessions · 2× loot drop rate · Cobalt & Amber themes",
      amount: 499,
      currency: "eur",
    },
    2: {
      name: "Zenith ELITE",
      description:
        "2× XP + credits · Unlimited task slots · 120 min sessions · 3× loot drop rate · All themes unlocked",
      amount: 999,
      currency: "eur",
    },
  };
  const plan = PLANS[reqTier];

  try {
    const stripeSess = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          price_data: {
            currency: plan.currency,
            product_data: { name: plan.name, description: plan.description },
            unit_amount: plan.amount,
            recurring: { interval: "month" },
          },
          quantity: 1,
        },
      ],
      subscription_data: {
        metadata: { userId, targetTier: String(reqTier) },
      },
      metadata: { userId, targetTier: String(reqTier) },
      success_url: `${process.env.FRONTEND_URL}/payment/success`,
      cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`,
    });

    res.json({ url: stripeSess.url });
  } catch (err) {
    console.error("[STRIPE] Session creation failed:", err.message);
    res
      .status(500)
      .json({ error: err.message || "Failed to create checkout session." });
  }
});




// ── Stripe: open billing portal ────────────────────────────────────────────
// Creates a Stripe Customer Portal session for PRO/ELITE users so they can
// cancel, change plan, or update payment details without contacting support.
// Customer ID is looked up from the DB — never trusted from the client.
app.post("/payments/create-portal-session", requireAuth, paymentLimiter, async (req, res) => {
  const clerkId = req.auth.userId;

  try {
    const userRes = await pool.query(
      "SELECT stripe_customer_id, email_address, role FROM users WHERE external_id = $1",
      [clerkId],
    );
    if (!userRes.rows.length) return res.status(404).json({ error: "USER_NOT_FOUND" });

    const { stripe_customer_id, email_address, role } = userRes.rows[0];

    if (role === "FREE") {
      return res.status(403).json({ error: "NO_ACTIVE_SUBSCRIPTION" });
    }

    let customerId = stripe_customer_id;

    // Fallback for users who subscribed before customer_id was saved to the DB.
    // Look them up in Stripe by email and backfill for future requests.
    if (!customerId) {
      const stripeCustomers = await stripe.customers.list({ email: email_address, limit: 1 });
      if (!stripeCustomers.data.length) {
        return res.status(404).json({ error: "STRIPE_CUSTOMER_NOT_FOUND" });
      }
      customerId = stripeCustomers.data[0].id;
      await pool.query(
        "UPDATE users SET stripe_customer_id = $1 WHERE external_id = $2",
        [customerId, clerkId],
      ).catch(() => {});
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer:   customerId,
      return_url: `${process.env.FRONTEND_URL}/account`,
    });

    res.json({ url: portalSession.url });
  } catch (portalErr) {
    console.error("[STRIPE PORTAL] Failed:", portalErr.message);
    res.status(500).json({ error: "PORTAL_SESSION_FAILED" });
  }
});

// ── Elevation Chart — 7-day focus stats ────────────────────────────────────
app.get("/api/stats/elevation", requireAuth, async (req, res) => {
  const clerk_id = req.auth.userId;

  try {
    const elevRes = await pool.query(
      `SELECT
         gs.day::date                              AS date,
         TO_CHAR(gs.day, 'Dy')                    AS day,
         COALESCE(SUM(t.duration_minutes)::int, 0) AS minutes
       FROM generate_series(
         CURRENT_DATE - INTERVAL '6 days',
         CURRENT_DATE,
         INTERVAL '1 day'
       ) AS gs(day)
       LEFT JOIN tasks t ON (
         t.completed_at::date = gs.day::date
         AND t.user_id::text  = (SELECT id::text FROM users WHERE external_id = $1)
         AND t.status         = 'SUCCESS'
       )
       GROUP BY gs.day
       ORDER BY gs.day ASC`,
      [clerk_id],
    );
    res.json(elevRes.rows);
  } catch (err) {
    console.error("ELEVATION_FETCH_ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Summit History — recent completed sessions ──────────────────────────────
app.get("/api/stats/summit-history", requireAuth, async (req, res) => {
  const clerk_id = req.auth.userId;
  const { limit = 12 } = req.query;

  // Hard cap: never send more than 50 rows — prevents low-tier phones from
  // receiving a massive payload if the query param is tampered with.
  const safeLimit = Math.min(parseInt(limit) || 12, 50);

  try {
    const summitRes = await pool.query(
      `SELECT
         t.id,
         t.duration_minutes::int                        AS minutes,
         TO_CHAR(t.completed_at, 'Mon DD')              AS label,
         COALESCE(t.title, 'Mission')                   AS title,
         COALESCE(s.name, '')                           AS skill_name,
         t.completed_at
       FROM tasks t
       JOIN users u ON u.id::text = t.user_id::text
       LEFT JOIN skills s ON s.id = t.skill_id
       WHERE u.external_id = $1
         AND t.status       = 'SUCCESS'
         AND t.completed_at IS NOT NULL
         AND t.completed_at >= NOW() - INTERVAL '7 days'
         AND t.duration_minutes BETWEEN 1 AND 180
       ORDER BY t.completed_at DESC
       LIMIT $2`,
      [clerk_id, safeLimit],
    );
    res.json(summitRes.rows.reverse());
  } catch (err) {
    console.error("SUMMIT_HISTORY_ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Perk Shop ─────────────────────────────────────────────────────────────────

// Returns the user's credit balance, tier, and owned cosmetic IDs.
// The catalog itself is defined in frontend constants — no need to serve it.
app.get("/api/shop/catalog", requireAuth, async (req, res) => {
  const externalId = req.auth.userId;
  try {
    const userRes = await pool.query(
      `SELECT system_credits, account_tier, role, COALESCE(purchased_cosmetics, '[]') AS purchased_cosmetics
       FROM users WHERE external_id = $1`,
      [externalId],
    );
    if (!userRes.rows.length) return res.status(404).json({ error: "USER_NOT_FOUND" });
    const { system_credits, account_tier, role, purchased_cosmetics } = userRes.rows[0];
    const tier = getEffectiveAccountTier(account_tier);
    res.json({ credits: system_credits, tier, owned: purchased_cosmetics ?? [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/shop/cosmetic-purchase", requireAuth, shopLimiter, async (req, res) => {
  const { cosmeticId } = req.body;
  const externalId     = req.auth.userId;

  if (!cosmeticId || typeof cosmeticId !== "string")
    return res.status(400).json({ error: "INVALID_COSMETIC_ID" });

  const price = COSMETICS_PRICES[cosmeticId];
  if (price === undefined) return res.status(404).json({ error: "COSMETIC_NOT_FOUND" });
  if (price === null)      return res.status(403).json({ error: "TIER_REQUIRED" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const userRes = await client.query(
      `SELECT id, system_credits, COALESCE(purchased_cosmetics, '[]') AS purchased_cosmetics
       FROM users WHERE external_id = $1 FOR UPDATE`,
      [externalId],
    );
    if (!userRes.rows.length) throw new Error("USER_NOT_FOUND");
    const { id: userId, system_credits, purchased_cosmetics } = userRes.rows[0];

    const owned = Array.isArray(purchased_cosmetics) ? purchased_cosmetics : [];
    if (owned.includes(cosmeticId)) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "ALREADY_OWNED" });
    }
    if (system_credits < price) {
      await client.query("ROLLBACK");
      return res.status(402).json({ error: "INSUFFICIENT_CREDITS", required: price, have: system_credits });
    }

    const newOwned = [...owned, cosmeticId];
    await client.query(
      `UPDATE users SET system_credits = system_credits - $1, purchased_cosmetics = $2 WHERE id = $3`,
      [price, JSON.stringify(newOwned), userId],
    );
    await client.query("COMMIT");

    pushUserPatch(externalId).catch(() => {});

    res.json({
      success:       true,
      purchased:     cosmeticId,
      credits_spent: price,
      system_credits: system_credits - price,
      owned:         newOwned,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ── Consumable purchase ───────────────────────────────────────────────────────
// Deducts credits and applies the effect immediately.
// streak_rescue: sets streak to 1 if currently 0 (restores a broken streak).
// extra_loot_pull: rolls loot and credits the user instantly.
app.post("/api/shop/consumable-purchase", requireAuth, shopLimiter, async (req, res) => {
  const { consumableId } = req.body;
  const externalId       = req.auth.userId;

  if (!consumableId || typeof consumableId !== "string")
    return res.status(400).json({ error: "INVALID_CONSUMABLE_ID" });

  const price = CONSUMABLE_PRICES[consumableId];
  if (price === undefined) return res.status(404).json({ error: "CONSUMABLE_NOT_FOUND" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const userRes = await client.query(
      `SELECT id, system_credits, streak, COALESCE(account_tier, 0) AS account_tier
       FROM users WHERE external_id = $1 FOR UPDATE`,
      [externalId],
    );
    if (!userRes.rows.length) throw new Error("USER_NOT_FOUND");
    const { id: userId, system_credits, streak } = userRes.rows[0];

    if (system_credits < price) {
      await client.query("ROLLBACK");
      return res.status(402).json({ error: "INSUFFICIENT_CREDITS", required: price, have: system_credits });
    }

    let result = {};

    if (consumableId === "streak_rescue") {
      const currentStreak = parseInt(streak || 0);
      if (currentStreak > 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "STREAK_NOT_BROKEN", message: "Your streak is still active — no rescue needed." });
      }
      await client.query(
        `UPDATE users
         SET system_credits = system_credits - $1,
             streak = 1,
             streak_last_updated = NOW()
         WHERE id = $2`,
        [price, userId],
      );
      result = { streak_restored: 1 };
    } else if (consumableId === "extra_loot_pull") {
      const { rollRarity } = require("./LootData.js");
      const rarity      = rollRarity(Math.random() * 100);
      const dropCredits = CREDIT_BY_RARITY[rarity] ?? 50;
      await client.query(
        `UPDATE users
         SET system_credits = system_credits - $1 + $2
         WHERE id = $3`,
        [price, dropCredits, userId],
      );
      result = { rarity, credits_earned: dropCredits };
    }

    await client.query("COMMIT");
    pushUserPatch(externalId).catch(() => {});

    const fresh = await pool.query(
      "SELECT system_credits FROM users WHERE external_id = $1",
      [externalId],
    );
    res.json({ success: true, consumable: consumableId, credits_spent: price, ...result, system_credits: fresh.rows[0]?.system_credits });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ── Admin: manually grant tier by username ────────────────────────────────────
// Used for gifting PRO/ELITE to promoters, testers, etc.
// Body: { username: string, tier: "FREE" | "PRO" | "ELITE" }
app.post("/admin/grant-tier", requireAuth, requireAdmin, adminLimiter, async (req, res) => {
  const { username, tier } = req.body;

  const TIER_MAP = { FREE: 0, PRO: 1, ELITE: 2 };
  const ROLE_MAP = { FREE: "FREE", PRO: "PRO", ELITE: "ELITE" };

  if (!username || typeof username !== "string")
    return res.status(400).json({ error: "MISSING_USERNAME" });
  if (!(tier in TIER_MAP))
    return res.status(400).json({ error: "INVALID_TIER", valid: ["FREE", "PRO", "ELITE"] });

  const newTier = TIER_MAP[tier];
  const newRole = ROLE_MAP[tier];

  try {
    const result = await pool.query(
      `UPDATE users
       SET account_tier = $1,
           role         = $2
       WHERE LOWER(username) = LOWER($3)
       RETURNING external_id, username, role, account_tier`,
      [newTier, newRole, username.trim()],
    );

    if (result.rowCount === 0)
      return res.status(404).json({ error: "USER_NOT_FOUND", username });

    const updated = result.rows[0];
    pushUserPatch(updated.external_id).catch(() => {});

    res.json({
      success:  true,
      username: updated.username,
      role:     updated.role,
      tier:     updated.account_tier,
    });
  } catch (err) {
    res.status(500).json({ error: "DATABASE_ERROR" });
  }
});

app.post("/admin/ban-user", requireAuth, requireAdmin, adminLimiter, async (req, res) => {
  const { username, ban, reason } = req.body;
  if (!username || typeof username !== "string")
    return res.status(400).json({ error: "MISSING_USERNAME" });

  try {
    const result = await pool.query(
      `UPDATE users
       SET is_banned  = $1,
           ban_reason = $2
       WHERE LOWER(username) = LOWER($3) AND is_admin = false
       RETURNING external_id, username, is_banned`,
      [!!ban, ban ? (reason?.trim() || "Banned by admin.") : null, username.trim()],
    );
    if (result.rowCount === 0)
      return res.status(404).json({ error: "USER_NOT_FOUND_OR_PROTECTED" });

    const updated = result.rows[0];
    // Push the ban state so the user's session reflects it immediately
    pushUserPatch(updated.external_id).catch(() => {});
    res.json({ success: true, username: updated.username, is_banned: updated.is_banned });
  } catch (err) {
    res.status(500).json({ error: "DATABASE_ERROR" });
  }
});

// ── Admin: list all users ────────────────────────────────────────────────────
app.get("/admin/users", requireAuth, requireAdmin, adminLimiter, async (req, res) => {
  const { search } = req.query;
  try {
    let result;
    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      result = await pool.query(
        `SELECT external_id, username, email_address,
                COALESCE(role, 'FREE') AS role,
                COALESCE(account_tier, 0) AS account_tier,
                COALESCE(level, 1) AS level,
                COALESCE(total_xp, 0) AS total_xp,
                COALESCE(is_admin, false) AS is_admin
         FROM users
         WHERE username ILIKE $1 OR email_address ILIKE $1
         ORDER BY id DESC
         LIMIT 200`,
        [term],
      );
    } else {
      result = await pool.query(
        `SELECT external_id, username, email_address,
                COALESCE(role, 'FREE') AS role,
                COALESCE(account_tier, 0) AS account_tier,
                COALESCE(level, 1) AS level,
                COALESCE(total_xp, 0) AS total_xp,
                COALESCE(is_admin, false) AS is_admin
         FROM users
         ORDER BY id DESC
         LIMIT 200`,
      );
    }
    res.json(result.rows);
  } catch (err) {
    console.error("[ADMIN USERS]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── SSE: real-time user state stream ─────────────────────────────────────────
// The frontend opens one EventSource per session. Mutations call pushUserPatch()
// which immediately writes a user_patch frame — no 30-second wait.

// ── Daily challenge reward ─────────────────────────────────────────────────────
// Awards 150 CR once per calendar day (UTC). Challenge completion is tracked
// client-side (localStorage), so we can't verify it — but the once-per-day
// gate makes this economically insignificant even if someone calls it directly.
app.post("/api/daily-challenge/claim", requireAuth, bonusLimiter, async (req, res) => {
  const clerkId = req.auth.userId;
  try {
    const result = await pool.query(
      `UPDATE users
          SET system_credits             = system_credits + 150,
              daily_challenge_claimed_date = CURRENT_DATE
        WHERE external_id = $1
          AND (daily_challenge_claimed_date IS NULL
               OR daily_challenge_claimed_date < CURRENT_DATE)
        RETURNING system_credits, daily_challenge_claimed_date`,
      [clerkId],
    );
    if (result.rowCount === 0) {
      return res.status(409).json({ error: "ALREADY_CLAIMED", message: "Challenge already claimed today." });
    }
    pushUserPatch(clerkId).catch(() => {});
    res.json({ credits_earned: 50, system_credits: result.rows[0].system_credits });
  } catch (err) {
    console.error("DAILY_CHALLENGE_CLAIM_ERROR:", err.message);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

// Issues a one-time UUID that the client exchanges for an SSE connection.
// Keeps the Clerk JWT out of URLs (and therefore out of nginx/proxy access logs).
app.post("/api/stream-token", requireAuth, (req, res) => {
  const { randomUUID } = require("crypto");
  const token = randomUUID();
  const expiresAt = Date.now() + 30_000; // valid for 30 seconds
  sseTokens.set(token, { userId: req.auth.userId, expiresAt });
  setTimeout(() => sseTokens.delete(token), 30_000); // guaranteed cleanup
  res.json({ token });
});

app.get("/api/stream/:externalId", async (req, res) => {
  const { externalId } = req.params;
  const ot = req.query.t; // one-time token

  if (!ot) return res.status(401).end();
  const entry = sseTokens.get(ot);
  if (!entry || entry.expiresAt < Date.now() || entry.userId !== externalId) {
    return res.status(401).end();
  }
  sseTokens.delete(ot); // single use

  res.setHeader("Content-Type",  "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection",    "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // disable nginx proxy buffering
  res.flushHeaders();

  sseClients.set(externalId, res);
  res.write(":connected\n\n");

  // Send current presence snapshot immediately so the grid is populated on load
  if (presenceMap.size > 0) {
    const sessions = [...presenceMap.values()];
    res.write(`data: ${JSON.stringify({ type: "presence", data: sessions })}\n\n`);
  }

  // Keepalive comment every 25s — prevents proxies from closing idle connections
  const ping = setInterval(() => res.write(":ping\n\n"), 25_000);

  req.on("close", () => {
    clearInterval(ping);
    sseClients.delete(externalId);
    // Guard: remove presence if the tab closed mid-session (complete/fail normally handles this)
    if (presenceMap.has(externalId)) {
      presenceMap.delete(externalId);
      broadcastPresence();
    }
  });
});

// ── Push notification subscription ───────────────────────────────────────────
app.post("/api/push/vapid-key", (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

app.post("/api/push/subscribe", requireAuth, async (req, res) => {
  const { subscription } = req.body;
  if (!subscription?.endpoint) return res.status(400).json({ error: "Invalid payload" });
  const clerkId = req.auth.userId;
  try {
    const userRes = await pool.query("SELECT id FROM users WHERE external_id = $1", [clerkId]);
    if (!userRes.rows.length) return res.status(404).json({ error: "User not found" });
    const userId = userRes.rows[0].id;
    await pool.query(
      `INSERT INTO push_subscriptions (user_id, endpoint, subscription)
       VALUES ($1, $2, $3)
       ON CONFLICT (endpoint) DO UPDATE SET subscription = EXCLUDED.subscription`,
      [userId, subscription.endpoint, JSON.stringify(subscription)],
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("Push subscribe error:", err.message);
    res.status(500).json({ error: "Failed to save subscription" });
  }
});

app.delete("/api/push/unsubscribe", requireAuth, async (req, res) => {
  const { endpoint } = req.body;
  if (!endpoint) return res.status(400).json({ error: "Missing endpoint" });
  // Scope delete to the authenticated user — prevents one user from removing another's subscription
  await pool.query(
    `DELETE FROM push_subscriptions
     WHERE endpoint = $1
       AND user_id  = (SELECT id FROM users WHERE external_id = $2)`,
    [endpoint, req.auth.userId],
  ).catch(() => {});
  res.json({ ok: true });
});

// Stores the Expo push token and device timezone so the server can send
// personalised mobile push at the right local time for each user.
app.post("/api/push/register-token", requireAuth, async (req, res) => {
  const { token, timezone } = req.body;
  if (typeof token !== "string" || !token.startsWith("ExponentPushToken[")) {
    return res.status(400).json({ error: "Invalid Expo push token" });
  }

  // Basic IANA timezone validation — reject anything with suspicious characters
  const safeTimezone = (typeof timezone === "string" && /^[A-Za-z/_\-+0-9]{1,64}$/.test(timezone))
    ? timezone
    : "UTC";

  try {
    const userRes = await pool.query(
      "SELECT id FROM users WHERE external_id = $1",
      [req.auth.userId],
    );
    if (!userRes.rows.length) return res.status(404).json({ error: "User not found" });

    const userId = userRes.rows[0].id;

    await pool.query(
      `INSERT INTO expo_push_tokens (user_id, token)
       VALUES ($1, $2)
       ON CONFLICT (token) DO NOTHING`,
      [userId, token],
    );

    // Keep the user's timezone up to date (device may change timezone)
    await pool.query(
      "UPDATE users SET timezone = $1 WHERE id = $2",
      [safeTimezone, userId],
    );

    res.json({ ok: true });
  } catch (err) {
    console.error("register-token error:", err.message);
    res.status(500).json({ error: "Failed to save token" });
  }
});

async function sendPushToUser(userId, payload) {
  const subs = await pool.query(
    "SELECT subscription FROM push_subscriptions WHERE user_id = $1",
    [userId],
  );
  const sends = subs.rows.map(async (row) => {
    try {
      await webpush.sendNotification(row.subscription, JSON.stringify(payload));
    } catch (err) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        await pool.query(
          "DELETE FROM push_subscriptions WHERE subscription->>'endpoint' = $1",
          [row.subscription.endpoint],
        ).catch(() => {});
      }
    }
  });
  await Promise.allSettled(sends);
}

// Sends a push notification to all Expo push tokens registered for a user
async function sendExpoPushToUser(userId, payload) {
  const tokenRes = await pool.query(
    "SELECT token FROM expo_push_tokens WHERE user_id = $1",
    [userId],
  );
  if (!tokenRes.rows.length) return;

  const messages = tokenRes.rows.map((row) => ({
    to:    row.token,
    title: payload.title,
    body:  payload.body,
    sound: "default",
    data:  payload.data ?? {},
  }));

  try {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method:  "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body:    JSON.stringify(messages),
    });
    const result = await response.json();

    // Clean up invalid tokens
    const data = Array.isArray(result.data) ? result.data : [result.data];
    for (let i = 0; i < data.length; i++) {
      if (data[i]?.details?.error === "DeviceNotRegistered") {
        await pool.query(
          "DELETE FROM expo_push_tokens WHERE token = $1",
          [messages[i].to],
        ).catch(() => {});
      }
    }
  } catch (err) {
    console.error("Expo push error:", err.message);
  }
}

// ── Streak reaper — runs every hour ──────────────────────────────────────────

cron.schedule("0 * * * *", async () => {
  try {
    const expired = await pool.query(
      `SELECT id, external_id, username, streak
       FROM users
       WHERE streak > 0
         AND streak_last_updated < NOW() - INTERVAL '24 hours'`,
    );
    if (!expired.rows.length) return;

    const ids = expired.rows.map((expiredUser) => expiredUser.id);
    await pool.query(
      `UPDATE users SET streak = 0 WHERE id = ANY($1::int[])`,
      [ids],
    );

    for (const user of expired.rows) {
      pushUserPatch(user.external_id).catch(() => {});
      await sendPushToUser(user.id, {
        title: "Zenith",
        body: `💀 Your ${user.streak}-day streak has ended. Complete a session today to start a new one.`,
        icon: "/icons.svg",
        badge: "/icons.svg",
        tag: "streak-reset",
        data: { url: "/" },
      });
    }

    console.log(`Streak reaper: reset ${expired.rows.length} user(s)`);
  } catch (err) {
    console.error("Streak reaper error:", err.message);
  }
});

// ── Session expiry — runs every 5 minutes ────────────────────────────────────
// 25 min after deadline: push warning. 30 min after: auto-fail.

cron.schedule("*/5 * * * *", async () => {
  try {
    // ── Warning: deadline passed 23–27 min ago (5-min window centred on 25 min) ──
    const warned = await pool.query(
      `SELECT t.id, t.title, t.user_id, u.id AS db_user_id
       FROM tasks t
       JOIN users u ON u.id::text = t.user_id::text
       WHERE t.status  = 'ACTIVE'
         AND t.deadline < NOW() - INTERVAL '23 minutes'
         AND t.deadline > NOW() - INTERVAL '27 minutes'`,
    );
    for (const task of warned.rows) {
      await sendExpoPushToUser(task.db_user_id, {
        title: "⚡ Session expiring",
        body:  `"${task.title}" — 5 minutes to collect your reward before it's gone.`,
      });
    }

    // ── Auto-fail: deadline passed more than 30 min ago ──
    const abandoned = await pool.query(
      `UPDATE tasks
       SET status = 'FAILED'
       WHERE status  = 'ACTIVE'
         AND deadline < NOW() - INTERVAL '30 minutes'
       RETURNING id, title, user_id,
                 (SELECT id FROM users WHERE id::text = user_id::text) AS db_user_id,
                 (SELECT external_id FROM users WHERE id::text = user_id::text) AS external_id`,
    );
    for (const task of abandoned.rows) {
      pushUserPatch(task.external_id).catch(() => {});
      await sendExpoPushToUser(task.db_user_id, {
        title: "❌ Session abandoned",
        body:  `"${task.title}" was not collected in time and has been marked as failed.`,
      });
    }

    if (warned.rows.length || abandoned.rows.length) {
      console.log(`Session expiry: ${warned.rows.length} warned, ${abandoned.rows.length} auto-failed`);
    }
  } catch (err) {
    console.error("Session expiry cron error:", err.message);
  }
});

// ── Streak-at-risk alert — fires every hour, targets users where it is 7 PM locally ──
// Only sent to users with an active streak who haven't logged a session today.

cron.schedule("0 * * * *", async () => {
  try {
    const atRisk = await pool.query(
      `SELECT u.id, u.streak
       FROM users u
       WHERE u.streak > 0
         AND EXTRACT(HOUR FROM (NOW() AT TIME ZONE COALESCE(u.timezone, 'UTC'))) = 19
         AND NOT EXISTS (
           SELECT 1 FROM tasks t
           WHERE t.user_id = u.id::text
             AND t.completed_at >= (CURRENT_TIMESTAMP AT TIME ZONE COALESCE(u.timezone, 'UTC'))::date
         )`,
    );
    if (!atRisk.rows.length) return;

    for (const user of atRisk.rows) {
      await sendExpoPushToUser(user.id, {
        title: "Zenith",
        body:  `🔥 Day ${user.streak} streak. You haven't logged a session yet — REDZONE starts in 5 hours.`,
      });
    }

    console.log(`Streak alert sent to ${atRisk.rows.length} user(s)`);
  } catch (err) {
    console.error("Streak alert cron error:", err.message);
  }
});

// ── Weekly summary — fires every hour, targets users where it is Sunday 6 PM locally ──

cron.schedule("0 * * * *", async () => {
  try {
    const results = await pool.query(
      `SELECT
         u.id,
         COUNT(t.id)::int                          AS session_count,
         COALESCE(SUM(t.duration_minutes), 0)::int AS total_minutes,
         COALESCE(SUM(t.xp_earned), 0)::int        AS total_xp,
         s.name                                    AS top_skill
       FROM users u
       JOIN tasks t ON t.user_id = u.id::text
         AND t.completed_at >= NOW() - INTERVAL '7 days'
       LEFT JOIN LATERAL (
         SELECT sk.name
         FROM tasks t2
         JOIN skills sk ON sk.id = t2.skill_id
         WHERE t2.user_id = u.id::text
           AND t2.completed_at >= NOW() - INTERVAL '7 days'
           AND t2.skill_id IS NOT NULL
         GROUP BY sk.name
         ORDER BY SUM(t2.xp_earned) DESC
         LIMIT 1
       ) s ON true
       WHERE EXTRACT(DOW  FROM (NOW() AT TIME ZONE COALESCE(u.timezone, 'UTC'))) = 0
         AND EXTRACT(HOUR FROM (NOW() AT TIME ZONE COALESCE(u.timezone, 'UTC'))) = 18
       GROUP BY u.id, s.name
       HAVING COUNT(t.id) > 0`,
    );
    if (!results.rows.length) return;

    for (const row of results.rows) {
      const skillLine = row.top_skill ? ` Top skill: ${row.top_skill}.` : "";
      await sendExpoPushToUser(row.id, {
        title: "Zenith — Weekly Summary",
        body:  `📊 ${row.session_count} sessions · ${row.total_minutes} min focused · +${row.total_xp} XP.${skillLine}`,
      });
    }

    console.log(`Weekly summary sent to ${results.rows.length} user(s)`);
  } catch (err) {
    console.error("Weekly summary cron error:", err.message);
  }
});

// Dev-only: resets strike count for a user.
if (process.env.NODE_ENV !== "production") {
  app.post("/api/debug/clear-ban", async (req, res) => {
    const { clerkId } = req.body;
    if (!clerkId) return res.status(400).json({ error: "Missing clerkId" });
    try {
      const result = await pool.query(
        "UPDATE users SET strikes = 0 WHERE external_id = $1 RETURNING external_id",
        [clerkId],
      );
      if (!result.rows.length) return res.status(404).json({ error: "User not found" });
      pushUserPatch(clerkId).catch(() => {});
      res.json({ cleared: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
}

// ── Contact form ─────────────────────────────────────────────────────────────
// Escape function — prevents user content from injecting HTML into the outbound email.
function escapeHtml(raw) {
  return String(raw)
    .replace(/&/g,  "&amp;")
    .replace(/</g,  "&lt;")
    .replace(/>/g,  "&gt;")
    .replace(/"/g,  "&quot;")
    .replace(/'/g,  "&#39;");
}

app.post("/contact", rateLimit({ windowMs: 15 * 60 * 1000, max: 5 }), async (req, res) => {
  const { email, topic, message } = req.body;
  if (!email || !message) return res.status(400).json({ error: "Missing fields" });
  if (typeof email !== "string"   || email.length   > 320) return res.status(400).json({ error: "Invalid email" });
  if (typeof message !== "string" || message.length > 5000) return res.status(400).json({ error: "Message too long" });
  if (topic  && (typeof topic !== "string" || topic.length > 200)) return res.status(400).json({ error: "Topic too long" });

  const safeEmail   = escapeHtml(email);
  const safeTopic   = topic ? escapeHtml(topic) : "—";
  const safeMessage = escapeHtml(message).replace(/\n/g, "<br/>");

  try {
    await resend.emails.send({
      from: "Zenith <noreply@zenithapp.org>",
      to:   "contact@zenithapp.org",
      replyTo: email,
      subject: `[Zenith Contact] ${safeTopic}`,
      html: `
        <p><strong>From:</strong> ${safeEmail}</p>
        <p><strong>Topic:</strong> ${safeTopic}</p>
        <hr/>
        <p>${safeMessage}</p>
      `,
    });
    res.json({ ok: true });
  } catch (err) {
    console.error("Resend error:", err);
    res.status(500).json({ error: "Failed to send" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`ZENITH ENGINE ONLINE ON PORT ${PORT}`));
module.exports = { getNeuralMult, calculateStake };
