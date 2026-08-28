const express = require("express");
const pool = require("../lib/db.js");
const { requireAuth } = require("../lib/auth.js");
const { bonusLimiter } = require("../lib/rateLimiters.js");
const { sseClients, sseTokens, presenceMap, broadcastPresence, pushUserPatch } = require("../lib/realtime.js");

const router = express.Router();

// ── Daily challenge reward ─────────────────────────────────────────────────────
// Awards 150 CR once per calendar day (UTC). Challenge completion is tracked
// client-side (localStorage), so we can't verify it — but the once-per-day
// gate makes this economically insignificant even if someone calls it directly.
router.post("/api/daily-challenge/claim", requireAuth, bonusLimiter, async (req, res) => {
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
    res.json({ credits_earned: 150, system_credits: result.rows[0].system_credits });
  } catch (err) {
    console.error("DAILY_CHALLENGE_CLAIM_ERROR:", err.message);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

// Issues a one-time UUID that the client exchanges for an SSE connection.
// Keeps the Clerk JWT out of URLs (and therefore out of nginx/proxy access logs).
router.post("/api/stream-token", requireAuth, (req, res) => {
  const { randomUUID } = require("crypto");
  const token = randomUUID();
  const expiresAt = Date.now() + 30_000; // valid for 30 seconds
  sseTokens.set(token, { userId: req.auth.userId, expiresAt });
  setTimeout(() => sseTokens.delete(token), 30_000); // guaranteed cleanup
  res.json({ token });
});

router.get("/api/stream/:externalId", async (req, res) => {
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

module.exports = router;
