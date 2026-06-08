import { Link } from 'react-router-dom'
import { useAuth, useUser } from '@clerk/clerk-react'

export default function Nav() {
  const { isSignedIn } = useAuth()
  const { user } = useUser()

  const initials = user
    ? ((user.firstName?.[0] ?? '') + (user.lastName?.[0] ?? '')).toUpperCase() || '?'
    : '?'

  return (
    <nav className="site-nav">
      <div className="nav-inner">
        <Link to="/" className="nav-logo">
          <img src="/logo2.webp" alt="Zenith" className="nav-logo-img" />
          ZENITH
        </Link>
        <div className="nav-right">
          <div className="nav-play-wrap">
            <div className="nav-play-badge nav-play-badge--disabled">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M3 20.5v-17c0-.83 1-.92 1.38-.43l13 8.5c.34.23.34.73 0 .96l-13 8.5C3.97 21.42 3 21.33 3 20.5z" fill="currentColor"/>
                <path d="M3 3.5l9.5 9.5L3 20.5V3.5z" fill="currentColor"/>
                <path d="M12.5 13l3.38 3.38-9.5 4.12 6.12-7.5z" fill="currentColor"/>
                <path d="M12.5 11l-6.12-7.5 9.5 4.12L12.5 11z" fill="currentColor"/>
              </svg>
              <span className="nav-play-text">
                <span className="nav-play-sub">GET IT ON</span>
                <span className="nav-play-main">Google Play</span>
              </span>
            </div>
            <span className="nav-play-soon">Coming Soon</span>
          </div>
          {isSignedIn ? (
            <>
              <Link to="/account" className="nav-link">My Account</Link>
              <Link to="/account" className="nav-avatar" aria-label="Account">
                {user?.imageUrl
                  ? <img src={user.imageUrl} alt="avatar" />
                  : <span className="nav-avatar-initials">{initials}</span>
                }
              </Link>
            </>
          ) : (
            <Link to="/signup" className="nav-cta">Get Started</Link>
          )}
        </div>
      </div>
    </nav>
  )
}
