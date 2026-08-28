import { Link } from 'react-router-dom'
import SolarBackdrop from '../components/SolarBackdrop.jsx'
import Nav from '../components/Nav.jsx'
import { useSEO } from '../hooks/useSEO.js'
export default function PaymentSuccessPage() {
  useSEO({ title: 'Payment Successful — Zenith', path: '/payment/success', noindex: true })

  return (
    <>
      <SolarBackdrop />
      <Nav />
      <div className="status-page-wrap">
        <div className="status-card">
          <span className="status-icon">◈</span>
          <h1 className="status-title">You're in.</h1>
          <p className="status-sub">Your subscription is active. Open the app and your new tier will be waiting.</p>
          <a
            href={import.meta.env.VITE_APP_URL || '/'}
            className="btn btn--primary"
          >
            Open App ↗
          </a>
          <Link to="/" className="status-back">← Back to Zenith</Link>
        </div>
      </div>
    </>
  )
}
