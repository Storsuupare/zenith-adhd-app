const express = require("express");
const pool = require("../lib/db.js");
const { stripe } = require("../lib/clients.js");
const { requireAuth } = require("../lib/auth.js");
const { paymentLimiter } = require("../lib/rateLimiters.js");

const router = express.Router();

// ── Stripe: create checkout session ────────────────────────────────────────
router.post("/payments/create-session", requireAuth, paymentLimiter, async (req, res) => {
  const { targetTier } = req.body;
  const userId = req.auth.userId;

  if (!userId || ![1, 2].includes(Number(targetTier))) {
    return res
      .status(400)
      .json({
        error: "Invalid request — userId and targetTier (1 or 2) required.",
      });
  }

  const reqTier = Number(targetTier);
  const PLANS = {
    1: {
      name: "Zenith PRO",
      description:
        "1.5× XP + credits · 15 task slots · 120 min sessions · 2× loot drop rate · Cobalt & Amber themes",
      amount: 499,
      currency: "eur",
    },
    2: {
      name: "Zenith ELITE",
      description:
        "2× XP + credits · Unlimited task slots · 120 min sessions · 3× loot drop rate · All themes unlocked",
      amount: 999,
      currency: "eur",
    },
  };
  const plan = PLANS[reqTier];

  try {
    const stripeSess = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          price_data: {
            currency: plan.currency,
            product_data: { name: plan.name, description: plan.description },
            unit_amount: plan.amount,
            recurring: { interval: "month" },
          },
          quantity: 1,
        },
      ],
      subscription_data: {
        metadata: { userId, targetTier: String(reqTier) },
      },
      metadata: { userId, targetTier: String(reqTier) },
      success_url: `${process.env.FRONTEND_URL}/payment/success`,
      cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`,
    });

    res.json({ url: stripeSess.url });
  } catch (err) {
    console.error("[STRIPE] Session creation failed:", err.message);
    res
      .status(500)
      .json({ error: err.message || "Failed to create checkout session." });
  }
});




// ── Stripe: open billing portal ────────────────────────────────────────────
// Creates a Stripe Customer Portal session for PRO/ELITE users so they can
// cancel, change plan, or update payment details without contacting support.
// Customer ID is looked up from the DB — never trusted from the client.
router.post("/payments/create-portal-session", requireAuth, paymentLimiter, async (req, res) => {
  const clerkId = req.auth.userId;

  try {
    const userRes = await pool.query(
      "SELECT stripe_customer_id, email_address, role FROM users WHERE external_id = $1",
      [clerkId],
    );
    if (!userRes.rows.length) return res.status(404).json({ error: "USER_NOT_FOUND" });

    const { stripe_customer_id, email_address, role } = userRes.rows[0];

    if (role === "FREE") {
      return res.status(403).json({ error: "NO_ACTIVE_SUBSCRIPTION" });
    }

    let customerId = stripe_customer_id;

    // Fallback for users who subscribed before customer_id was saved to the DB.
    // Look them up in Stripe by email and backfill for future requests.
    if (!customerId) {
      const stripeCustomers = await stripe.customers.list({ email: email_address, limit: 1 });
      if (!stripeCustomers.data.length) {
        return res.status(404).json({ error: "STRIPE_CUSTOMER_NOT_FOUND" });
      }
      customerId = stripeCustomers.data[0].id;
      await pool.query(
        "UPDATE users SET stripe_customer_id = $1 WHERE external_id = $2",
        [customerId, clerkId],
      ).catch(() => {});
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer:   customerId,
      return_url: `${process.env.FRONTEND_URL}/account`,
    });

    res.json({ url: portalSession.url });
  } catch (portalErr) {
    console.error("[STRIPE PORTAL] Failed:", portalErr.message);
    res.status(500).json({ error: "PORTAL_SESSION_FAILED" });
  }
});

module.exports = router;
