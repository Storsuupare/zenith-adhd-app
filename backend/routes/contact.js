const express = require("express");
const rateLimit = require("express-rate-limit");
const { resend } = require("../lib/clients.js");
const { escapeHtml } = require("../lib/validation.js");

const router = express.Router();

// ── Contact form ─────────────────────────────────────────────────────────────


router.post("/contact", rateLimit({ windowMs: 15 * 60 * 1000, max: 5 }), async (req, res) => {
  const { email, topic, message } = req.body;
  if (!email || !message) return res.status(400).json({ error: "Missing fields" });
  if (typeof email !== "string"   || email.length   > 320) return res.status(400).json({ error: "Invalid email" });
  if (typeof message !== "string" || message.length > 5000) return res.status(400).json({ error: "Message too long" });
  if (topic  && (typeof topic !== "string" || topic.length > 200)) return res.status(400).json({ error: "Topic too long" });

  const safeEmail   = escapeHtml(email);
  const safeTopic   = topic ? escapeHtml(topic) : "—";
  const safeMessage = escapeHtml(message).replace(/\n/g, "<br/>");

  try {
    await resend.emails.send({
      from: "Zenith <noreply@zenithapp.org>",
      to:   "contact@zenithapp.org",
      replyTo: email,
      subject: `[Zenith Contact] ${safeTopic}`,
      html: `
        <p><strong>From:</strong> ${safeEmail}</p>
        <p><strong>Topic:</strong> ${safeTopic}</p>
        <hr/>
        <p>${safeMessage}</p>
      `,
    });
    res.json({ ok: true });
  } catch (err) {
    console.error("Resend error:", err);
    res.status(500).json({ error: "Failed to send" });
  }
});

module.exports = router;
