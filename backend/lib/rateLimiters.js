const rateLimit = require("express-rate-limit");

// ── Rate limiters ─────────────────────────────────────────────────────────────
const createRateLimiter = (windowMin, max) => rateLimit({
  windowMs: windowMin * 60 * 1000,
  max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too Many Requests! Try again later." },
});
const globalLimiter   = createRateLimiter(15, 300);  // 300 req per 15 min — general abuse guard
const mutationLimiter = createRateLimiter(60, 60);   // 60 mutations per hour — task/loot/prestige/inventory
const shopLimiter     = createRateLimiter(15, 10);   // 10 purchases per 15 min — shop anti-spam
const bonusLimiter    = createRateLimiter(60, 5);    // 5 attempts per hour — daily bonus anti-spam
const adminLimiter    = createRateLimiter(15, 20);   // 20 req per 15 min — admin panel
const paymentLimiter  = createRateLimiter(60, 5);    // 5 Stripe session creations per hour — prevents API abuse
const syncLimiter      = createRateLimiter(60, 60);  // 60 syncs per hour — Restore Purchases, kept off the shared mutation pool
const searchLimiter    = createRateLimiter(15, 20);

module.exports = {
  createRateLimiter,
  globalLimiter,
  mutationLimiter,
  shopLimiter,
  bonusLimiter,
  adminLimiter,
  paymentLimiter,
  syncLimiter,
  searchLimiter,
};
