import React from "react";
import { useNavigate } from "react-router-dom";
import "./LegalPage.css";

const TermsPage = () => {
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
        <h1 className="legal-title">Terms of Service</h1>
        <span className="legal-effective">Effective May 2026</span>
      </div>

      <div className="legal-section">
        <div className="legal-section-title">The service</div>
        <p>
          Zenith is a productivity application that gamifies task management for
          people who want to build better focus and momentum. By creating an account and using
          Zenith, you agree to these Terms of Service. If you do not agree, do
          not use the service.
        </p>
      </div>

      <div className="legal-divider" />

      <div className="legal-section">
        <div className="legal-section-title">Your account</div>
        <ul>
          <li>
            You must be at least 18 years old to create an account. If you are
            under 18, you may only use Zenith with the direct supervision of a
            parent or guardian.
          </li>
          <li>You are responsible for all activity under your account.</li>
          <li>
            Do not share your account with others. Each account is for one
            person.
          </li>
          <li>
            Keep your login credentials secure. Contact us immediately if you
            believe your account has been compromised.
          </li>
        </ul>
      </div>

      <div className="legal-divider" />

      <div className="legal-section">
        <div className="legal-section-title">Subscriptions and billing</div>
        <p>
          Zenith offers two paid plans: PRO (€4.99/month) and ELITE
          (€9.99/month) when purchased via the web. App Store pricing may vary
          by region. All plans are billed monthly and processed by Stripe or
          your platform's native billing.
        </p>
        <ul>
          <li>
            Subscriptions renew automatically at the end of each billing period.
          </li>
          <li>
            You can cancel at any time. After cancellation, you retain access to
            paid features until the end of the current billing period.
          </li>
          <li>
            We do not offer refunds for partial billing periods. If you cancel
            mid-month, your subscription remains active until the period ends.
          </li>
          <li>
            If a payment fails, your account will be downgraded to the Free tier.
          </li>
        </ul>
      </div>

      <div className="legal-divider" />

      <div className="legal-section">
        <div className="legal-section-title">Acceptable use</div>
        <p>You agree not to:</p>
        <ul>
          <li>
            Exploit bugs, glitches, or vulnerabilities to gain XP, credits, or
            items that you did not legitimately earn.
          </li>
          <li>
            Use automation, bots, or scripts to interact with the service.
          </li>
          <li>Attempt to access another user's account or data.</li>
          <li>
            Use the service for any unlawful purpose or in violation of any
            applicable law.
          </li>
          <li>
            Reverse-engineer, decompile, or otherwise attempt to extract the
            source code of Zenith.
          </li>
        </ul>
        <p>
          Violations may result in immediate account suspension or permanent ban
          without refund.
        </p>
      </div>

      <div className="legal-divider" />

      <div className="legal-section">
        <div className="legal-section-title">Intellectual property</div>
        <p>
          All Zenith content — including the interface design, branding, game
          mechanics, loot system, and code — is our property. You may not copy,
          redistribute, or create derivative works without written permission.
        </p>
        <p>
          Your task data (task names, descriptions, and personal content you
          enter) belongs to you. We claim no ownership over your content.
        </p>
      </div>

      <div className="legal-divider" />

      <div className="legal-section">
        <div className="legal-section-title">Disclaimer</div>
        <p>
          Zenith is provided "as is" without warranties of any kind. We do not
          guarantee uninterrupted availability, specific productivity outcomes,
          or fitness for any particular purpose.
        </p>
        <p>
          Zenith is a productivity tool. It is not medical advice, therapy, or a
          substitute for professional medical advice or treatment. If you have medical
          concerns, consult a qualified healthcare professional.
        </p>
        <p>
          To the maximum extent permitted by law, Zenith's liability for any
          claim arising from use of the service is limited to the amount you paid
          in the 30 days prior to the claim.
        </p>
      </div>

      <div className="legal-divider" />

      <div className="legal-section">
        <div className="legal-section-title">Changes to these terms</div>
        <p>
          We may update these Terms from time to time. We will notify you of
          material changes via the Release Notes page or by email. Continued use
          of Zenith after changes are posted means you accept the updated Terms.
        </p>
      </div>

      <div className="legal-divider" />

      <div className="legal-section">
        <div className="legal-section-title">Governing law</div>
        <p>
          These Terms are governed by the laws of Finland, without regard to
          conflict of law principles. Disputes will be resolved in the courts of
          Finland, unless mandatory consumer protection laws in your country
          require otherwise.
        </p>
      </div>

      <div className="legal-contact">
        Questions about these Terms?{" "}
        <a href="mailto:contact@zenithapp.org">contact@zenithapp.org</a>
      </div>
    </div>
  );
};

export default TermsPage;
