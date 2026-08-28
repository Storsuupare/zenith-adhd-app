import { Link, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { CHANGELOG } from '../data/changelog.js'

const SEEN_KEY = 'zenith_rn_seen'

export default function Footer() {
  const location = useLocation()
  const [hasUnread, setHasUnread] = useState(false)

  useEffect(() => {
    setHasUnread(localStorage.getItem(SEEN_KEY) !== CHANGELOG[0].version)
  }, [location.pathname])

  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-links">
          <Link to="/privacy">Privacy</Link>
          <span>·</span>
          <Link to="/terms">Terms</Link>
          <span>·</span>
          <Link to="/refund">Refund</Link>
          <span>·</span>
          <Link to="/release-notes" className="footer-rn-link">
            Release Notes
            {hasUnread && <span className="footer-rn-dot" />}
          </Link>
          <span>·</span>
          <Link to="/contact">Contact</Link>
        </div>
        <div className="footer-social">
          <a
            href="https://www.tiktok.com/@getzenith"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Zenith on TikTok"
            className="footer-social-badge"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
              <path d="M16.6 5.82c-1.36-1.57-3.24-1.48-3.24-1.48h-3.09v12.4a2.592 2.592 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6 0-1.72 1.66-3.01 3.37-2.48V10.83c-3.45-.46-6.47 2.22-6.47 5.64 0 3.33 2.76 5.7 5.69 5.7 3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.13s-1.88.09-3.24-1.48Z" />
            </svg>
          </a>
        </div>
        <span className="footer-copy">© 2026 Zenith. All rights reserved.</span>
      </div>
    </footer>
  )
}
