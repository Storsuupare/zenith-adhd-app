const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log("--- INCOMING REQUEST ---");
  console.log("Method:", req.method);
  console.log("Path:", req.path);
  console.log("Body:", req.body);
  next();
});

const pool = new Pool({
  connectionString:
    "postgresql://postgres:Katlamac123%3F@localhost:5432/zenith_io_db",
});

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
      "SELECT * FROM users WHERE external_id = $1",
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
  
  console.log(`[ZENITH DEBUG] Attempting completion for ID: ${id} (Type: ${typeof id})`);

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // FIX: We cast the columns themselves in the JOIN to stop the type error
    const contractRes = await client.query(
      `SELECT c.id, c.task_name AS "taskName", c.duration_minutes AS "durationMinutes",
              c.stake_amount AS "stakeAmount", c.user_id AS "userId", c.status,
              c.skill_id AS "skillId"
       FROM contracts c
       JOIN users u ON c.user_id::text = u.id::text
       WHERE c.id::text = $1
       AND u.external_id::text = $2`,
      [String(id), String(externalId)]
    );

    const contract = contractRes.rows[0];

    if (!contract) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "MISSION_NOT_FOUND" });
    }

    const baseAmount = parseInt(contract.stakeAmount || 0);
    const xpGained = Math.floor(baseAmount * 1.5);

    // Give XP only to the skill attached to this contract
    console.log(`[ZENITH] skillId on contract: ${contract.skillId}`);
    if (contract.skillId) {
      const skillRow = await client.query(
        "SELECT id, xp, level, next_level_xp FROM user_skills WHERE user_id = $1 AND skill_id = $2",
        [contract.userId, contract.skillId]
      );
      console.log(`[ZENITH] user_skills rows found: ${skillRow.rows.length}`);
      if (skillRow.rows.length > 0) {
        const row = skillRow.rows[0];
        let mXp = parseInt(row.xp) + xpGained;
        let mLvl = parseInt(row.level);
        let mNext = parseInt(row.next_level_xp);
        while (mXp >= mNext) {
          mXp -= mNext;
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
    gTotalXp = (gTotalXp || 0) + xpGained;
    gXp += xpGained;
    let gNext = Math.floor(Math.pow(gLvl, 2) * 500 + 1000);
    let leveledUp = false;
    while (gXp >= gNext) {
      gXp -= gNext;
      gLvl += 1;
      gNext = Math.floor(Math.pow(gLvl, 2) * 500 + 1000);
      leveledUp = true;
    }

    const updatedUserRes = await client.query(
      "UPDATE users SET xp = $1, level = $2, current_level = $2, total_xp = $4, streak = streak + 1 WHERE id::text = $3 RETURNING *",
      [gXp, gLvl, String(contract.userId), gTotalXp]
    );

    // Roll a loot drop
    const roll = Math.random() * 100;
    let rarity = "Junk";
    if (roll > 99.5) rarity = "Mythic";
    else if (roll > 98) rarity = "Legendary";
    else if (roll > 90) rarity = "Epic";
    else if (roll > 75) rarity = "Rare";
    else if (roll > 40) rarity = "Uncommon";

    const possibleItems = lootTable.filter((i) => i.rarity === rarity);
    const droppedItem = possibleItems[Math.floor(Math.random() * possibleItems.length)];

    let drop = null;
    if (droppedItem) {
      const invRes = await client.query(
        `INSERT INTO inventory (user_id, name, category, rarity, description, is_equipped)
         VALUES ($1, $2, $3, $4, $5, false) RETURNING id`,
        [
          contract.userId,
          droppedItem.name,
          droppedItem.type || "PERK",
          droppedItem.rarity,
          droppedItem.description || "",
        ]
      );
      drop = { ...droppedItem, instanceId: invRes.rows[0].id };
    }

    await client.query(
      "UPDATE contracts SET status = 'SUCCESS' WHERE id::text = $1",
      [String(id)]
    );

    await client.query("COMMIT");
    console.log(`[ZENITH] MISSION SUCCESS: ${id}`);

    res.json({
      success: true,
      reward: xpGained,
      user: updatedUserRes.rows[0],
      drop,
      leveledUp,
      newLevel: gLvl,
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
      "SELECT id FROM users WHERE external_id = $1",
      [userId],
    );
    if (userRes.rows.length === 0) throw new Error("USER_NOT_FOUND");
    const internalId = userRes.rows[0].id;

    const itemInfo = await client.query(
      "SELECT category FROM inventory WHERE id = $1 AND user_id = $2",
      [instanceId, internalId],
    );

    if (itemInfo.rows.length === 0)
      throw new Error("ITEM_NOT_FOUND_IN_INVENTORY");

    const category = itemInfo.rows[0].category;

    await client.query("BEGIN");
    await client.query(
      "UPDATE inventory SET is_equipped = false WHERE user_id = $1 AND category = $2",
      [internalId, category],
    );
    const updateRes = await client.query(
      "UPDATE inventory SET is_equipped = true WHERE id = $1 AND user_id = $2 RETURNING *",
      [instanceId, internalId],
    );
    await client.query("COMMIT");

    res.json({ success: true, item: updateRes.rows[0] });
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

app.listen(5000, () => console.log("ZENITH ENGINE ONLINE ON PORT 5000"));