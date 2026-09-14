const express = require("express");
const pool = require("../lib/db.js");
const { requireAuth } = require("../lib/auth.js");
const { presenceMap } = require("../lib/realtime.js");

const router = express.Router();

// ── Focus Together ────────────────────────────────────────────────────────────
// presenceMap (lib/realtime.js) is an in-memory snapshot of who currently has
// an active, unpaused session running — reading it here is a synchronous Map
// lookup, no database round trip needed.
//
// Free for every tier — seeing whether a friend you already know is currently
// focusing is baseline social functionality, not an outcome advantage. There is
// deliberately no anonymous/global version of this: a live "N strangers focusing
// right now" counter reads as "this app has no users" the moment it's 0, which
// is exactly the wrong first impression for a smaller app. Friends-only sidesteps
// that entirely, since a quiet friend circle is a normal, unremarkable state.
router.get("/api/presence/friends", requireAuth, async (req, res) => {
  const externalId = req.auth.userId;
  try {
    const selfRes = await pool.query("SELECT id FROM users WHERE external_id = $1", [externalId]);
    if (!selfRes.rows.length) return res.status(404).json({ error: "USER_NOT_FOUND" });
    const selfId = selfRes.rows[0].id;

    const friendsRes = await pool.query(
      `WITH friend_ids AS (
         SELECT CASE WHEN requester_id = $1 THEN addressee_id ELSE requester_id END AS id
         FROM friendships
         WHERE status = 'ACCEPTED' AND (requester_id = $1 OR addressee_id = $1)
       )
       SELECT users.external_id, users.username
       FROM friend_ids
       JOIN users ON users.id = friend_ids.id`,
      [selfId],
    );

    const usernameByExternalId = new Map(friendsRes.rows.map(row => [row.external_id, row.username]));

    // Skill/duration/tier are included for everyone here and left to the
    // client to decide how much to render (PRO+ shows the full detail, Free
    // shows just the name) — same tier-in-the-UI convention already used for
    // ArchivesScreen's history depth, rather than branching this query on tier.
    const sessions = [...presenceMap.entries()]
      .filter(([friendExternalId, entry]) => !entry.paused && usernameByExternalId.has(friendExternalId))
      .map(([friendExternalId, entry]) => ({
        username:  usernameByExternalId.get(friendExternalId),
        skillName: entry.skillName,
        duration:  entry.duration,
        startedAt: entry.startedAt,
        tier:      entry.tier,
      }));

    res.json({ count: sessions.length, sessions });
  } catch (err) {
    console.error("PRESENCE_FRIENDS_ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
