const express = require("express");
const pool = require("../lib/db.js");
const { requireAuth } = require("../lib/auth.js");
const { mutationLimiter, searchLimiter } = require("../lib/rateLimiters.js");
const { isReservedUsername, isValidUsernameFormat } = require("../lib/validation.js");

const router = express.Router();

router.patch("/api/username", requireAuth, mutationLimiter, async (req, res) => {
  const { username } = req.body;
  const externalId = req.auth.userId;

  if (!isValidUsernameFormat(username)) {
    return res.status(400).json({ error: "INVALID_USERNAME_FORMAT" });
  }
  if (isReservedUsername(username)) {
    return res.status(400).json({ error: "USERNAME_RESERVED" });
  }

  try {
    const existingRes = await pool.query(
      "SELECT id FROM users WHERE LOWER(username) = LOWER($1) AND external_id != $2",
      [username, externalId],
    );
    if (existingRes.rows.length > 0) {
      return res.status(409).json({ error: "USERNAME_TAKEN" });
    }

    const updateRes = await pool.query(
      "UPDATE users SET username = $1, has_set_username = true WHERE external_id = $2 RETURNING id, username",
      [username, externalId],
    );
    if (updateRes.rows.length === 0) {
      return res.status(404).json({ error: "USER_NOT_FOUND" });
    }

    res.json({ username: updateRes.rows[0].username });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "USERNAME_TAKEN" });
    }
    console.error("SET_USERNAME_ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get("/api/users/search", requireAuth, searchLimiter, async (req, res) => {
  const query = (req.query.q || "").trim();
  const externalId = req.auth.userId;

  if (query.length < 2) {
    return res.json([]);
  }

  try {
    const selfRes = await pool.query("SELECT id FROM users WHERE external_id = $1", [externalId]);
    if (selfRes.rows.length === 0) return res.status(404).json({ error: "USER_NOT_FOUND" });
    const selfId = selfRes.rows[0].id;

    const resultsRes = await pool.query(
      `SELECT users.id, users.username, users.level,
              friendships.status AS friendship_status,
              friendships.requester_id = $1 AS requested_by_me
       FROM users
       LEFT JOIN friendships
         ON (friendships.requester_id = $1 AND friendships.addressee_id = users.id)
         OR (friendships.addressee_id = $1 AND friendships.requester_id = users.id)
       WHERE users.has_set_username = true
         AND users.id != $1
         AND LOWER(users.username) LIKE LOWER($2) || '%'
       ORDER BY users.username ASC
       LIMIT 20`,
      [selfId, query],
    );

    res.json(resultsRes.rows);
  } catch (err) {
    console.error("USER_SEARCH_ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post("/api/friends/request", requireAuth, mutationLimiter, async (req, res) => {
  const { userId: targetId } = req.body;
  const externalId = req.auth.userId;

  if (!targetId) return res.status(400).json({ error: "MISSING_USER_ID" });

  try {
    const selfRes = await pool.query("SELECT id FROM users WHERE external_id = $1", [externalId]);
    if (selfRes.rows.length === 0) return res.status(404).json({ error: "USER_NOT_FOUND" });
    const selfId = selfRes.rows[0].id;

    if (String(selfId) === String(targetId)) {
      return res.status(400).json({ error: "CANNOT_FRIEND_SELF" });
    }

    const targetRes = await pool.query(
      "SELECT id FROM users WHERE id = $1 AND has_set_username = true",
      [targetId],
    );
    if (targetRes.rows.length === 0) return res.status(404).json({ error: "USER_NOT_FOUND" });

    const reverseRes = await pool.query(
      `UPDATE friendships SET status = 'ACCEPTED'
       WHERE requester_id = $1 AND addressee_id = $2 AND status = 'PENDING'
       RETURNING id, status`,
      [targetId, selfId],
    );
    if (reverseRes.rows.length > 0) {
      return res.json(reverseRes.rows[0]);
    }

    const insertRes = await pool.query(
      `INSERT INTO friendships (requester_id, addressee_id, status)
       VALUES ($1, $2, 'PENDING')
       ON CONFLICT (requester_id, addressee_id) DO NOTHING
       RETURNING id, status`,
      [selfId, targetId],
    );
    if (insertRes.rows.length === 0) {
      return res.status(409).json({ error: "REQUEST_ALREADY_EXISTS" });
    }

    res.status(201).json(insertRes.rows[0]);
  } catch (err) {
    console.error("FRIEND_REQUEST_ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post("/api/friends/:id/accept", requireAuth, mutationLimiter, async (req, res) => {
  const { id } = req.params;
  const externalId = req.auth.userId;

  try {
    const selfRes = await pool.query("SELECT id FROM users WHERE external_id = $1", [externalId]);
    if (selfRes.rows.length === 0) return res.status(404).json({ error: "USER_NOT_FOUND" });
    const selfId = selfRes.rows[0].id;

    const updateRes = await pool.query(
      `UPDATE friendships SET status = 'ACCEPTED'
       WHERE id = $1 AND addressee_id = $2 AND status = 'PENDING'
       RETURNING id`,
      [id, selfId],
    );
    if (updateRes.rows.length === 0) {
      return res.status(404).json({ error: "REQUEST_NOT_FOUND" });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("FRIEND_ACCEPT_ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post("/api/friends/:id/decline", requireAuth, mutationLimiter, async (req, res) => {
  const { id } = req.params;
  const externalId = req.auth.userId;

  try {
    const selfRes = await pool.query("SELECT id FROM users WHERE external_id = $1", [externalId]);
    if (selfRes.rows.length === 0) return res.status(404).json({ error: "USER_NOT_FOUND" });
    const selfId = selfRes.rows[0].id;

    const deleteRes = await pool.query(
      `DELETE FROM friendships
       WHERE id = $1 AND addressee_id = $2 AND status = 'PENDING'
       RETURNING id`,
      [id, selfId],
    );
    if (deleteRes.rows.length === 0) {
      return res.status(404).json({ error: "REQUEST_NOT_FOUND" });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("FRIEND_DECLINE_ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.delete("/api/friends/:id", requireAuth, mutationLimiter, async (req, res) => {
  const { id } = req.params;
  const externalId = req.auth.userId;

  try {
    const selfRes = await pool.query("SELECT id FROM users WHERE external_id = $1", [externalId]);
    if (selfRes.rows.length === 0) return res.status(404).json({ error: "USER_NOT_FOUND" });
    const selfId = selfRes.rows[0].id;

    const deleteRes = await pool.query(
      `DELETE FROM friendships
       WHERE id = $1 AND (requester_id = $2 OR addressee_id = $2) AND status = 'ACCEPTED'
       RETURNING id`,
      [id, selfId],
    );
    if (deleteRes.rows.length === 0) {
      return res.status(404).json({ error: "FRIENDSHIP_NOT_FOUND" });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("UNFRIEND_ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get("/api/friends", requireAuth, async (req, res) => {
  const externalId = req.auth.userId;

  try {
    const selfRes = await pool.query("SELECT id FROM users WHERE external_id = $1", [externalId]);
    if (selfRes.rows.length === 0) return res.status(404).json({ error: "USER_NOT_FOUND" });
    const selfId = selfRes.rows[0].id;

    const friendsRes = await pool.query(
      `SELECT friendships.id, friendships.status, friendships.requester_id,
              CASE WHEN friendships.requester_id = $1 THEN addressee.id ELSE requester.id END AS "userId",
              CASE WHEN friendships.requester_id = $1 THEN addressee.username ELSE requester.username END AS username,
              CASE WHEN friendships.requester_id = $1 THEN addressee.level ELSE requester.level END AS level
       FROM friendships
       JOIN users AS requester ON requester.id = friendships.requester_id
       JOIN users AS addressee ON addressee.id = friendships.addressee_id
       WHERE friendships.requester_id = $1 OR friendships.addressee_id = $1`,
      [selfId],
    );

    const accepted = friendsRes.rows.filter(row => row.status === "ACCEPTED");
    const incoming = friendsRes.rows.filter(row => row.status === "PENDING" && row.requester_id !== selfId);
    const outgoing = friendsRes.rows.filter(row => row.status === "PENDING" && row.requester_id === selfId);

    res.json({ friends: accepted, incoming_requests: incoming, outgoing_requests: outgoing });
  } catch (err) {
    console.error("FRIENDS_LIST_ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get("/api/leaderboard/weekly", requireAuth, async (req, res) => {
  const externalId = req.auth.userId;

  try {
    const selfRes = await pool.query("SELECT id FROM users WHERE external_id = $1", [externalId]);
    if (selfRes.rows.length === 0) return res.status(404).json({ error: "USER_NOT_FOUND" });
    const selfId = selfRes.rows[0].id;

    const leaderboardRes = await pool.query(
      `WITH friend_ids AS (
         SELECT CASE WHEN requester_id = $1 THEN addressee_id ELSE requester_id END AS id
         FROM friendships
         WHERE status = 'ACCEPTED' AND (requester_id = $1 OR addressee_id = $1)
         UNION
         SELECT $1
       )
       SELECT users.id, users.username, users.level,
              COALESCE(SUM(daily_stats.focus_minutes), 0) AS weekly_minutes
       FROM friend_ids
       JOIN users ON users.id = friend_ids.id
       LEFT JOIN daily_stats
         ON daily_stats.user_id = friend_ids.id
         AND daily_stats.date >= date_trunc('week', NOW())::date
       GROUP BY users.id, users.username, users.level
       ORDER BY weekly_minutes DESC`,
      [selfId],
    );

    res.json(leaderboardRes.rows.map(row => ({
      id:             row.id,
      username:       row.username,
      level:          row.level,
      weekly_minutes: parseInt(row.weekly_minutes, 10),
      is_self:        row.id === selfId,
    })));
  } catch (err) {
    console.error("LEADERBOARD_ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
