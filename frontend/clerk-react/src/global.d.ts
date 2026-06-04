/// <reference types="vite/client" />

// ── Vite env vars ────────────────────────────────────────────────────────────
// Add every VITE_ variable here so import.meta.env is fully typed.
interface ImportMetaEnv {
  readonly VITE_CLERK_PUBLISHABLE_KEY: string;
  readonly VITE_STRIPE_PUBLISHABLE_KEY: string;
  readonly VITE_API_BASE: string;
  readonly VITE_PYTHON_API_BASE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// ── Clerk helpers ─────────────────────────────────────────────────────────────
// Re-export canonical Clerk types so components can import from one place
// without repeating the deep package path.
//
// Usage pattern that eliminates "Object is possibly null/undefined":
//
//   const { user, isLoaded } = useUser();
//   if (!isLoaded || !user) return null;   // ← user is UserResource after this
//   user.firstName                          // ← no error
//
// Or with optional chaining for read-only display:
//   user?.firstName ?? 'Guest'
//
export type { UserResource, OrganizationResource } from '@clerk/clerk-react';

// ── Stripe helpers ────────────────────────────────────────────────────────────
// loadStripe() returns Promise<Stripe | null>.
// Pattern to eliminate "Object is possibly null":
//
//   const stripe = await loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
//   if (!stripe) throw new Error('Stripe failed to load');
//   await stripe.redirectToCheckout({ sessionId });   // ← no error
//
export type { Stripe, StripeElements, StripeElement } from '@stripe/stripe-js';

// ── React event shorthands ────────────────────────────────────────────────────
// Eliminates implicit-any on inline event handlers.
// Instead of: (e) => ...  write: (e: ChangeEvt) => ...
import type { ChangeEvent, FormEvent, MouseEvent } from 'react';
export type ChangeEvt<T = HTMLInputElement> = ChangeEvent<T>;
export type FormEvt<T = HTMLFormElement> = FormEvent<T>;
export type ClickEvt<T = HTMLButtonElement> = MouseEvent<T>;

// ── Utility ───────────────────────────────────────────────────────────────────
// NonNullable shorthand — useful for component props derived from Clerk/Stripe.
export type Defined<T> = NonNullable<T>;
