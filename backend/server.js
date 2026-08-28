require("dotenv").config();

// ── Startup env validation ────────────────────────────────────────────────────
// Catch missing required variables before any request is served.
// In production this exits the process immediately with a clear error.
const REQUIRED_ENV = [
  "DATABASE_URL",
  "CLERK_SECRET_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "FRONTEND_URL",
  "ALLOWED_ORIGINS",
  "VAPID_EMAIL",
  "VAPID_PUBLIC_KEY",
  "VAPID_PRIVATE_KEY",
  "ADMIN_SECRET",
  "RESEND_API_KEY",
];
const missing = REQUIRED_ENV.filter((envKey) => !process.env[envKey]);
if (missing.length > 0) {
  if (process.env.NODE_ENV === "production") {
    console.error("[STARTUP] Missing required env vars:", missing.join(", "));
    process.exit(1);
  } else {
    console.warn("[STARTUP] Missing env vars (non-fatal in dev):", missing.join(", "));
  }
}

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const pool = require("./lib/db.js");
const { globalLimiter } = require("./lib/rateLimiters.js");
const { runMigrations } = require("./db/migrations.js");

const app = express();

// Tell Express to trust the X-Forwarded-For header from the first proxy hop.
// Without this, rate limiting keys off the proxy IP (127.0.0.1) and treats
// the entire internet as a single client — making rate limits useless.
app.set("trust proxy", 1);

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "")
  .split(",").map(rawOrigin => rawOrigin.trim()).filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error(`CORS blocked: ${origin}`));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Admin-Token"],
  credentials: true,
}));

// Security headers — HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, etc.
// CSP disabled here; configure separately once all asset origins are locked down.
app.use(helmet({ contentSecurityPolicy: false }));

app.use(globalLimiter);

const { stripeWebhookRouter, revenuecatWebhookRouter } = require("./routes/webhooks.js");

// Mounted before express.json() — Stripe needs the raw, unparsed body.
app.use(stripeWebhookRouter);

app.use(express.json());

// Mounted after express.json() — RevenueCat sends normal parsed JSON.
app.use(revenuecatWebhookRouter);

if (process.env.NODE_ENV !== "production") {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}


// Bootstraps/updates the schema on startup — guarded so requiring this file
// as a module (tests) never touches the live database.
if (require.main === module) {
  runMigrations(pool);
}



app.use(require("./routes/users.js"));
app.use(require("./routes/tasks.js"));
app.use(require("./routes/achievements.js"));
app.use(require("./routes/subscription.js"));
app.use(require("./routes/misc.js"));
app.use(require("./routes/payments.js"));
app.use(require("./routes/stats.js"));
app.use(require("./routes/shop.js"));
app.use(require("./routes/admin.js"));
app.use(require("./routes/realtime.js"));
app.use(require("./routes/pushSubscriptions.js"));
app.use(require("./routes/clientError.js"));

// Guarded so requiring this file as a module (tests) never starts real cron jobs.
if (require.main === module) require("./cron").registerCronJobs();

app.use(require("./routes/contact.js"));
// ─────────────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
if (require.main === module) {
  app.listen(PORT, () => console.log(`ZENITH ENGINE ONLINE ON PORT ${PORT}`));
}
