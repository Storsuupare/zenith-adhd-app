import { useEffect, useRef } from 'react'
import SolarBackdrop from '../components/SolarBackdrop.jsx'
import Nav from '../components/Nav.jsx'
import Footer from '../components/Footer.jsx'

const FEATURES = [
  { icon: '⬡', title: 'Session System',      desc: 'Every task is a timed contract. Complete it, earn XP and real loot drops.' },
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
    a: "PRO and ELITE give you more shop capacity and cosmetic themes — not more XP, not better loot rates, not exclusive skills. Paying buys comfort, not progression. A free user and a PRO user earn the same rewards for the same session.",
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

export default function HomePage() {
  useScrollReveal()

  return (
    <>
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
              <a className="btn btn--primary" href="#features">See how it works</a>
            </div>
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
