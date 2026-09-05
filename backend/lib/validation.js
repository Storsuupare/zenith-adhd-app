// Terms that impersonate Zenith staff or the brand.
// Checked case-insensitively as substrings after stripping separators.
// Unicode homoglyph normalization handles lookalike characters (ᴢenith, z̷ēnith etc.)
const RESERVED_USERNAME_PATTERNS = [
  
  "zenith",
 
  "admin", "administrator",
  "mod", "moderator", "moderation",
  "staff", "official", "founder", "owner",
  "developer", "sysadmin",
  "verified", "security", "helpdesk", "support",
  "bot", "automod",
  "system",
];

function isReservedUsername(username) {
  // Normalize Unicode to strip homoglyphs (ᴢ → z, é → e etc.)
  const normalized = username
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")   // strip combining diacritics
    .toLowerCase()
    .replace(/[\s_\-\.0@$1!]/g, "");   // strip separators + common leet substitutes
  return RESERVED_USERNAME_PATTERNS.some(pattern =>
    normalized.includes(pattern.replace(/[\s_\-\.]/g, ""))
  );
}

const USERNAME_FORMAT = /^[a-zA-Z0-9_]{3,20}$/;
function isValidUsernameFormat(username) {
  return typeof username === "string" && USERNAME_FORMAT.test(username);
}

const VALID_DURATIONS = new Set([5, 15, 30, 60, 90, 120]);
const VALID_SKILLS    = new Set([
  "LOGIC FLOW","VITALITY","NUTRITION","ENVIRONMENT","MOMENTUM",
  "LEARNING","LOGISTICS","CREATIVITY","DISCIPLINE","PRESENCE","RECOVERY","RESOLVE",
]);

function escapeHtml(raw) {
  return String(raw)
    .replace(/&/g,  "&amp;")
    .replace(/</g,  "&lt;")
    .replace(/>/g,  "&gt;")
    .replace(/"/g,  "&quot;")
    .replace(/'/g,  "&#39;");
}

module.exports = { isReservedUsername, isValidUsernameFormat, VALID_DURATIONS, VALID_SKILLS, escapeHtml };
