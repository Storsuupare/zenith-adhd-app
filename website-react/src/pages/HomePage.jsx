import { useEffect, useRef } from 'react'
import SolarBackdrop from '../components/SolarBackdrop.jsx'
import Nav from '../components/Nav.jsx'
import Footer from '../components/Footer.jsx'
import { useSEO } from '../hooks/useSEO.js'

const FEATURES = [
  { icon: '▶', title: 'Session System',      desc: 'Every task is a timed contract. Complete it, earn XP and real loot drops.' },
  { icon: '◎', title: 'Skill Mastery',       desc: '12 skills that level up as you work. Prestige when you reach the ceiling.' },
  { icon: '◈', title: 'Loot Drops',          desc: 'Finish a session and roll for a credit drop. Rare, Epic, Legendary — real randomness.' },
  { icon: '▲', title: 'Neural Clock',        desc: 'Time-based multipliers that reward your natural focus rhythm and punish late nights.' },
]

const FAQ = [
  {
    q: "I've tried every productivity app. Why would this one be different?",
    a: "Most apps assume motivation is the problem. Zenith assumes it isn't — it assumes your brain needs an external feedback loop. Every session gives you XP, skill levels, and a loot drop to roll. The loop runs on completion, not on willpower.",
  },
  {
    q: 'Is Zenith actually free?',
    a: 'Yes. Free users get unlimited sessions, all 12 skills, loot drops, streaks, and the full progression system. PRO and ELITE unlock cosmetics and capacity — not outcomes. You can hit the ceiling on free.',
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
    a: "No. Every user earns the same XP, loot rates, and skill progression regardless of tier. The only thing free users miss out on is access to Streak Shield in the shop — everything else, including all cosmetic themes, is available to everyone. Paying buys protection, not an edge.",
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
