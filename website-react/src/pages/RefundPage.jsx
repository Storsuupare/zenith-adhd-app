import { Link } from 'react-router-dom'
import SolarBackdrop from '../components/SolarBackdrop.jsx'
import Nav from '../components/Nav.jsx'
import Footer from '../components/Footer.jsx'

export default function RefundPage() {
  return (
    <>
      <SolarBackdrop />
      <Nav />
      <main className="legal-main">
        <div className="legal-section">
          <span className="legal-eyebrow">◈ Legal</span>
          <h1 className="legal-title">Refund Policy</h1>
          <span className="legal-updated">Effective August 2026</span>
          <div className="legal-body">

            <h2>How purchases work</h2>
            <p>PRO and ELITE subscriptions are currently sold exclusively through the Apple App Store as in-app purchases. Zenith does not process or store your payment details, and doesn't bill you directly.</p>

            <hr className="legal-divider" />

            <h2>Paid but seeing Free?</h2>
            <p>If you reinstalled Zenith or switched devices, open the app and go to Settings → Restore purchases to re-link your subscription — no refund needed.</p>

            <hr className="legal-divider" />

            <h2>Requesting a refund</h2>
            <p>If Restore purchases didn't fix it and you want your money back, that's handled by Apple, not Zenith. We have no ability to issue one ourselves.</p>
            <ul>
              <li>Request one at reportaproblem.apple.com</li>
              <li>Or from your iPhone: Settings → [your name] → Subscriptions</li>
            </ul>

            <hr className="legal-divider" />

            <h2>What Zenith can help with</h2>
            <p>Credits are never sold directly — they only come from loot drops earned by completing sessions — so there's nothing to refund there. If you're double-charged or hit a billing bug on our end, contact us and we'll investigate and help you get it sorted.</p>

            <hr className="legal-divider" />

            <h2>Changes to this policy</h2>
            <p>As Zenith adds new ways to pay (a website store, Android IAP once in development), this policy will be updated to match.</p>

            <hr className="legal-divider" />

            <p>Questions about refunds? <Link to="/contact">Contact us</Link></p>

          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
