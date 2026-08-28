const express = require("express");
const pool = require("../lib/db.js");
const { requireAuth } = require("../lib/auth.js");
const { shopLimiter } = require("../lib/rateLimiters.js");
const { pushUserPatch } = require("../lib/realtime.js");
const { getEffectiveAccountTier, COSMETICS_PRICES, CONSUMABLE_PRICES } = require("../lib/economy.js");
const { CREDIT_BY_RARITY, rollRarity } = require("../LootData.js");

const router = express.Router();

// ── Perk Shop ─────────────────────────────────────────────────────────────────

// Returns the user's credit balance, tier, and owned cosmetic IDs.
// The catalog itself is defined in frontend constants — no need to serve it.
router.get("/api/shop/catalog", requireAuth, async (req, res) => {
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

router.post("/api/shop/cosmetic-purchase", requireAuth, shopLimiter, async (req, res) => {
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
router.post("/api/shop/consumable-purchase", requireAuth, shopLimiter, async (req, res) => {
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
      const { rollRarity } = require("../LootData.js");
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

module.exports = router;
