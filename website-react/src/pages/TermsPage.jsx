import { Link } from 'react-router-dom'
import SolarBackdrop from '../components/SolarBackdrop.jsx'
import Nav from '../components/Nav.jsx'
import Footer from '../components/Footer.jsx'

export default function TermsPage() {
  return (
    <>
      <SolarBackdrop />
      <Nav />
      <main className="legal-main">
        <div className="legal-section">
          <span className="legal-eyebrow">◈ Legal</span>
          <h1 className="legal-title">Terms of Service</h1>
          <span className="legal-updated">Effective May 2026</span>
          <div className="legal-body">

            <h2>The service</h2>
            <p>Zenith helps you build focus and momentum by turning your work into a structured game. By creating an account you're agreeing to these terms. If you don't agree, don't use the service.</p>

            <hr className="legal-divider" />

            <h2>Your account</h2>
            <ul>
              <li>You must be at least 16 to create an account. Under 16 means you need a parent or guardian present.</li>
              <li>You're responsible for everything that happens under your account.</li>
              <li>One account per person. Don't share it.</li>
              <li>If you think your account has been compromised, contact us right away.</li>
            </ul>

            <hr className="legal-divider" />

            <h2>Subscriptions and billing</h2>
            <p>Zenith has two paid plans: PRO at €3.99/month and ELITE at €8.99/month, sold as auto-renewing subscriptions through the Apple App Store. Refunds are handled by Apple, not Zenith — see our <Link to="/refund">Refund Policy</Link>.</p>

            <hr className="legal-divider" />

            <h2>Acceptable use</h2>
            <p>Keep it honest. Don't do any of the following:</p>
            <ul>
              <li>Exploit bugs or glitches to get XP, credits, or items you didn't legitimately earn.</li>
              <li>Use bots or scripts to interact with the service.</li>
              <li>Try to access someone else's account or data.</li>
              <li>Use Zenith for anything illegal.</li>
              <li>Try to reverse-engineer or extract the source code.</li>
            </ul>
            <p>Break these rules and your account gets suspended or permanently banned. No refund.</p>

            <hr className="legal-divider" />

            <h2>Intellectual property</h2>
            <p>Everything in Zenith (UI design, branding, game mechanics, loot system, code) is ours. Don't copy it, redistribute it, or build something from it without written permission.</p>
            <p>Your task content belongs to you. We don't claim ownership over what you type.</p>

            <hr className="legal-divider" />

            <h2>Disclaimer</h2>
            <p>Zenith is provided as-is. We don't guarantee it'll always be available or that it'll produce specific results for you. Our liability is limited to what you paid in the 30 days before any claim.</p>

            <hr className="legal-divider" />

            <h2>Changes to these terms</h2>
            <p>We'll update these terms when needed. Big changes get announced on the Release Notes page or by email. Keep using Zenith after that and you've accepted them.</p>

            <hr className="legal-divider" />

            <p>Questions about these terms? <Link to="/contact">Contact us</Link></p>

          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
