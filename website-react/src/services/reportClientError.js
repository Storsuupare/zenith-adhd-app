const BACKEND_URL = import.meta.env.VITE_BACKEND_URL

// Fire-and-forget by design — a failure reporting a crash must never itself
// throw, or a network hiccup during an actual crash turns one problem into two.
// Reports to our own backend rather than a PostHog client SDK directly, so
// error tracking stays inside the same "server decides what leaves" boundary
// as every other analytics event.
export function reportClientError(payload) {
  fetch(`${BACKEND_URL}/api/client-error`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ platform: 'web', ...payload }),
  }).catch(() => {})
}
