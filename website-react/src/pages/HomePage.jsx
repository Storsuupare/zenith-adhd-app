import { useEffect, useRef, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
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
    q: 'Is Zenith actually free?',
    a: 'Yes. The free tier is fully functional — you can run sessions, level skills, earn loot drops, and build a streak with no time limit and no credit card required.',
  },
  {
    q: 'How is this different from a regular timer app?',
    a: 'A timer counts down. Zenith turns the session into a contract — you stake something, you earn something back. XP, skill levels, loot drops, and a streak that compounds. The feedback loop is the difference.',
  },
  {
    q: 'Do I need to already be productive to use this?',
    a: "No. Zenith is built specifically for people who struggle to start and finish tasks. The first session takes 30 seconds to set up. Just name what you're working on and hit Start.",
  },
  {
    q: 'What does PRO actually unlock?',
    a: '120-minute sessions, more active task slots, 1.5× XP and credits on everything, and access to additional themes.',
  },
  {
    q: 'What happens if I quit a session early?',
    a: 'You lose the XP and credits you would have earned. There is no streak break for a single quit, but consistent quitting will hurt your long-term progression.',
  },
  {
    q: 'Is my data private?',
    a: 'Yes. Your session data is tied to your account and never shared or sold. See our Privacy Policy for the full details.',
  },
]

const PRICING = [
  {
    tier: 'FREE',
    price: '€0',
    period: '/mo',
    perks: ['5 active task slots', 'Sessions up to 60 min', '1× XP + credit earn rate', 'Base loot drop rate', 'Full rarity access — Junk to Mythic', 'Classic theme + Cobalt–Jade purchasable'],
    cta: 'Get Started Free',
    ctaClass: 'pricing-btn--free',
    href: '/signup',
  },
  {
    tier: 'PRO',
    price: '€4.99',
    period: '/mo',
    badge: 'BEST VALUE',
    perks: ['15 active task slots', 'Sessions up to 120 min', '1.5× XP + credits per session', '2× loot drop rate', 'Neon, Arctic + Solar themes unlocked in shop'],
    cta: 'Upgrade to Pro',
    ctaClass: 'pricing-btn--pro',
    href: null,
    stripeKey: 1,
  },
  {
    tier: 'ELITE',
    price: '€9.99',
    period: '/mo',
    perks: ['Unlimited active task slots', 'Sessions up to 120 min', '2× XP + credits per session', '3× loot drop rate', 'Full theme shop access'],
    cta: 'Go Elite',
    ctaClass: 'pricing-btn--elite',
    href: null,
    stripeKey: 2,
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
  const { isSignedIn, getToken } = useAuth()
  const navigate = useNavigate()
  const [checkoutLoading, setCheckoutLoading] = useState(null)
  const [checkoutError, setCheckoutError]     = useState(null)

  useScrollReveal()

  const handleCheckout = useCallback(async (tier) => {
    if (!isSignedIn) {
      navigate('/signup')
      return
    }
    const backendUrl = import.meta.env.VITE_BACKEND_URL
    if (!backendUrl) return
    setCheckoutLoading(tier)
    setCheckoutError(null)
    try {
      const token = await getToken()
      const res = await fetch(`${backendUrl}/payments/create-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ targetTier: tier }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setCheckoutError('Could not start checkout. Please try again.')
      }
    } catch {
      setCheckoutError('Something went wrong. Please try again.')
    } finally {
      setCheckoutLoading(null)
    }
  }, [isSignedIn, getToken, navigate])

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
            <p className="hero-sub hero-anim hero-anim--3">Turn daily tasks into XP, loot drops, and real momentum! Built for the way your brain actually works.</p>
            <div className="hero-cta-row hero-anim hero-anim--4">
            </div>
          </div>
          <div className="hero-mockup hero-anim hero-anim--3" aria-hidden="true">
            <div className="mockup-frame">
              <img src="/image22.webp" alt="Zenith app — mission creation screen" className="phone-screenshot" loading="lazy" decoding="async" />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="section features-section">
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

      {/* Pricing */}
      <section className="section pricing-section" id="pricing">
        <div className="section-inner">
          <span className="eyebrow" data-reveal>▣ PRICING</span>
          <h2 className="section-headline" data-reveal data-delay="1">Direct Web Pricing.<br />No App Store Markup.</h2>
          <p className="section-sub" data-reveal data-delay="2">Buy direct and save. Your subscription syncs instantly to your mobile account on login.</p>
          <div className="pricing-grid">
            {PRICING.map((p, i) => (
              <div
                key={p.tier}
                className={`pricing-card${p.tier === 'PRO' ? ' pricing-card--pro' : ''}${p.tier === 'ELITE' ? ' pricing-card--elite' : ''}`}
                data-reveal
                data-delay={i + 1}
              >
                {p.badge && <span className="pricing-badge">{p.badge}</span>}
                <span className="pricing-tier">{p.tier}</span>
                <div className="pricing-price">{p.price}<span className="pricing-period">{p.period}</span></div>
                <ul className="pricing-perks">
                  {p.perks.map((perk) => <li key={perk}>{perk}</li>)}
                </ul>
                {p.href ? (
                  <Link to={p.href} className={`pricing-btn ${p.ctaClass}`}>{p.cta}</Link>
                ) : (
                  <button
                    className={`pricing-btn ${p.ctaClass}`}
                    onClick={() => handleCheckout(p.stripeKey)}
                    disabled={checkoutLoading !== null}
                  >
                    {checkoutLoading === p.stripeKey ? 'Starting…' : p.cta}
                  </button>
                )}
              </div>
            ))}
          </div>
          {checkoutError && <p className="pricing-error">{checkoutError}</p>}
          <p className="pricing-trust" data-reveal>◈ Securely processed via Stripe · Subscription syncs instantly to your mobile account on login</p>
        </div>
      </section>

      {/* Community Feedback */}
      <section className="section beta-section" id="feedback">
        <div className="section-inner beta-inner">
          <span className="eyebrow" data-reveal>◉ COMMUNITY</span>
          <h2 className="section-headline" data-reveal data-delay="1">Shape What<br />Comes Next.</h2>
          <p className="section-sub" data-reveal data-delay="2">Got a feature idea, a bug report, or just want to share how Zenith fits into your routine? Send us a message! Every submission gets read.</p>
          <a
            className="btn btn--primary"
            href="https://discord.gg/Ur75YjyN"
            target="_blank"
            rel="noopener noreferrer"
            data-reveal
            data-delay="3"
          >
            Join the Community
          </a>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="section faq-section" id="faq">
        <div className="section-inner">
          <p className="section-eyebrow">◈ FAQ</p>
          <h2 className="section-title">Common questions</h2>
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
