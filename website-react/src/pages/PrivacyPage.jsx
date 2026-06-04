import SolarBackdrop from '../components/SolarBackdrop.jsx'
import Nav from '../components/Nav.jsx'
import Footer from '../components/Footer.jsx'

export default function PrivacyPage() {
  return (
    <>
      <SolarBackdrop />
      <Nav />
      <main className="legal-main">
        <div className="legal-section">
          <span className="legal-eyebrow">◈ Legal</span>
          <h1 className="legal-title">Privacy Policy</h1>
          <span className="legal-updated">Effective May 2026</span>
          <div className="legal-body">

            <h2>What we collect</h2>
            <p>Zenith collects only what the app needs to function.</p>
            <ul>
              <li><strong>Account info.</strong> Your email address and username, provided when you sign up.</li>
              <li><strong>Task data.</strong> Task names, durations, timestamps, and completion status. This is what drives your XP and skill progression.</li>
              <li><strong>Progress data.</strong> XP, skill levels, streak count, credits, and inventory items.</li>
              <li><strong>Subscription status.</strong> Your current plan (Free, PRO, or ELITE). Payment details are handled by Stripe and never stored by us.</li>
              <li><strong>Notification data.</strong> Only stored if you opt in to push notifications.</li>
            </ul>
            <p>We don't collect your location, your contact list, or anything unrelated to the app.</p>

            <hr className="legal-divider" />

            <h2>How we use your data</h2>
            <ul>
              <li>To run Zenith and give you your XP, loot, and skill progress.</li>
              <li>To manage your subscription and billing through Stripe.</li>
              <li>To send session reminders if you have notifications turned on.</li>
              <li>To improve the app. We look at how people use Zenith in aggregate, never at what you personally typed into your tasks.</li>
            </ul>
            <p>We don't sell your data. We don't use it for ads.</p>

            <hr className="legal-divider" />

            <h2>Third-party services</h2>
            <ul>
              <li><strong>Stripe.</strong> Payment processing. Your card details go directly to Stripe. We only receive confirmation that a subscription is active.</li>
              <li><strong>Railway.</strong> We host the backend and database on Railway. Your data stays on EU-compliant servers.</li>
              <li><strong>Vercel.</strong> The frontend is served through Vercel.</li>
            </ul>
            <p>Each provider operates under their own privacy policy. We only work with providers that take data protection seriously.</p>

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
            <p>Use the Delete Account option in Settings, or reach out to us directly.</p>

            <hr className="legal-divider" />

            <h2>Data retention</h2>
            <p>We keep your data for as long as your account is active. Delete your account and everything goes with it: task history, XP, inventory, subscription info, all of it. Once it's gone, it's gone.</p>

            <hr className="legal-divider" />

            <h2>Security</h2>
            <p>All data is transmitted over HTTPS. Login is handled by a dedicated authentication service, so no passwords are ever stored by us directly.</p>

            <hr className="legal-divider" />

            <p>Questions or data requests? <a href="mailto:contact@zenithapp.org">contact@zenithapp.org</a></p>

          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
