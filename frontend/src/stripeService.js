/**
 * Calls the backend to create a Stripe Checkout session, then redirects
 * the browser to the hosted Checkout page via window.location.href.
 * stripe.redirectToCheckout() was removed in Stripe.js 2025-09-30.
 */
export async function initiateCheckout(targetTier, userId) {
  const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/payments/create-session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ targetTier, userId }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Server error ${res.status} — check backend console.`);
  }

  const { url } = await res.json();
  if (!url) throw new Error("No checkout URL returned from server.");

  window.location.href = url;
}
