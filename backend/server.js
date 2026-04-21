require("dotenv").config();

const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const app = express();
app.use(cors());

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
      const tier = Number(targetTier);
      const role = tier >= 2 ? "ELITE" : "PRO";
      const result = await pool.query(
        "UPDATE users SET account_tier = $1, role = $2 WHERE external_id = $3 RETURNING id, username",
        [tier, role, userId],
      );
      if (result.rowCount === 0) console.warn("[WEBHOOK] No user matched external_id:", userId);
      else console.log(`[STRIPE] Upgraded ${result.rows[0].username} → Tier ${tier} (${role})`);
    };

    try {
      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const { userId, targetTier } = session.metadata ?? {};
        console.log("[WEBHOOK] checkout.session.completed — userId:", userId, "tier:", targetTier);
        await applyTierUpgrade(userId, targetTier);

      } else if (event.type === "invoice.payment_succeeded") {
        const invoice = event.data.object;
        if (!invoice.subscription) return res.json({ received: true });
        const sub  = await stripe.subscriptions.retrieve(invoice.subscription);
        const { userId, targetTier } = sub.metadata ?? {};
        await applyTierUpgrade(userId, targetTier);

      } else if (event.type === "customer.subscription.deleted") {
        const sub = event.data.object;
        const { userId } = sub.metadata ?? {};
        if (userId) {
          await pool.query(
            "UPDATE users SET account_tier = 0, role = 'FREE' WHERE external_id = $1",
            [userId],
          );
          console.log(`[STRIPE] Reverted ${userId} → Free tier (subscription cancelled)`);
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

app.use((req, res, next) => {
  console.log("--- INCOMING REQUEST ---");
  console.log("Method:", req.method);
  console.log("Path:", req.path);
  console.log("Body:", req.body);
  next();
});

const pool = new Pool({
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT,
  database: process.env.DB_NAME,
});

const TIER_PERK_SLOTS = { 0: 1, 1: 2, 2: 4 };
const TIER_MAX_TASKS  = { 0: 5, 1: 15, 2: Infinity };

function getTierRarity(roll, accountTier, role) {
  const isAdmin = role === "ADMIN";
  if (roll > 99.5) return "Mythic";
  const legThreshold = isAdmin ? 95 : accountTier >= 2 ? 95 : accountTier >= 1 ? 98 : Infinity;
  if (roll > legThreshold) return "Legendary";
  if (roll > 90) return "Epic";
  if (roll > 75) return "Rare";
  if (roll > 40) return "Uncommon";
  return "Junk";
}

const PERK_EFFECTS = {
  "Flow State Crystal": { effect_type: "XP_GAIN",       effect_value: 2.0  },
  "Chronos Lock":       { effect_type: "XP_GAIN",       effect_value: 1.3  },
  "Clarity Prism":      { effect_type: "XP_GAIN",       effect_value: 1.5  },
  "All-In Token":       { effect_type: "XP_GAIN",       effect_value: 3.0  },
  "Second Wind":        { effect_type: "BW_EFFICIENCY",  effect_value: 5   },
  "Priority Lens":      { effect_type: "CREDIT_BOOST",   effect_value: 1.15},
  "Spark Stone":        { effect_type: "CREDIT_BOOST",   effect_value: 1.1 },
  "Streak Guard":       { effect_type: "CREDIT_BOOST",   effect_value: 1.05},
  "Calm Stone":         { effect_type: "BW_EFFICIENCY",  effect_value: 3   },
  "Warm Start":         { effect_type: "BW_EFFICIENCY",  effect_value: 3   },
  "Quiet Mode":         { effect_type: "BW_EFFICIENCY",  effect_value: 1   },
  "Commitment Stone":   { effect_type: "BW_EFFICIENCY",  effect_value: 2   },
  "Progress Lens":      { effect_type: "CREDIT_BOOST",   effect_value: 1.05},
  "Old Gear":           { effect_type: "BW_EFFICIENCY",  effect_value: 1   },
  "Quick Start":        { effect_type: "BW_EFFICIENCY",  effect_value: 2   },
  "Old Habit":          { effect_type: "XP_GAIN",        effect_value: 1.01},
  "Burst Bottle":       { effect_type: "XP_GAIN",        effect_value: 1.2 },
  "Tiny Spark":         { effect_type: "XP_GAIN",        effect_value: 1.1 },
};

const { lootTable } = require("./LootData.js");
console.log("Loot Table Loaded! Total Items:", lootTable.length);


app.post("/user", async (req, res) => {
  const { clerkId, username, email } = req.body;
  try {
    const userRes = await pool.query(
      "INSERT INTO users (external_id, username, email_address, level, xp, streak, total_xp, current_level) VALUES ($1, $2, $3, 1, 0, 0, 0, 1) RETURNING *",
      [clerkId, username, email],
    );

    const newUser = userRes.rows[0];

    await pool.query(
      `INSERT INTO user_skills (user_id, skill_id, xp, level, next_level_xp, prestige_level)
       SELECT $1, id, 0, 1, 500, 0 FROM skills`,
      [newUser.id],
    );

    const masteryRes = await pool.query(
      `SELECT us.id, us.skill_id, s.name AS skill_name, us.xp AS current_xp,
              us.level AS current_level, us.next_level_xp, us.prestige_level
       FROM user_skills us
       JOIN skills s ON us.skill_id = s.id
       WHERE us.user_id = $1
       ORDER BY s.name`,
      [newUser.id],
    );
    newUser.mastery = masteryRes.rows;

    res.status(201).json(newUser);
  } catch (err) {
    console.error("INITIALIZATION_FATAL:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get("/user/:externalId", async (req, res) => {
  const { externalId } = req.params;
  try {
    const userRes = await pool.query(
      `SELECT *, COALESCE(role, 'FREE') AS role, COALESCE(account_tier, 0) AS account_tier
       FROM users WHERE external_id = $1`,
      [externalId],
    );
    if (userRes.rows.length === 0)
      return res.status(404).json({ error: "USER_NOT_FOUND" });

    const user = userRes.rows[0];

    const masteryRes = await pool.query(
      `SELECT us.id, us.skill_id, s.name AS skill_name, us.xp AS current_xp,
              us.level AS current_level, us.next_level_xp, us.prestige_level
       FROM user_skills us
       JOIN skills s ON us.skill_id = s.id
       WHERE us.user_id = $1
       ORDER BY s.name`,
      [user.id],
    );
    user.mastery = masteryRes.rows;

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "DATABASE_ERROR" });
  }
});

app.post("/api/contracts", async (req, res) => {
  const { externalId, taskName, durationMinutes, stakeAmount, skillName } = req.body;
  try {
    const userRes = await pool.query(
      "SELECT id FROM users WHERE external_id = $1",
      [externalId],
    );
    if (userRes.rows.length === 0)
      return res.status(404).json({ error: "USER_NOT_FOUND" });
    const userId = userRes.rows[0].id;

    const tierRow = await pool.query(
      "SELECT COALESCE(account_tier,0) AS account_tier, COALESCE(role,'FREE') AS role FROM users WHERE id = $1",
      [userId],
    );
    const { account_tier: cTier, role: cRole } = tierRow.rows[0];
    const maxTasks = cRole === "ADMIN" ? Infinity : (TIER_MAX_TASKS[cTier] ?? 5);
    if (maxTasks !== Infinity) {
      const activeCount = await pool.query(
        "SELECT COUNT(*) FROM contracts WHERE user_id = $1 AND status = 'ACTIVE'",
        [userId],
      );
      if (parseInt(activeCount.rows[0].count) >= maxTasks) {
        return res.status(403).json({
          error: "TASK_LIMIT_REACHED",
          message: `You've reached your ${maxTasks}-task limit. Upgrade your plan to run more missions at once!`,
        });
      }
    }

    let skillId = null;
    if (skillName) {
      const skillRes = await pool.query(
        "SELECT id FROM skills WHERE LOWER(name) = LOWER($1)",
        [skillName],
      );
      skillId = skillRes.rows[0]?.id || null;
      console.log(`[ZENITH] Skill lookup: "${skillName}" → skill_id=${skillId}`);
    }

    const nowMs = Date.now();
    const durationMs = parseFloat(durationMinutes) * 60 * 1000;
    const deadlineDate = new Date(nowMs + durationMs);

    console.log("SERVER LOG: Creating mission with deadline:", deadlineDate.toISOString());

    const newContract = await pool.query(
      `INSERT INTO contracts (user_id, task_name, duration_minutes, stake_amount, status, deadline, skill_id)
        VALUES ($1, $2, $3, $4, 'ACTIVE', $5, $6)
        RETURNING *`,
      [
        userId,
        taskName,
        durationMinutes,
        stakeAmount,
        deadlineDate.toISOString(),
        skillId,
      ],
    );

    res.status(201).json(newContract.rows[0]);
  } catch (err) {
    console.error("CONTRACT_ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/contracts", async (req, res) => {
  const { externalId } = req.query;
  try {
    const user = await pool.query(
      "SELECT id FROM users WHERE external_id = $1",
      [externalId],
    );
    if (user.rows.length === 0) return res.json([]);

    const result = await pool.query(
      "SELECT * FROM contracts WHERE user_id = $1 AND UPPER(status) = 'ACTIVE'",
      [user.rows[0].id],
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/contracts/active/:externalId", async (req, res) => {
  try {
    const { externalId } = req.params;

    const result = await pool.query(
      "SELECT * FROM contracts WHERE user_id = $1 AND status = 'ACTIVE' LIMIT 1",
      [externalId],
    );

    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ message: "NO ACTIVE MISSION!" });
    }
  } catch (err) {
    console.error(err);

    res.status(500).send("SERVER ERROR!!!");
  }
});

app.post("/api/contracts/:id/complete", async (req, res) => {
  const { id } = req.params;
  const { externalId } = req.body;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const contractRes = await client.query(
      `SELECT c.id, c.task_name AS "taskName", c.duration_minutes AS "durationMinutes",
              c.stake_amount AS "stakeAmount", c.user_id AS "userId", c.status,
              c.skill_id AS "skillId"
       FROM contracts c
       JOIN users u ON c.user_id::text = u.id::text
       WHERE c.id::text = $1 AND u.external_id::text = $2`,
      [String(id), String(externalId)]
    );

    const contract = contractRes.rows[0];
    if (!contract) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "MISSION_NOT_FOUND" });
    }

    const sysRes = await client.query(
      `SELECT COALESCE(current_bandwidth, 100) AS bw,
              COALESCE(max_bandwidth, 100)     AS max_bw,
              COALESCE(system_credits, 0)      AS credits
       FROM users WHERE id::text = $1`,
      [String(contract.userId)]
    );
    const { bw, max_bw, credits: currentCredits } = sysRes.rows[0];

    if (bw < 20) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Insufficient Bandwidth" });
    }

    const perkRes = await client.query(
      `SELECT name FROM inventory WHERE user_id = $1 AND is_equipped = true LIMIT 1`,
      [contract.userId]
    );
    const equippedName = perkRes.rows[0]?.name || null;
    const perk = equippedName ? PERK_EFFECTS[equippedName] : null;

    const BASE_CREDITS  = 150;
    const BASE_XP_BONUS = 50;
    const BASE_BW_COST  = 20;

    let finalCredits = BASE_CREDITS;
    let finalXpBonus = BASE_XP_BONUS;
    let finalBwCost  = BASE_BW_COST;

    if (perk) {
      if (perk.effect_type === "CREDIT_BOOST")  finalCredits = Math.round(BASE_CREDITS  * perk.effect_value);
      if (perk.effect_type === "XP_GAIN")       finalXpBonus = Math.round(BASE_XP_BONUS * perk.effect_value);
      if (perk.effect_type === "BW_EFFICIENCY") finalBwCost  = Math.max(0, BASE_BW_COST - perk.effect_value);
    }

    const stakeXp      = Math.floor(parseInt(contract.stakeAmount || 0) * 1.5);
    const totalXpGained = stakeXp + finalXpBonus;

    if (contract.skillId) {
      const skillRow = await client.query(
        "SELECT id, xp, level, next_level_xp FROM user_skills WHERE user_id = $1 AND skill_id = $2",
        [contract.userId, contract.skillId]
      );
      if (skillRow.rows.length > 0) {
        const row = skillRow.rows[0];
        let mXp   = parseInt(row.xp) + totalXpGained;
        let mLvl  = parseInt(row.level);
        let mNext = parseInt(row.next_level_xp);
        while (mXp >= mNext) {
          mXp  -= mNext;
          mLvl += 1;
          mNext = Math.floor(Math.pow(mLvl, 2) * 100 + 400);
        }
        await client.query(
          "UPDATE user_skills SET xp = $1, level = $2, next_level_xp = $3 WHERE id = $4",
          [mXp, mLvl, mNext, row.id]
        );
      }
    }

    const userRes = await client.query(
      "SELECT xp, level, total_xp FROM users WHERE id::text = $1",
      [String(contract.userId)]
    );
    let { xp: gXp, level: gLvl, total_xp: gTotalXp } = userRes.rows[0];
    gTotalXp = (gTotalXp || 0) + totalXpGained;
    gXp     += totalXpGained;
    let gNext    = Math.floor(Math.pow(gLvl, 2) * 500 + 1000);
    let leveledUp = false;
    while (gXp >= gNext) {
      gXp   -= gNext;
      gLvl  += 1;
      gNext  = Math.floor(Math.pow(gLvl, 2) * 500 + 1000);
      leveledUp = true;
    }

    const newCredits = currentCredits + finalCredits;
    const newBw      = Math.max(0, bw - finalBwCost);

    const updatedUserRes = await client.query(
      `UPDATE users
       SET xp = $1, level = $2, current_level = $2, total_xp = $4,
           streak = streak + 1, system_credits = $5, current_bandwidth = $6
       WHERE id::text = $3 RETURNING *`,
      [gXp, gLvl, String(contract.userId), gTotalXp, newCredits, newBw]
    );

    const tierData = await client.query(
      "SELECT COALESCE(account_tier,0) AS account_tier, COALESCE(role,'FREE') AS role FROM users WHERE id = $1",
      [String(contract.userId)],
    );
    const { account_tier: dropTier, role: dropRole } = tierData.rows[0];

    const roll   = Math.random() * 100;
    const rarity = getTierRarity(roll, dropTier, dropRole);

    const possibleItems = lootTable.filter((i) => i.rarity === rarity);
    const droppedItem   = possibleItems[Math.floor(Math.random() * possibleItems.length)];

    let drop = null;
    if (droppedItem) {
      const invRes = await client.query(
        `INSERT INTO inventory (user_id, name, category, rarity, description, is_equipped)
         VALUES ($1, $2, $3, $4, $5, false) RETURNING id`,
        [contract.userId, droppedItem.name, droppedItem.type || "PERK",
         droppedItem.rarity, droppedItem.description || ""]
      );
      drop = { ...droppedItem, instanceId: invRes.rows[0].id };
    }

    await client.query(
      "UPDATE contracts SET status = 'SUCCESS' WHERE id::text = $1",
      [String(id)]
    );

    await client.query("COMMIT");

    res.json({
      success:        true,
      reward:         totalXpGained,
      credits_earned: finalCredits,
      xp_earned:      finalXpBonus,
      perk_active:    equippedName,
      user:           updatedUserRes.rows[0],
      drop,
      leveledUp,
      newLevel:       gLvl,
      system_state: {
        system_credits:    newCredits,
        current_bandwidth: newBw,
        max_bandwidth:     max_bw,
      },
    });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("CONTRACT_COMPLETION_ERROR:", err.message);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.post("/api/contracts/:id/fail", async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const contractRes = await client.query(
      "SELECT stake_amount, user_id, status FROM contracts WHERE id = $1",
      [id],
    );

    if (contractRes.rows.length === 0)
      return res.status(404).send("Mission not found");
    const { stake_amount, user_id, status } = contractRes.rows[0];

    if (status !== "ACTIVE") {
      await client.query("ROLLBACK");
      return res.status(400).send("Mission already processed");
    }

    await client.query("UPDATE contracts SET status = 'FAILED' WHERE id = $1", [
      id,
    ]);

    const userUpdate = await client.query(
      "UPDATE users SET xp = GREATEST(0, xp - $1), streak = 0 WHERE id = $2 RETURNING *",
      [stake_amount, user_id],
    );

    await client.query("COMMIT");
    res.json(userUpdate.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("ABORT_SEQUENCE_FAILED:", err);
    res.status(500).send("ABORT_SEQUENCE_FAILED");
  } finally {
    client.release();
  }
});

app.post("/skills/prestige", async (req, res) => {
  const { externalId, skillName } = req.body;

  try {
    const userRes = await pool.query(
      "SELECT id FROM users WHERE external_id = $1",
      [externalId],
    );
    if (userRes.rows.length === 0)
      return res.status(404).json({ error: "USER_NOT_FOUND" });
    const userId = userRes.rows[0].id;

    const result = await pool.query(
      `UPDATE user_skills us
       SET level = 1, xp = 0,
           prestige_level = COALESCE(us.prestige_level, 0) + 1,
           next_level_xp = 500
       FROM skills s
       WHERE us.skill_id = s.id
         AND us.user_id = $1
         AND s.name = $2
         AND us.level >= 99
       RETURNING us.*, s.name AS skill_name`,
      [userId, skillName],
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: "REQUIREMENTS_NOT_MET" });
    }

    res.json({ message: "PRESTIGE_COMPLETE", skill: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/v1/loot/roll", async (req, res) => {
  const { externalId } = req.body;

  try {
    const userRes = await pool.query(
      "SELECT id FROM users WHERE external_id = $1",
      [externalId],
    );
    if (userRes.rows.length === 0)
      return res.status(404).json({ error: "USER_NOT_FOUND" });
    const userId = userRes.rows[0].id;

    const roll = Math.random() * 100;
    let rarity = "Junk";
    if (roll > 99.5) rarity = "Mythic";
    else if (roll > 98) rarity = "Legendary";
    else if (roll > 90) rarity = "Epic";
    else if (roll > 75) rarity = "Rare";
    else if (roll > 40) rarity = "Uncommon";

    const possibleItems = lootTable.filter((i) => i.rarity === rarity);
    const item =
      possibleItems[Math.floor(Math.random() * possibleItems.length)];

    res.json({ item });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/inventory/scrap", async (req, res) => {
  const { userId, instanceId } = req.body;
  const client = await pool.connect();

  try {
    const itemCheck = await client.query(
      "SELECT id, rarity, name FROM inventory WHERE id = $1 AND user_id = $2",
      [instanceId, userId],
    );

    if (itemCheck.rows.length === 0) {
      return res.status(404).json({ error: "NO ITEM FOUND" });
    }

    const item = itemCheck.rows[0];

    if (item.rarity.toLowerCase() !== "junk") {
      return res.status(400).json({ error: "ONLY JUNK CAN BE RECYCLED!" });
    }

    await client.query("BEGIN");

    await client.query("DELETE FROM inventory where id = $1", [instanceId]);

    const scrapReward = 90;

    const userRes = await client.query(
      "SELECT xp, level, total_xp FROM users WHERE id = $1",
      [userId],
    );
    let { xp: gXp, level: gLvl, total_xp: gTotalXp } = userRes.rows[0];

    gTotalXp = (gTotalXp || 0) + scrapReward;
    gXp += scrapReward;
    let gNext = Math.floor(Math.pow(gLvl, 2) * 500 + 1000);

    while (gXp >= gNext) {
      gXp -= gNext;
      gLvl += 1;
      gNext = Math.floor(Math.pow(gLvl, 2) * 500 + 1000);
    }

    const userUpdate = await client.query(
      "UPDATE users SET xp = $1, level = $2, current_level = $2, total_xp = $4 WHERE id = $3 RETURNING *",
      [gXp, gLvl, userId, gTotalXp],
    );

    await client.query("COMMIT");

    res.json({
      success: true,
      message: `${item.name} SCRAPPED!`,
      reward: scrapReward,
      user: userUpdate.rows[0],
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("SCRAP ERROR:", err.message);
    res.status(500).json({ error: "SYSTEM FAILURE" });
  } finally {
    client.release();
  }
});

app.post("/api/inventory/equip", async (req, res) => {
  const { userId, instanceId } = req.body;

  const client = await pool.connect();
  try {
    const userRes = await client.query(
      `SELECT id, COALESCE(account_tier,0) AS account_tier, COALESCE(role,'FREE') AS role
       FROM users WHERE external_id = $1`,
      [userId],
    );
    if (userRes.rows.length === 0) throw new Error("USER_NOT_FOUND");
    const { id: internalId, account_tier: eTier, role: eRole } = userRes.rows[0];

    const slotLimit = eRole === "ADMIN" ? 999 : (TIER_PERK_SLOTS[eTier] ?? 1);

    const itemInfo = await client.query(
      "SELECT category, is_equipped FROM inventory WHERE id = $1 AND user_id = $2",
      [instanceId, internalId],
    );
    if (itemInfo.rows.length === 0) throw new Error("ITEM_NOT_FOUND_IN_INVENTORY");
    const { category, is_equipped: alreadyEquipped } = itemInfo.rows[0];

    await client.query("BEGIN");

    if (alreadyEquipped) {
      await client.query(
        "UPDATE inventory SET is_equipped = false WHERE id = $1 AND user_id = $2",
        [instanceId, internalId],
      );
    } else {
      const equippedCount = await client.query(
        "SELECT COUNT(*) FROM inventory WHERE user_id = $1 AND is_equipped = true",
        [internalId],
      );
      if (parseInt(equippedCount.rows[0].count) >= slotLimit) {
        await client.query("ROLLBACK");
        return res.status(403).json({
          code: "SLOT_LIMIT_REACHED",
          message: `You can only equip ${slotLimit} perk${slotLimit === 1 ? "" : "s"} on your current plan. Upgrade to unlock more slots!`,
          slot_limit: slotLimit,
        });
      }
      if (slotLimit === 1) {
        await client.query(
          "UPDATE inventory SET is_equipped = false WHERE user_id = $1",
          [internalId],
        );
      }
      await client.query(
        "UPDATE inventory SET is_equipped = true WHERE id = $1 AND user_id = $2",
        [instanceId, internalId],
      );
    }

    await client.query("COMMIT");

    const equippedRes = await client.query(
      "SELECT id FROM inventory WHERE user_id = $1 AND is_equipped = true",
      [internalId],
    );
    const equipped_ids = equippedRes.rows.map((r) => String(r.id));

    res.json({ success: true, equipped_ids });
  } catch (err) {
    if (client) await client.query("ROLLBACK");
    console.error("EQUIP ERROR:", err.message);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.get("/modules", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, subject, topic, duration, tier FROM learning_modules ORDER BY duration ASC",
    );
    res.json(result.rows);
  } catch (err) {
    console.error("DATABASE_ERROR:", err.message);
    res.status(500).json({ error: "COULD_NOT_FETCH_INTEL" });
  }
});

app.get("/api/inventory/:externalId", async (req, res) => {
  const { externalId } = req.params;
  try {
    const userRes = await pool.query(
      "SELECT id FROM users WHERE external_id = $1",
      [externalId],
    );

    if (userRes.rows.length === 0) {
      console.log(
        `NEW OPERATOR DETECTED: ${externalId}. Returning empty vault.`,
      );
      return res.json([]);
    }

    const result = await pool.query(
      "SELECT id AS \"instanceId\", name, rarity, category, description, is_equipped FROM inventory WHERE user_id = $1",
      [userRes.rows[0].id],
    );

    res.json(result.rows);
  } catch (err) {
    console.error("INVENTORY_FETCH_ERROR:", err.message);
    res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
  }
});

app.post("/api/inventory/claim", async (req, res) => {
  const { userId, item, equipNow } = req.body;
  console.log("1. Starting claim for User:", userId);

  try {
    const userRes = await pool.query(
      "SELECT id FROM users WHERE external_id = $1",
      [userId.toString()],
    );

    if (userRes.rows.length === 0) {
      console.error("2. FAILURE: No user found with external_id:", userId);
      return res.status(404).json({ error: "USER_NOT_FOUND_IN_DB" });
    }

    const internalId = userRes.rows[0].id;
    console.log("3. Internal ID found:", internalId);

    const newEntry = await pool.query(
      `INSERT INTO inventory (user_id, name, category, rarity, description, is_equipped) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [
        internalId,
        item.name,
        item.category || "PERK",
        item.rarity,
        item.description,
        equipNow,
      ],
    );

    if (equipNow) {
      await pool.query(
        "UPDATE inventory SET is_equipped = false WHERE user_id = $1 AND category = $2 AND id != $3",
        [internalId, item.category || "PERK", newEntry.rows[0].id],
      );
    }

    console.log("4. SUCCESS: Item added to inventory.");
    res.json({ success: true, item: newEntry.rows[0] });
  } catch (err) {
    console.error("CRITICAL_ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Stripe: create checkout session ────────────────────────────────────────
app.post("/payments/create-session", async (req, res) => {
  const { targetTier, userId } = req.body;

  if (!userId || ![1, 2].includes(Number(targetTier))) {
    return res.status(400).json({ error: "Invalid request — userId and targetTier (1 or 2) required." });
  }

  const tier = Number(targetTier);
  const PLANS = {
    1: { name: "Zenith Pro", description: "1.5× XP · 2 perk slots · Rain & Cyberpunk ambience · Better item drops", amount: 999  },
    2: { name: "Zenith Elite", description: "2× XP · 4 perk slots · All themes & audio · Legendary drops · No task cap", amount: 2499 },
  };
  const plan = PLANS[tier];

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: { name: plan.name, description: plan.description },
          unit_amount: plan.amount,
          recurring: { interval: "month" },
        },
        quantity: 1,
      }],
      subscription_data: {
        metadata: { userId, targetTier: String(tier) },
      },
      metadata: { userId, targetTier: String(tier) },
      success_url: `${process.env.FRONTEND_URL || "http://localhost:5173"}/?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${process.env.FRONTEND_URL || "http://localhost:5173"}/?payment=cancelled`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("[STRIPE] Session creation failed:", err.message);
    res.status(500).json({ error: err.message || "Failed to create checkout session." });
  }
});

app.listen(5000, () => console.log("ZENITH ENGINE ONLINE ON PORT 5000"));