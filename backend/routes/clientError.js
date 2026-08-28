const express = require("express");
const { verifyToken } = require("../lib/auth.js");
const { captureException } = require("../analytics.js");

const router = express.Router();

// ── Client error reporting ────────────────────────────────────────────────────

const MAX_ERROR_MESSAGE_LENGTH = 2000;
const MAX_ERROR_STACK_LENGTH   = 8000;
const ALLOWED_ERROR_PLATFORMS  = new Set(["ios", "android", "web"]);

router.post("/api/client-error", async (req, res) => {
  const { message, stack, platform, screen, appVersion } = req.body ?? {};

  if (typeof message !== "string" || message.trim().length === 0) {
    return res.status(400).json({ error: "message is required" });
  }

 
  let externalId = null;
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    try {
      const payload = await verifyToken(header.slice(7), {
        secretKey: process.env.CLERK_SECRET_KEY,
        clockSkewInMs: 60000,
      });
      externalId = payload.sub;
    } catch {
    }
  }

  const error = new Error(message.slice(0, MAX_ERROR_MESSAGE_LENGTH));
  if (typeof stack === "string") {
    error.stack = stack.slice(0, MAX_ERROR_STACK_LENGTH);
  }

  captureException(error, externalId, {
    platform:   ALLOWED_ERROR_PLATFORMS.has(platform) ? platform : "unknown",
    screen:     typeof screen === "string" ? screen.slice(0, 64) : undefined,
    appVersion: typeof appVersion === "string" ? appVersion.slice(0, 32) : undefined,
  });

  res.json({ ok: true });
});

module.exports = router;
