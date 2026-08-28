const express = require("express");
const pool = require("../lib/db.js");
const { pushUserPatch } = require("../lib/realtime.js");

const router = express.Router();

router.get("/modules", async (req, res) => {
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

// Dev-only: resets strike count for a user.
if (process.env.NODE_ENV !== "production") {
  router.post("/api/debug/clear-ban", async (req, res) => {
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

module.exports = router;
