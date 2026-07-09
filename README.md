# Zenith

A productivity app that turns focus sessions into a live progression system — XP, skills, loot drops, and a streak multiplier that compounds the longer you stay consistent. Built for people who struggle to start and stay on task.

Live at [zenithapp.org](https://zenithapp.org) · Mobile on the App Store

---

## Stack

| Layer       | Technology                                                  |
|-------------|-------------------------------------------------------------|
| Mobile      | React Native 0.76 + Expo SDK 54                             |
| Web         | React 18 + Vite 5                                           |
| Backend     | Node.js 20 + Express 4 + PostgreSQL 16                      |
| Auth        | Clerk (JWT-based, webhook-verified role sync)               |
| Payments    | Stripe (web subscriptions) + Apple IAP via RevenueCat (mobile) |
| Email       | Resend                                                      |
| Hosting     | Railway (API + DB) + Vercel (web)                           |

---

## Architecture

```
zenith-mobile/      React Native client (Expo managed workflow)
website-react/      Marketing site + web billing portal
backend/            Express REST API + PostgreSQL
```

The backend is a single Express service sitting in front of PostgreSQL. All writes go through parameterised queries — no ORM, no query builder, full control over the SQL surface. The mobile and web clients talk to the same API; auth context flows through Clerk JWTs, validated server-side on every protected route.

Payments are split: Stripe handles web subscriptions, Apple IAP handles mobile purchases. A webhook listener on the backend reconciles both into the same `role` column in PostgreSQL and keeps the Clerk public metadata in sync. The client reads tier from the Clerk session, so there is no extra DB round-trip to gate features.

---

## Security design

- **Auth**: every protected route validates the Clerk JWT using the Clerk SDK — no custom JWT parsing.
- **SQL injection**: 100% parameterised queries throughout the backend. No string interpolation into SQL.
- **Idempotency**: the daily challenge claim route uses `WHERE daily_challenge_claimed_date < CURRENT_DATE` as the update predicate, making double-claim impossible at the database level — no application-level lock needed.
- **Secrets**: all credentials live in `.env` / Railway environment variables. Nothing is hardcoded. The repository contains no private keys, Stripe secrets, or database URLs.
- **Webhook verification**: Stripe webhooks are verified using the Stripe signature header before any data is trusted.
- **Rate limiting**: planned before public launch — express-rate-limit on auth and payment endpoints.

---

## Core systems

### Session economy

Every completed focus session earns XP and a flat credit reward based on duration (5 min → 25 CR, 15 min → 60 CR, 30 min → 120 CR, 60 min → 220 CR, 90 min → 320 CR, 120 min → 420 CR). Sessions also have a flat 25% chance to drop a loot item regardless of tier — paying users get the same odds, not better ones.

### Neural Clock

Rewards shift with the time of day. A 12AM–5AM REDZONE halves XP (Guardian Logic). Peak hours give the best multiplier. A late-night hyperfocus window opens at 10PM. This is not gamification decoration — it encodes a real sleep hygiene signal into the economy.

### Skill system

12 independent skills (Logic Flow, Resolve, Vitality, Creativity, and more), each with its own XP bar from level 1–99. XP required per level follows `100 × level^1.6` — roughly 6.7M total XP to max a skill, tuned for ~18 months of regular use. PRO users can Prestige at 99: the skill resets to 1 and grants a permanent +10% XP multiplier to that skill. Prestige stacks.

### Streak system

A streak multiplier accumulates with consecutive days of completed sessions. The multiplier feeds into skill XP calculation alongside the prestige and time-of-day multipliers. Missing a day resets the streak. PRO users get a streak shield — a one-time absorber that burns on a missed day instead of resetting the streak. ELITE users have their shield auto-replenish after use.

### Daily challenges

A rotating daily challenge (e.g. "complete 3 sessions", "train two different skills"). Completing it unlocks a 150 CR claim. The claim button disappears immediately on tap via optimistic local state — the DB prevents double-claim independently.

### Loot drops + shop

Finishing a session has a 25% chance to drop a cosmetic item (rarity: Common → Legendary). Credits are spent in the shop on sky themes that change the entire visual backdrop. All themes are available to every user regardless of tier.

### Solar backdrop

The app background renders a real-time sky gradient that transitions through dawn, sunrise, day, golden hour, sunset, dusk, and night based on the device clock. Credits-tier themes use subtler gradients; PRO/ELITE themes are visually distinct.

---

## Monetization

| Tier  | Price     | Task slots | History depth | Prestige | Streak shield       | CSV export |
|-------|-----------|------------|---------------|----------|---------------------|------------|
| FREE  | —         | 5          | 7 days        | —        | —                   | —          |
| PRO   | €4.99/mo  | 15         | 6 months      | Yes      | One-time            | Yes        |
| ELITE | €9.99/mo  | Unlimited  | All time      | Yes      | Auto-replenishes    | Yes        |

Paying buys depth and capacity — never a gameplay advantage. Drop rates, XP speed, and loot rarity are identical across all tiers. No pay-to-win mechanics.

Billing is hybrid: web subscriptions go through Stripe (full portal, invoice history, cancel anytime), mobile through Apple IAP. Backend reconciles both into a single `role` field.

---

© 2026 Zenith. All rights reserved.
