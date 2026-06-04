import React, { useState, useEffect } from "react";
import "./PaymentSuccess.css";

const STEPS = [
  "Verifying transaction signature",
  "Syncing account tier",
  "Unlocking perk slots",
  "Calibrating audio engine",
  "System optimized",
];

const PaymentSuccess = ({ onContinue }) => {
  const [step, setStep]       = useState(0);
  const [done, setDone]       = useState(false);

  useEffect(() => {
    if (step >= STEPS.length - 1) {
      const t = setTimeout(() => setDone(true), 800);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setStep((s) => s + 1), 550);
    return () => clearTimeout(t);
  }, [step]);

  return (
    <div className="payment-success-screen">
      <div className={`payment-success-card ${done ? "revealed" : ""}`}>
        {!done ? (
          <div className="recal-block">
            <div className="recal-ring" aria-hidden="true">
              <div className="recal-ring-inner" />
            </div>
            <span className="recal-title">System Recalibrating</span>
            <ul className="recal-steps" aria-live="polite">
              {STEPS.map((s, i) => (
                <li
                  key={i}
                  className={`recal-step ${i < step ? "done" : i === step ? "active" : "pending"}`}
                >
                  <span className="step-dot" aria-hidden="true" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="success-block">
            <div className="success-icon" aria-hidden="true">◈</div>
            <h1 className="success-title">Upgrade Complete</h1>
            <p className="success-body">
              Your plan is now active. New perk slots, XP multiplier, and audio
              tracks are ready to use.
            </p>
            <button className="success-cta" onClick={onContinue}>
              Enter Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentSuccess;
