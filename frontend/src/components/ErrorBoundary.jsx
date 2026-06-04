import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", height: "100dvh", gap: "16px",
        background: "#0a0a0f", color: "#fff", fontFamily: "Inter, sans-serif",
        padding: "24px", textAlign: "center",
      }}>
        <span style={{ fontSize: "2rem" }}>⚠</span>
        <p style={{ fontSize: "0.9rem", fontWeight: 700, letterSpacing: "0.1em", color: "#ff4466" }}>
          SYSTEM ERROR
        </p>
        <p style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.45)", maxWidth: "320px" }}>
          Something crashed unexpectedly. Your data is safe.
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: "8px", padding: "12px 28px", background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.15)", borderRadius: "10px",
            color: "#fff", fontSize: "0.65rem", fontWeight: 700,
            letterSpacing: "0.12em", cursor: "pointer",
          }}
        >
          RESTART
        </button>
      </div>
    );
  }
}

export default ErrorBoundary;
