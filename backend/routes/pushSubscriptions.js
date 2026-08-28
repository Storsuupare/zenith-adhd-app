const express = require("express");
const pool = require("../lib/db.js");
const { requireAuth } = require("../lib/auth.js");

const router = express.Router();

// ── Push notification subscription ───────────────────────────────────────────
router.post("/api/push/vapid-key", (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

router.post("/api/push/subscribe", requireAuth, async (req, res) => {
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

router.delete("/api/push/unsubscribe", requireAuth, async (req, res) => {
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
router.post("/api/push/register-token", requireAuth, async (req, res) => {
  const { token, timezone } = req.body;
  if (typeof token !== "string" || !token.startsWith("ExponentPushToken[")) {
    return res.status(400).json({ error: "Invalid Expo push token" });
  }

  // Basic IANA timezone validation — reject anything with suspicious characters
  const safeTimezone = (typeof timezone === "string" && /^[A-Za-z/_\-+0-9]{1,64}$/.test(timezone))
    ? timezone
    : "UTC";

  const tokenClient = await pool.connect();
  try {
    await tokenClient.query("BEGIN");

    const userRes = await tokenClient.query(
      "SELECT id FROM users WHERE external_id = $1",
      [req.auth.userId],
    );
    if (!userRes.rows.length) {
      await tokenClient.query("ROLLBACK");
      return res.status(404).json({ error: "User not found" });
    }

    const userId = userRes.rows[0].id;

    await tokenClient.query(
      `INSERT INTO expo_push_tokens (user_id, token)
       VALUES ($1, $2)
       ON CONFLICT (token) DO NOTHING`,
      [userId, token],
    );

    // Keep the user's timezone up to date (device may change timezone)
    await tokenClient.query(
      "UPDATE users SET timezone = $1 WHERE id = $2",
      [safeTimezone, userId],
    );

    await tokenClient.query("COMMIT");
    res.json({ ok: true });
  } catch (err) {
    await tokenClient.query("ROLLBACK");
    console.error("register-token error:", err.message);
    res.status(500).json({ error: "Failed to save token" });
  } finally {
    tokenClient.release();
  }
});

module.exports = router;
