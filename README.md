# Zenith

A productivity app that turns focus sessions into a live progression system — XP, skills, loot drops, and streaks that compound the longer you stay consistent. Built for people who struggle to start and stay on task.

Live at [zenithapp.org](https://zenithapp.org) · Mobile on the App Store (Live 2026/08/27)

---

## Stack

| Layer       | Technology                                                   |
|-------------|--------------------------------------------------------------|
| Mobile      | React Native 0.81 + Expo SDK 54                              |
| Web         | React 18 + Vite                                              |
| Backend     | Node.js 22 + Express 4 + PostgreSQL 16                       |
| Auth        | Clerk (JWT, verified server-side on every protected route)   |
| Payments    | Apple IAP via RevenueCat (live) · Stripe (implemented, dormant) |
| Native iOS  | Swift — WidgetKit widgets, ActivityKit Live Activities       |
| Analytics   | PostHog (EU region), server-side events only                 |
| Email       | Resend                                                       |
| Hosting     | Railway (API + DB) + Vercel (web)                            |
| CI          | GitHub Actions — Jest, build and typecheck gates             |

---

## Architecture

```
zenith-mobile/      React Native client (Expo managed workflow)
website-react/      Marketing site + web billing portal
backend/            Express REST API + PostgreSQL
ios/                Swift widget + Live Activity extensions
```

The backend is a single Express service in front of PostgreSQL. All writes go through parameterised queries — no ORM, no query builder, full control over the SQL surface. Mobile and web clients talk to the same API; auth flows through Clerk JWTs validated server-side on every protected route.

The economy is deliberately server-authoritative. XP, credits, loot rolls and streak state are all computed on the backend — the client submits a request to complete a session and receives the result. A modified client cannot alter a balance, because it never calculates one.

---

## Security design

- **Auth**: every protected route validates the Clerk JWT via the Clerk SDK. No custom JWT parsing.
- **IDOR**: user-scoped queries join on `external_id = req.auth.userId` rather than trusting any client-supplied identifier. Identity is read from the verified token, never the request body.
- **SQL injection**: parameterised queries throughout. No string interpolation into SQL.
- **Rate limiting**: six independent limiters scoped by operation — global abuse guard, mutations, shop purchases, daily bonus claims, admin routes, and payment session creation — rather than one blanket limit.
- **Idempotency**: the daily challenge claim uses `WHERE daily_challenge_claimed_date < CURRENT_DATE` as its update predicate, making a double claim impossible at the database level with no application lock.
- **Transactions**: session completion runs in a single transaction, with `SAVEPOINT` isolating streak-milestone processing so a failure there cannot roll back an already-earned session.
- **Secrets**: all credentials live in `.env` or Railway environment variables. The repository contains no keys, tokens, or database URLs.
- **Webhooks**: Stripe webhooks are signature-verified with `constructEvent` before any payload is trusted.
- **Headers**: Helmet on the API; HSTS, nosniff, frame-deny, Referrer-Policy and Permissions-Policy on the web front end.
- **Analytics privacy**: events are emitted server-side and carry only numbers and short enums — duration, skill, rarity, tier. A guard rejects any property whose name suggests user-authored content, recurses into nested objects, and refuses strings over 64 characters on the assumption that free text is not an identifier. Task titles are the user's own words and never leave the server. Covered by tests.
- **Error tracking**: routed through PostHog. Backend failures are captured server-side via `captureException`; mobile and web report client-side errors to `/api/client-error`, which validates and truncates the message/stack before forwarding — the client never talks to PostHog directly.

---

## Core systems

### Session economy

A completed session pays XP plus a fixed credit reward by duration (5 min → 25 CR, 15 → 60, 30 → 120, 60 → 220, 90 → 320, 120 → 420). Sessions have a flat 25% chance to drop loot, which pays credits by rarity: Junk 50, Uncommon 150, Rare 350, Epic 700, Legendary 1,500, Mythic 3,500. Drop odds are identical for every tier.

### Neural Clock

Rewards shift with time of day. A 12AM–5AM REDZONE halves rewards, an 8–11AM peak window pays ×1.25 XP, and a 10PM–midnight hyperfocus window pays ×1.5. This encodes a sleep-hygiene signal into the economy rather than treating time as decoration. One exception: a prestiged skill is immune to REDZONE on its own XP specifically — the session's base reward still halves, but that skill's XP doesn't.

### Skill system

12 independent skills — Resolve, Logic Flow, Creativity, Discipline, Vitality, Momentum, Nutrition, Logistics, Presence, Recovery, Learning, Environment — each with its own XP bar from level 1 to 99, following `100 × level^1.6`. Any user can Prestige at 99, on any tier: the skill resets to level 1, permanently immune to that skill's own REDZONE penalty from then on, plus a stacking +10% XP multiplier. Prestige stacks, and pays a flat one-time credit reward — deliberately not scaling with prestige level, since the perk is the point, not the currency.

### Streak system

Consecutive days of completed sessions build a streak, which pays a flat credit bonus and unlocks milestone rewards at 7, 14, 30, 60 and 100 days. Missing a day resets it. PRO users get a streak shield that absorbs one missed day; ELITE shields replenish automatically.

### Loot and shop

Credits are spent in the shop on sky themes that change the entire visual backdrop, and on consumables — Streak Rescue (1,500 CR) and Extra Loot Pull (750 CR). Every theme is purchasable by every tier; only the streak shield is tier-exclusive.

### Achievements

26 achievements across sessions, focus time, streaks, skills, time-of-day rhythm and collection, evaluated server-side against lifetime stats when a session completes. Definitions live in code and are served by the API rather than stored in a table — adding one is a backend deploy, not an App Store release, and it avoids the schema-drift problem a definitions table creates.

Wording is deliberately retroactive — "Completed 50 sessions", never "Complete 50 sessions to unlock". The same data framed as a target turns the screen into a chore list, which is the most common reason this audience abandons an app.

Evaluation runs inside the session-completion transaction but behind a `SAVEPOINT`, so a failure in a bonus system can never roll back the XP, credits and loot the session actually earned.

### iOS widgets

Home Screen and Lock Screen widgets built with WidgetKit, plus an ActivityKit Live Activity that tracks a running session from the Dynamic Island. Written in Swift as native extensions rather than through a bridge.

### Solar backdrop

The background renders a live sky that transitions through dawn, day, golden hour, dusk and night against the device clock, with weather overlays from Open-Meteo. Animation is restricted to `transform` and `opacity` — no filters, no canvas — to hold 60fps on low-end devices.

---

## Monetization

| Tier  | Price     | Task slots | History depth | Prestige | Streak shield    | CSV export |
|-------|-----------|------------|---------------|----------|------------------|------------|
| FREE  | —         | 5          | 7 days        | Yes      | —                | —          |
| PRO   | €4.99/mo  | 15         | 6 months      | Yes      | One-time         | Yes        |
| ELITE | €9.99/mo  | Unlimited  | All time      | Yes      | Auto-replenishes | Yes        |

Paying buys capacity and depth, never an outcome. Loot drop odds, rarity weights, cosmetics and Prestige are identical across every tier — a free account and an Elite account roll from the same table and hit the same ceiling. Prestige was PRO-gated at launch; it was reopened to every tier because gating a mastery reward behind a paywall put exactly the most engaged users — the ones who'd earned it — in front of a paywall at the worst possible moment to show them one.

Achievements are open to every tier. All 26 are evaluated server-side against lifetime stats, unlock on the same thresholds regardless of plan, pay the same loot rarity, and are fully attainable on a free account — including "Second Ascent," which requires prestiging a skill.

---

## Known limitations

Kept here deliberately — these are known, not overlooked.

- **Single-instance assumptions.** Scheduled jobs run via `node-cron` inside the web process, SSE clients are held in an in-memory `Map`, and rate limiting uses an in-memory store. All three are correct for one instance and break on two: duplicate notifications, dropped live updates, and per-process rate limits. Fixing them means Redis for leader election, pub/sub and a shared limiter store.
- **Test coverage is thin.** Jest covers the reward math (`calculateStake`, `getNeuralMult`, achievement evaluation). API routes have no integration tests.
- **Schema migrations are ad-hoc.** Tables and columns are created via `CREATE TABLE IF NOT EXISTS` / `ALTER TABLE ... IF NOT EXISTS` at boot. Idempotent and simple, but there is no migration history and no rollback path.
- **Accessibility is partial.** Reduce Motion is respected throughout (`useReducedMotion`, used across 9 components). VoiceOver labelling covers Dashboard, Session and Settings; Shop, Achievements, Archives and onboarding are not yet labelled.

---

© 2026 Zenith. All rights reserved.
