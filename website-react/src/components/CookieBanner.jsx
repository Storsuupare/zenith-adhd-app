import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

const SEEN_KEY = 'zenith_cookie_notice_seen'

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (localStorage.getItem(SEEN_KEY) !== '1') setVisible(true)
  }, [])

  if (!visible) return null

  const dismiss = () => {
    localStorage.setItem(SEEN_KEY, '1')
    setVisible(false)
  }

  return (
    <div className="cookie-banner" role="region" aria-label="Cookie notice">
      <p className="cookie-banner-text">
        Zenith uses one strictly necessary cookie to keep you signed in — nothing else, no tracking or ad cookies.
        See our <Link to="/privacy">Privacy Policy</Link> for details.
      </p>
      <button type="button" className="cookie-banner-btn" onClick={dismiss}>
        Got it
      </button>
    </div>
  )
}
