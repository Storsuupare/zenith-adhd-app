const { PostHog } = require("posthog-node");

/**
 * Product analytics, server-side.
 *
 * Events fire from the backend rather than the app for two reasons: the values
 * being measured (XP, credits, drop rarity, tier) are calculated here and would
 * have to be trusted from the client otherwise, and changing what we measure is
 * then a backend deploy instead of an App Store review cycle.
 *
 * Everything here is fire-and-forget. Analytics must never fail a user request,
 * so every call swallows its own errors, and the whole module no-ops when
 * POSTHOG_API_KEY is unset — which keeps local development and CI clean without
 * needing a key or a network connection.
 */

const POSTHOG_API_KEY = process.env.POSTHOG_API_KEY;
const POSTHOG_HOST    = process.env.POSTHOG_HOST || "https://eu.i.posthog.com";

const client = POSTHOG_API_KEY
  ? new PostHog(POSTHOG_API_KEY, { host: POSTHOG_HOST, flushAt: 20, flushInterval: 10000 })
  : null;

// Free-text the user wrote is never sent. Task titles in particular are private
// content for this audience ("call doctor about meds") and would turn an analytics
// vendor into a processor of health-adjacent personal data.
//
// Matched as case-insensitive substrings rather than exact keys, so `taskTitle`,
// `session_title` and `Note` are all caught rather than only the literal spellings
// someone thought to list.
const BANNED_KEY_FRAGMENTS = [
  "title", "name", "email", "note", "description", "content",
  "message", "body", "text", "label", "comment",
];

// Every legitimate property here is short and enum-like — a skill ("Environment"),
// a rarity ("Legendary"), an achievement key ("skills_all_10"). Free text is long.
// This is the backstop that catches user content hiding under a key nobody thought
// to ban, which is the failure mode a name-based list can't cover on its own.
const MAX_STRING_LENGTH = 64;

function assertNoUserContent(properties, path = "") {
  for (const [key, value] of Object.entries(properties)) {
    const fullPath = path ? `${path}.${key}` : key;
    const lowerKey = key.toLowerCase();

    if (BANNED_KEY_FRAGMENTS.some(fragment => lowerKey.includes(fragment))) {
      throw new Error(`analytics: refusing to send user-authored field "${fullPath}"`);
    }
    if (typeof value === "string" && value.length > MAX_STRING_LENGTH) {
      throw new Error(
        `analytics: refusing to send "${fullPath}" — ${value.length} chars looks like free text, not an identifier`,
      );
    }
    // Nested objects would otherwise smuggle a title straight past the key check.
    if (value && typeof value === "object") {
      assertNoUserContent(value, fullPath);
    }
  }
}

/**
 * @param {string} externalId  Clerk user ID — pseudonymous, already the identifier
 *                             used everywhere else, and not an email or a name.
 */
function track(externalId, event, properties = {}) {
  if (!client || !externalId) return;
  try {
    assertNoUserContent(properties);
    client.capture({ distinctId: externalId, event, properties });
  } catch (err) {
    console.error("[analytics] capture failed:", err.message);
  }
}

/**
 * Attaches non-identifying traits to a user so events can be segmented by them
 * later — tier, level, streak length. No names, no emails.
 */
function identify(externalId, traits = {}) {
  if (!client || !externalId) return;
  try {
    assertNoUserContent(traits);
    client.identify({ distinctId: externalId, properties: traits });
  } catch (err) {
    console.error("[analytics] identify failed:", err.message);
  }
}

async function shutdownAnalytics() {
  if (!client) return;
  try {
    await client.shutdown();
  } catch { /* nothing useful to do while the process is exiting */ }
}

module.exports = {
  track,
  identify,
  shutdownAnalytics,
  analyticsEnabled: Boolean(client),
  // Exported for tests: this guard is the only thing standing between a future
  // careless `trackEvent` call and shipping someone's private task titles.
  assertNoUserContent,
};
