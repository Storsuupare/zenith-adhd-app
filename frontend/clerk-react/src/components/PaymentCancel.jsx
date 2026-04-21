import React from "react";
import "./PaymentCancel.css";

const PaymentCancel = ({ onRetry, onDismiss }) => (
  <div className="payment-cancel-screen">
    <div className="payment-cancel-card">
      <div className="cancel-icon" aria-hidden="true">⊗</div>
      <h1 className="cancel-title">Transaction Halted</h1>
      <p className="cancel-body">
        Your payment was cancelled and nothing was charged. No worries — you
        can try again whenever you're ready.
      </p>
      <div className="cancel-actions">
        <button className="cancel-retry-btn" onClick={onRetry}>
          Try Again
        </button>
        <button className="cancel-dismiss-btn" onClick={onDismiss}>
          Back to Dashboard
        </button>
      </div>
      <p className="cancel-footnote">All Stripe payments are encrypted end-to-end.</p>
    </div>
  </div>
);

export default PaymentCancel;
