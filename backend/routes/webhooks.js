const express = require("express");
const pool = require("../lib/db.js");
const { stripe } = require("../lib/clients.js");
const { pushUserPatch } = require("../lib/realtime.js");

// Stripe requires the raw, unparsed body to verify the webhook signature —
// this router must be mounted in server.js BEFORE app.use(express.json()),
// or the global JSON parser consumes the body first and breaks verification.
const stripeWebhookRouter = express.Router();

stripeWebhookRouter.post(
  "/payments/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET,
      );
    } catch (err) {
      console.error("[WEBHOOK] Signature verification failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    const applyTierUpgrade = async (userId, targetTier) => {
      if (!userId || !targetTier) return;
      const upgradeTier = Number(targetTier);
      const role = upgradeTier >= 2 ? "ELITE" : "PRO";
      const upgradeResult = await pool.query(
        "UPDATE users SET account_tier = $1, role = $2 WHERE external_id = $3 RETURNING id, username",
        [upgradeTier, role, userId],
      );
      if (upgradeResult.rowCount === 0)
        console.warn("[WEBHOOK] No user matched external_id:", userId);
      else {
        console.log(`[STRIPE] Upgraded ${upgradeResult.rows[0].username} → Tier ${upgradeTier} (${role})`);
        // Push tier change instantly to the connected client — no polling delay
        pushUserPatch(userId).catch(() => {});
      }
    };

    try {
      if (event.type === "checkout.session.completed") {
        const checkoutSession = event.data.object;
        const { userId, targetTier } = checkoutSession.metadata ?? {};
        console.log(
          "[WEBHOOK] checkout.session.completed — userId:",
          userId,
          "tier:",
          targetTier,
        );
        // Save Stripe customer ID so the billing portal can look it up later
        if (checkoutSession.customer && userId) {
          await pool.query(
            "UPDATE users SET stripe_customer_id = $1 WHERE external_id = $2",
            [checkoutSession.customer, userId],
          ).catch(saveErr => console.warn("[WEBHOOK] Could not save stripe_customer_id:", saveErr.message));
        }
        await applyTierUpgrade(userId, targetTier);
      } else if (event.type === "invoice.payment_succeeded") {
        const invoice = event.data.object;
        if (!invoice.subscription) return res.json({ received: true });
        const invoiceSub = await stripe.subscriptions.retrieve(invoice.subscription);
        const { userId, targetTier } = invoiceSub.metadata ?? {};
        await applyTierUpgrade(userId, targetTier);
      } else if (event.type === "customer.subscription.deleted") {
        const deletedSub = event.data.object;
        const { userId } = deletedSub.metadata ?? {};
        if (userId) {
          await pool.query(
            "UPDATE users SET account_tier = 0, role = 'FREE' WHERE external_id = $1",
            [userId],
          );
          console.log(
            `[STRIPE] Reverted ${userId} → Free tier (subscription cancelled)`,
          );
        }
      }
    } catch (dbErr) {
      console.error("[WEBHOOK] DB operation failed:", dbErr.message);
      return res.status(500).json({ error: "Database update failed." });
    }

    res.json({ received: true });
  },
);

// RevenueCat webhook — mounted normally, after express.json() is applied.
const revenuecatWebhookRouter = express.Router();

const APPLE_PRODUCT_ROLES = {
  "org.zenithapp.mobile.pro_monthly":   { role: "PRO",   accountTier: 1 },
  "org.zenithapp.mobile.elite_monthly": { role: "ELITE", accountTier: 2 },
};

revenuecatWebhookRouter.post("/webhooks/revenuecat", async (req, res) => {
  const webhookSecret = process.env.REVENUECAT_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.warn("[REVENUECAT] Webhook secret not configured — rejecting request");
    return res.status(503).json({ error: "WEBHOOK_NOT_CONFIGURED" });
  }
  if (req.headers.authorization !== `Bearer ${webhookSecret}`) {
    return res.status(401).json({ error: "UNAUTHORIZED" });
  }

  const { event } = req.body ?? {};
  if (!event?.type || !event?.app_user_id) {
    return res.status(400).json({ error: "INVALID_PAYLOAD" });
  }

  const clerkUserId = event.app_user_id;
  const eventType   = event.type;

  try {
    if (["INITIAL_PURCHASE", "RENEWAL", "PRODUCT_CHANGE", "UNCANCELLATION"].includes(eventType)) {
      // On PRODUCT_CHANGE, `product_id` is the product the subscriber switched FROM —
      // the product they switched TO is `new_product_id`. Every other event type here
      // only ever has `product_id`, so it's the correct fallback for those.
      const currentProductId = event.new_product_id ?? event.product_id;
      const mapping = APPLE_PRODUCT_ROLES[currentProductId];
      if (!mapping) {
        console.warn(`[REVENUECAT] Unknown product_id: ${currentProductId}`);
        return res.json({ received: true });
      }
      await pool.query(
        "UPDATE users SET role = $1, account_tier = $2 WHERE external_id = $3",
        [mapping.role, mapping.accountTier, clerkUserId],
      );
      console.log(`[REVENUECAT] ${eventType}: ${clerkUserId} → ${mapping.role}`);

    } else if (["EXPIRATION", "BILLING_ISSUE"].includes(eventType)) {
      await pool.query(
        "UPDATE users SET role = 'FREE', account_tier = 0 WHERE external_id = $1",
        [clerkUserId],
      );
      console.log(`[REVENUECAT] ${eventType}: ${clerkUserId} → FREE`);
    }
    // CANCELLATION is intentionally ignored — the subscription is still active
    // until the period ends. Access is revoked only on EXPIRATION.
  } catch (dbError) {
    console.error("[REVENUECAT] DB update failed:", dbError.message);
    return res.status(500).json({ error: "DATABASE_ERROR" });
  }

  res.json({ received: true });
});

module.exports = { stripeWebhookRouter, revenuecatWebhookRouter };
