import { Link } from 'react-router-dom'
import SolarBackdrop from '../components/SolarBackdrop.jsx'
import Nav from '../components/Nav.jsx'
import { useSEO } from '../hooks/useSEO.js'
export default function PaymentCancelPage() {
  useSEO({ title: 'Payment Cancelled — Zenith', path: '/payment/cancel', noindex: true })

  return (
    <>
      <SolarBackdrop />
      <Nav />
      <div className="status-page-wrap">
        <div className="status-card">
          <span className="status-icon" style={{ opacity: 0.4 }}>▲</span>
          <h1 className="status-title">Cancelled.</h1>
          <p className="status-sub">No charge was made. Come back when you're ready to upgrade.</p>
          <Link to="/#pricing" className="btn btn--primary">View Plans</Link>
          <Link to="/" className="status-back">← Back to Zenith</Link>
        </div>
      </div>
    </>
  )
}
