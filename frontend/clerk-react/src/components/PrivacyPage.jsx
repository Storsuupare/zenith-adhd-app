import React from "react";
import { useNavigate } from "react-router-dom";
import "./LegalPage.css";

const PrivacyPage = () => {
  const navigate = useNavigate();

  return (
    <div className="legal-page">
      <div className="legal-header">
        <button
          className="page-back-btn"
          onClick={() => navigate(-1)}
          aria-label="Go back">
          ‹
        </button>
        <h1 className="legal-title">Privacy Policy</h1>
        <span className="legal-effective">Effective May 2026</span>
      </div>

      <div className="legal-section">
        <div className="legal-section-title">What we collect</div>
        <p>
          Zenith collects only what's needed to run the service. Here's exactly
          what that means:
        </p>
        <ul>
          <li>
            <strong>Account info</strong> — your email address and username,
            collected at signup via Clerk (our authentication provider).
          </li>
          <li>
            <strong>Task data</strong> — task names, durations, timestamps, and
            completion status. This is the core data that powers your XP and
            skill progression.
          </li>
          <li>
            <strong>Progress data</strong> — XP, skill levels, streak count,
            bandwidth, credits, and inventory items.
          </li>
          <li>
            <strong>Subscription status</strong> — your current plan tier (Free,
            PRO, or ELITE). Payment card details are handled exclusively by
            Stripe and never stored by us.
          </li>
          <li>
            <strong>Push notification tokens</strong> — only if you opt in to
            notifications.
          </li>
        </ul>
        <p>
          We do not collect location data, contact lists, or any data unrelated
          to the service.
        </p>
      </div>

      <div className="legal-divider" />

      <div className="legal-section">
        <div className="legal-section-title">How we use your data</div>
        <ul>
          <li>To run Zenith and deliver your XP, loot, and skill progression.</li>
          <li>To manage your subscription and billing via Stripe.</li>
          <li>To send task reminders if you have notifications enabled.</li>
          <li>
            To improve the product — we may look at aggregate usage patterns
            (never individual task content) to understand how Zenith is used.
          </li>
        </ul>
        <p>We do not sell your data. We do not use it for advertising.</p>
      </div>

      <div className="legal-divider" />

      <div className="legal-section">
        <div className="legal-section-title">Third-party services</div>
        <p>Zenith uses the following third parties to operate:</p>
        <ul>
          <li>
            <strong>Clerk</strong> — authentication and session management.
          </li>
          <li>
            <strong>Stripe</strong> — payment processing. Your card details go
            directly to Stripe; we only receive a subscription status.
          </li>
          <li>
            <strong>Railway</strong> — backend server and database hosting.
          </li>
          <li>
            <strong>Vercel</strong> — frontend hosting and delivery.
          </li>
        </ul>
        <p>
          Each provider has their own privacy policy. We choose providers with
          strong data protection commitments.
        </p>
      </div>

      <div className="legal-divider" />

      <div className="legal-section">
        <div className="legal-section-title">Your rights (GDPR)</div>
        <p>
          If you are located in the European Union or EEA, you have the
          following rights:
        </p>
        <ul>
          <li>
            <strong>Access</strong> — request a copy of all personal data we
            hold about you.
          </li>
          <li>
            <strong>Rectification</strong> — ask us to correct inaccurate data.
          </li>
          <li>
            <strong>Erasure</strong> — permanently delete your account and all
            associated data. You can do this directly from Settings at any time.
          </li>
          <li>
            <strong>Portability</strong> — receive your data in a portable
            format.
          </li>
          <li>
            <strong>Restriction</strong> — ask us to stop processing your data
            while a dispute is resolved.
          </li>
          <li>
            <strong>Object</strong> — object to processing based on legitimate
            interests.
          </li>
        </ul>
        <p>
          To exercise any of these rights, use the Delete Account option in
          Settings, or contact us directly.
        </p>
      </div>

      <div className="legal-divider" />

      <div className="legal-section">
        <div className="legal-section-title">Data retention</div>
        <p>
          We keep your data for as long as your account is active. When you
          delete your account, all personal data — task history, XP, inventory,
          subscription info, and your user record — is permanently removed from
          our systems. There is no recovery after deletion.
        </p>
      </div>

      <div className="legal-divider" />

      <div className="legal-section">
        <div className="legal-section-title">Security</div>
        <p>
          All data is transmitted over HTTPS. Authentication is handled by Clerk
          using industry-standard JWT verification. We do not store plaintext
          passwords. Database access is restricted and not exposed to the public
          internet.
        </p>
      </div>

      <div className="legal-contact">
        Questions or data requests?{" "}
        <a href="mailto:contact@zenithapp.org">contact@zenithapp.org</a>
      </div>
    </div>
  );
};

export default PrivacyPage;
