import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import SolarBackdrop from '../components/SolarBackdrop.jsx'
import Nav from '../components/Nav.jsx'
import Footer from '../components/Footer.jsx'
import { useSEO } from '../hooks/useSEO.js'

const FEATURES = [
  { icon: '▶', title: 'Session System',      desc: 'Every task is a timed contract. Complete it, earn XP and real loot drops.' },
  { icon: '◎', title: 'Skill Mastery',       desc: '12 skills that level up as you work. Prestige at the ceiling for permanent perks — open to every tier.' },
  { icon: '◈', title: 'Loot Drops',          desc: 'Finish a session and roll for a credit drop. Rare, Epic, Legendary — real randomness.' },
  { icon: '▲', title: 'Neural Clock',        desc: 'Time-based multipliers that reward your natural focus rhythm and punish late nights.' },
]

const TIERS = [
  {
    id:      'free',
    name:    'FREE',
    price:   '€0',
    period:  '',
    perks: [
      'Unlimited focus sessions',
      'All 12 skills, full progression to level 99',
      'Prestige at level 99 — permanent perks, no paywall',
      'Loot drops — identical odds to every other tier',
      'Every cosmetic theme in the shop',
      '5 active tasks at once · 7 days of history',
    ],
    cta:     'Start free',
    variant: 'free',
  },
  {
    id:      'pro',
    name:    'PRO',
    badge:   'MOST POPULAR',
    price:   '€4.99',
    period:  '/mo',
    perks: [
      'Everything in Free',
      '15 active tasks at once · 6 months of history',
      'Streak Shield, absorbs one missed day',
      'CSV export',
    ],
    cta:     'Get PRO',
    variant: 'pro',
  },
  {
    id:      'elite',
    name:    'ELITE',
    price:   '€9.99',
    period:  '/mo',
    perks: [
      'Everything in PRO',
      'Unlimited active tasks',
      'Full history, forever',
      'Streak Shield auto-replenishes — no re-earning it',
    ],
    cta:     'Get ELITE',
    variant: 'elite',
  },
]

const FAQ = [
  {
    q: "I've tried every productivity app. Why would this one be different?",
    a: "Most apps assume motivation is the problem. Zenith assumes it isn't — it assumes your brain needs an external feedback loop. Every session gives you XP, skill levels, and a loot drop to roll. The loop runs on completion, not on willpower.",
  },
  {
    q: 'Is Zenith actually free?',
    a: 'Yes. Free users get unlimited sessions, all 12 skills, loot drops, every cosmetic theme, and the full progression system, Prestige included. PRO and ELITE unlock capacity — more active tasks, longer history, CSV export, Streak Shield — not outcomes. You can hit the ceiling on free.',
  },
  {
    q: 'What happens if I miss a day?',
    a: 'Your streak resets. Your XP, skill levels, and credits stay. Missing a day is a streak problem, not a wipeout. Streak Rescue items in the shop let you protect a streak if that matters to you.',
  },
  {
    q: 'What happens if I quit a session early?',
    a: "You lose the XP and credits for that session. No other penalty. One quit doesn't break your streak — but if quitting becomes the habit, your skill levels will show it.",
  },
  {
    q: 'Does paying give you an actual advantage?',
    a: "No. Every account earns identical XP, loot rates, and skill progression — including Prestige at level 99, which is open to every tier. PRO and ELITE add Streak Shield and more capacity (task slots, history, CSV export). Paying buys room to grow, never an outcome you couldn't reach for free.",
  },
]


function useScrollReveal() {
  const ref = useRef(null)
  useEffect(() => {
    const els = document.querySelectorAll('[data-reveal]')
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('visible')
            observer.unobserve(e.target)
          }
        })
      },
      { threshold: 0.15 }
    )
    els.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])
  return ref
}

const SOFTWARE_APPLICATION_SCHEMA = {
  '@context':       'https://schema.org',
  '@type':          'SoftwareApplication',
  name:             'Zenith',
  applicationCategory: 'ProductivityApplication',
  operatingSystem:  'iOS',
  description:      'Turn daily tasks into XP, loot drops, and real momentum. The gamified productivity system built for how your brain actually works.',
  url:              'https://zenithapp.org',
  offers: [
    { '@type': 'Offer', name: 'Free',  price: '0',    priceCurrency: 'EUR' },
    { '@type': 'Offer', name: 'Pro',   price: '4.99', priceCurrency: 'EUR' },
    { '@type': 'Offer', name: 'Elite', price: '9.99', priceCurrency: 'EUR' },
  ],
}

