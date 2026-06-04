# Zenith

A productivity app that turns focus sessions into a live progression system. Log what you're working on, pick a skill, set a duration, and earn XP and credits when you finish. Stay consistent and the rewards compound.

---

## What it is

Zenith is built for people who struggle to start and stay on task. Instead of a plain to-do list, every session you complete feeds into a game layer — XP, skill levels, credits, loot drops, and a streak multiplier that stacks the longer you stay consistent.

---

## Core features

- **Session economy** — complete focus sessions to earn XP and credits. Longer sessions pay more. Quit early and the reward gets cut.
- **12 skills** — choose a skill before each session (Logic Flow, Resolve, Vitality, Creativity and more). Each skill levels up independently with its own XP bar and prestige system.
- **Neural Clock** — rewards shift with the time of day. Late nights (12AM–7AM) pay half. Peak hours (8–11AM) give the best XP. A hyperfocus window opens at 10PM.
- **Daily challenges** — a rotating challenge each day (complete sessions, log minutes, train different skills). Claim 50 CR on completion.
- **Loot drops** — finishing a session has a chance to drop a cosmetic item. Rarity scales with your subscription tier.
- **Shop** — spend credits on themes that change the entire sky backdrop. PRO and ELITE unlock additional themes.
- **Solar backdrop** — the background gradient shifts through dawn, day, evening, sunset, and night in real time based on your local clock.
- **Prestige system** — hit level 99 in a skill to prestige it. Resets to level 1 but grants a permanent +10% XP bonus to that skill.

---

## Stack

| Layer    | Tech                                      |
|----------|-------------------------------------------|
| Mobile   | React Native + Expo                       |
| Website  | React + Vite                              |
| Backend  | Node.js + Express + PostgreSQL            |
| Auth     | Clerk                                     |
| Payments | Stripe                                    |
| Email    | Resend                                    |
| Hosting  | Railway (backend) + Vercel (website)      |

---

## Subscription tiers

| Tier  | Price     | Multiplier | Loot rate |
|-------|-----------|------------|-----------|
| Free  | —         | 1×         | 25%       |
| PRO   | €4.99/mo  | 1.5×       | 50%       |
| ELITE | €9.99/mo  | 2×         | 75%       |

Paying buys comfort and capacity — never a hard advantage over free users.

---

## Project structure

```
zenith-mobile/     React Native app (Expo)
website-react/     Marketing + account site
backend/           Node.js API + PostgreSQL
```

---

© 2026 Zenith. All rights reserved.
