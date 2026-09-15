// Generates a friend-invite code — a short string one person reads or types
// from another app (a text message, a share sheet) into Zenith to add a
// friend without knowing their exact username. The whole point of this
// feature is removing recall friction, so getting this function right
// matters more than it looks: a code that's easy to mistype defeats the
// feature it's supposed to fix.
//
// The redeem endpoint (routes/social.js) uppercases whatever the user types
// before comparing it against invite_code, so this must return an
// uppercase-only code for that direct match to work.
// Excludes 0/O, 1/I/L — the classic misread-when-handwritten-or-read-aloud
// set. 31 characters ^ 6 length is ~887M combinations, far more than this
// app will ever need; the caller's retry-on-collision handles the rest.
const SAFE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;

function generateInviteCode() {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += SAFE_CHARS[Math.floor(Math.random() * SAFE_CHARS.length)];
  }
  return code;
}

module.exports = { generateInviteCode };