const FAQ_SCHEMA = {
  '@context': 'https://schema.org',
  '@type':    'FAQPage',
  mainEntity: FAQ.map(item => ({
    '@type': 'Question',
    name:    item.q,
    acceptedAnswer: { '@type': 'Answer', text: item.a },
  })),
}

export default function HomePage() {
  useScrollReveal()
  useSEO({
    title:       'Zenith — Your Brain Has a Skill Tree',
    description: 'Turn daily tasks into XP, loot drops, and real momentum. The gamified productivity system built for how your brain actually works.',
    path:        '/',
  })

  return (
    <>
      <script type="application/ld+json">{JSON.stringify(SOFTWARE_APPLICATION_SCHEMA)}</script>
      <script type="application/ld+json">{JSON.stringify(FAQ_SCHEMA)}</script>
      <SolarBackdrop />
      <Nav />

      {/* Hero */}
      <section className="section hero-section">
        <div className="section-inner hero-inner">
          <div className="hero-content">
            <span className="eyebrow hero-anim hero-anim--1">◈ GAMIFIED PRODUCTIVITY</span>
            <h1 className="hero-headline hero-anim hero-anim--2">Your Brain Has<br />a Skill Tree.</h1>
            <p className="hero-sub hero-anim hero-anim--3">Turn daily tasks into XP, loot drops, and real momentum. Built for the way your brain actually works.</p>
            <div className="hero-cta-row hero-anim hero-anim--4">
              <a
                href="https://apps.apple.com/app/id6778361410"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Download on the App Store"
              >
                <img
                  src="/Download_on_the_App_Store_Badge_US-UK_RGB_blk_092917.svg"
                  alt="Download on the App Store"
                  className="hero-appstore-badge"
                />
              </a>
              <a className="btn btn--ghost" href="#features">See how it works</a>
            </div>
            <p className="hero-platform-note">Now Available on iOS</p>
          </div>
          <div className="hero-mockup hero-anim hero-anim--3" aria-hidden="true">
            <div className="mockup-frame">
              <video
                src="/hero-video.mp4"
                className="phone-screenshot"
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="section features-section" id="features">
        <div className="section-inner">
          <span className="eyebrow" data-reveal>◆ CORE SYSTEMS</span>
          <h2 className="section-headline" data-reveal data-delay="1">Four Mechanics.<br />One System.</h2>
          <div className="features-grid">
            {FEATURES.map((f, i) => (
              <div className="feature-card" key={f.title} data-reveal data-delay={i + 1}>
                <span className="feature-icon">{f.icon}</span>
                <h3 className="feature-title">{f.title}</h3>
                <p className="feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="section pricing-section" id="pricing">
        <div className="section-inner">
          <span className="eyebrow" data-reveal>◈ PRICING</span>
          <h2 className="section-headline" data-reveal data-delay="1">Free works. Paying buys room to grow.</h2>
          <p className="section-sub" data-reveal data-delay="2">
            Every tier earns the same XP and rolls loot at the same odds. Paying buys capacity and depth — not an outcome you couldn't reach for free.
          </p>
          <div className="pricing-grid">
            {TIERS.map((tier, i) => (
              <div
                key={tier.id}
                className={
                  'pricing-card'
                  + (tier.variant === 'pro'   ? ' pricing-card--pro'   : '')
                  + (tier.variant === 'elite' ? ' pricing-card--elite' : '')
                }
                data-reveal
                data-delay={i + 1}
              >
                {tier.badge && <span className="pricing-badge">{tier.badge}</span>}
                <span className="pricing-tier">{tier.name}</span>
                <div className="pricing-price">
                  {tier.price}
                  {tier.period && <span className="pricing-period">{tier.period}</span>}
                </div>
                <ul className="pricing-perks">
                  {tier.perks.map(perk => <li key={perk}>{perk}</li>)}
                </ul>
                <Link to="/signup" className={`pricing-btn pricing-btn--${tier.variant}`}>
                  {tier.cta}
                </Link>
              </div>
            ))}
          </div>
          <p className="pricing-trust">
            No tier has a paid advantage. XP, loot odds, cosmetics and Prestige are identical everywhere — paying buys capacity, not an edge.
          </p>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="section faq-section" id="faq">
        <div className="section-inner">
          <p className="eyebrow" data-reveal>◈ FAQ</p>
          <h2 className="section-headline" data-reveal data-delay="1">Common questions</h2>
          <div className="faq-list">
            {FAQ.map((item, i) => (
              <details key={i} className="faq-item">
                <summary className="faq-q">{item.q}</summary>
                <p className="faq-a">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </>
  )
}
