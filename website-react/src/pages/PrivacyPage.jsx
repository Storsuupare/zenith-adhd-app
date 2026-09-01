import { Link } from 'react-router-dom'
import SolarBackdrop from '../components/SolarBackdrop.jsx'
import Nav from '../components/Nav.jsx'
import Footer from '../components/Footer.jsx'
import { useSEO } from '../hooks/useSEO.js'

export default function PrivacyPage() {
  useSEO({
    title:       'Privacy Policy — Zenith',
    description: 'How Zenith collects, uses, and protects your data.',
    path:        '/privacy',
  })

  return (
    <>
      <SolarBackdrop />
      <Nav />
      <main className="legal-main">
        <div className="legal-section">
          <span className="legal-eyebrow">◈ Legal</span>
          <h1 className="legal-title">Privacy Policy</h1>
          <span className="legal-updated">Effective September 2026</span>
          <div className="legal-body">

            <h2>What we collect</h2>
            <p>Zenith collects only what the app needs to function.</p>
            <ul>
              <li><strong>Account info.</strong> Your email address and username, provided when you sign up.</li>
              <li><strong>Task data.</strong> Task names, durations, timestamps, and completion status. This is what drives your XP and skill progression.</li>
              <li><strong>Progress data.</strong> XP, skill levels, streak count, credits, and inventory items.</li>
              <li><strong>Notification data.</strong> Only stored if you opt in to push notifications.</li>
            </ul>
            <p>We don't collect your location, your contact list, or anything unrelated to the app.</p>

            <hr className="legal-divider" />

            <h2>How we use your data</h2>
            <ul>
              <li>To run Zenith and give you your XP, loot, and skill progress.</li>
              <li>To send session reminders if you have notifications turned on.</li>
              <li>To improve the app. We look at how people use Zenith in aggregate, never at what you personally typed into your tasks.</li>
            </ul>
            <p>We don't sell your data. We don't use it for ads, and we don't track you across other apps or websites.</p>

            <hr className="legal-divider" />

            <h2>Third-party services</h2>
            <ul>
              <li><strong>Clerk.</strong> Handles sign-up and login. Stores your email address and authentication details.</li>
              <li><strong>Railway.</strong> We host the backend and database on Railway. Your data stays on EU-compliant servers.</li>
              <li><strong>Vercel.</strong> The frontend is served through Vercel.</li>
              <li><strong>RevenueCat.</strong> Processes subscription purchases and receipts. Receives your account ID and purchase history, never your payment card details — those stay with Apple.</li>
              <li><strong>PostHog.</strong> Product analytics, hosted in the EU. Receives your account ID together with events like session length, skill, and subscription tier — task names and other text you write are never sent as analytics events. PostHog is also used for error tracking: when something goes wrong, the error message and a code-level stack trace are sent, which are technical by nature and not filtered the way analytics events are.</li>
            </ul>
            <p>Each provider operates under their own privacy policy and processes data only on our instructions.</p>

            <hr className="legal-divider" />

            <h2>Why we're allowed to process it</h2>
            <ul>
              <li><strong>To provide the service.</strong> Running your account, sessions, and progress is necessary to deliver what you signed up for (GDPR Art. 6(1)(b)).</li>
              <li><strong>Legitimate interest.</strong> Aggregate analytics that tell us which features are used, so we can improve the app (GDPR Art. 6(1)(f)).</li>
              <li><strong>Consent.</strong> Push notifications, which you turn on yourself and can turn off at any time (GDPR Art. 6(1)(a)).</li>
            </ul>

            <hr className="legal-divider" />

            <h2>Your rights (GDPR)</h2>
            <p>If you're in the EU or EEA, you have the following rights:</p>
            <ul>
              <li><strong>Access.</strong> Ask for a copy of all personal data we hold on you.</li>
              <li><strong>Rectification.</strong> Ask us to correct anything that's wrong.</li>
              <li><strong>Erasure.</strong> Delete your account and everything in it. You can do this from Settings at any time.</li>
              <li><strong>Portability.</strong> Receive your data in a portable format.</li>
              <li><strong>Restriction.</strong> Ask us to pause processing while a dispute is being resolved.</li>
              <li><strong>Objection.</strong> Object to processing based on legitimate interests.</li>
            </ul>
            <p>Use the Delete Account option in Settings, or reach out to us directly. If you think we've handled your data wrongly, you can complain to your national data protection authority — in Finland, the Office of the Data Protection Ombudsman (tietosuoja.fi).</p>

            <hr className="legal-divider" />

            <h2>Data retention</h2>
            <p>We keep your data for as long as your account is active. Delete your account and everything goes with it: task history, XP, inventory, subscription info, all of it. Once it's gone, it's gone.</p>
            <p>Encrypted database backups may hold deleted data for up to 30 days before they roll over. Analytics events are retained for 12 months.</p>

            <hr className="legal-divider" />

            <h2>Security</h2>
            <p>All data is transmitted over HTTPS. Login is handled by a dedicated authentication service, so no passwords are ever stored by us directly.</p>

            <hr className="legal-divider" />

            <p>Questions or data requests? <Link to="/contact">Contact us</Link></p>

          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
