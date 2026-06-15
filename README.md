# Zenith

A productivity app that turns focus sessions into a live progression system — XP, skills, loot drops, and a streak multiplier that compounds the longer you stay consistent. Built for people who struggle to start and stay on task.

Live at [zenithapp.org](https://zenithapp.org) · Mobile on the App Store

---

## Stack

| Layer       | Technology                                                  |
|-------------|-------------------------------------------------------------|
| Mobile      | React Native 0.76 + Expo SDK 52                             |
| Web         | React 18 + Vite 5                                           |
| Backend     | Node.js 20 + Express 4 + PostgreSQL 16                      |
| Auth        | Clerk (JWT-based, webhook-verified role sync)               |
| Payments    | Stripe (web subscriptions) + Apple IAP (mobile)             |
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

Every completed focus session earns XP and has a chance to drop a loot item. Credits come exclusively from loot drops — never from session completion — so the reward curve stays unpredictable and dopamine-relevant.

Drop probability is tier-gated: FREE 25%, PRO 50%, ELITE 75%. Paying users get more *chances*, not more *guaranteed* outcomes. The free tier has access to identical rarity tables.

### Neural Clock

Rewards shift with the time of day. A 12AM–5AM REDZONE halves XP (Guardian Logic). Peak hours give the best multiplier. A late-night hyperfocus window opens at 10PM. This is not gamification decoration — it encodes a real sleep hygiene signal into the economy.

### Skill system

12 independent skills (Logic Flow, Resolve, Vitality, Creativity, and more), each with its own XP bar from level 1–99. At 99, prestige resets the skill to level 1 and grants a permanent +10% XP multiplier to that skill. Prestige stacks.

### Streak system

A streak multiplier accumulates with consecutive days of completed sessions. The multiplier feeds into skill XP calculation alongside the prestige and time-of-day multipliers. Missing a day resets the streak — no streak shields, no soft resets.

### Shatter

PRO+ users can split a 120-minute session into 4 × 30-minute sub-tasks. Each sub-task is tracked independently, preventing the paralysis that comes from staring at a single two-hour block.

### Daily challenges

A rotating daily challenge (e.g. "complete 3 sessions", "train two different skills"). Completing it unlocks a 50 CR claim. The claim button disappears immediately on tap via optimistic local state — the DB prevents double-claim independently.

### Loot drops + shop

Finishing a session has a tier-based chance to drop a cosmetic item (rarity: Common → Legendary). Credits are spent in the shop on sky themes that change the entire visual backdrop. PRO and ELITE unlock additional theme categories.

### Solar backdrop

The app background renders a real-time sky gradient that transitions through dawn, sunrise, day, golden hour, sunset, dusk, and night based on the device clock. Credits-tier themes use subtler gradients; PRO/ELITE themes are visually distinct.

---

## Monetization

| Tier  | Price     | XP multiplier | Loot drop rate |
|-------|-----------|---------------|----------------|
| FREE  | —         | 1×            | 25%            |
| PRO   | €4.99/mo  | 1.5×          | 50%            |
| ELITE | €9.99/mo  | 2×            | 75%            |

Paying buys comfort and capacity — never a hard advantage. Free users progress on the same rarity tables. No paywalled XP, no experience gates, no pay-to-win mechanics.

Billing is hybrid: web subscriptions go through Stripe (full portal, invoice history, cancel anytime), mobile through Apple IAP. Backend reconciles both into a single `role` field.

---

© 2026 Zenith. All rights reserved.
