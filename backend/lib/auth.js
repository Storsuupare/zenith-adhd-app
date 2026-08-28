const { verifyToken } = require("@clerk/backend");
const pool = require("./db.js");

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
      clockSkewInMs: 60000,
    });
    req.auth = { userId: payload.sub };
    next();
  } catch (tokenError) {
    console.error("[AUTH] Token verification failed:", tokenError.message);
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

module.exports = { verifyToken, requireAuth, requireAdminToken, requireAdmin };
