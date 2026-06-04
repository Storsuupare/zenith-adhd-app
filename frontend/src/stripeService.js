import { createCheckoutSession } from './services/api';

export async function initiateCheckout(targetTier) {
  const res  = await createCheckoutSession(targetTier);
  const { url } = res.data;
  if (!url) throw new Error("No checkout URL returned from server.");
  window.location.href = url;
}
