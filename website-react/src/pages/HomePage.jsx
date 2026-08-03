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
    q: 'What happens if I quit a session early?',
    a: 'You lose the XP and credits you would have earned. There is no streak break for a single quit, but consistent quitting will hurt your long-term progression.',
  },
  {
    q: 'Is my data private?',
    a: 'Yes. Your session data is tied to your account and never shared or sold. See our Privacy Policy for the full details.',
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
            <p className="hero-sub hero-anim hero-anim--3">Turn daily tasks into XP, loot drops, and real momentum! Built for the way your brain actually works.</p>
            <div className="hero-cta-row hero-anim hero-anim--4">
              <a
                className="btn btn--primary"
                href="https://discord.gg/Ur75YjyN"
                target="_blank"
                rel="noopener noreferrer"
              >
                Join the Community
              </a>
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
          <p className="eyebrow">◈ FAQ</p>
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
