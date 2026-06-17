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
          <Link to="/release-notes" className="footer-rn-link">
            Release Notes
            {hasUnread && <span className="footer-rn-dot" />}
          </Link>
          <span>·</span>
          <Link to="/contact">Contact</Link>
        </div>
        <span className="footer-copy">© 2026 Zenith. All rights reserved. · v{CHANGELOG[0].version}</span>
      </div>
    </footer>
  )
}
