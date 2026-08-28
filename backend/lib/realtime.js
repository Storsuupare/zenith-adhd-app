const pool = require("./db.js");

const sseClients = new Map();

// Anonymous presence: externalId → { sessionId, skillName, duration, startedAt, tier }
const presenceMap = new Map();

// One-time SSE auth tokens: uuid → { userId, expiresAt }
// Clerk JWTs must not live in query-params (logged by proxies/nginx).
// Frontend requests a short-lived UUID here, uses it once to open the stream.
const sseTokens = new Map();

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
      `SELECT user_skills.id, user_skills.skill_id, skills.name AS skill_name, user_skills.xp AS current_xp,
              user_skills.level AS current_level, user_skills.next_level_xp, user_skills.prestige_level,
              user_skills.prestige_boost_until
       FROM user_skills
       JOIN skills ON user_skills.skill_id = skills.id
       WHERE user_skills.user_id = $1
       ORDER BY skills.name`,
      [userDataResult.rows[0].id],
    );

    const data = { ...userDataResult.rows[0], mastery: masteryResult.rows };
    stream.write(`data: ${JSON.stringify({ type: "user_patch", data })}\n\n`);
  } catch { /* stream already closed or DB hiccup — silent */ }
}

module.exports = { sseClients, presenceMap, sseTokens, broadcastPresence, pushUserPatch };
