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
          {isSignedIn ? (
            <>
              <a href={import.meta.env.VITE_APP_URL || '#'} className="nav-cta">Open App ↗</a>
              <Link to="/account" className="nav-avatar" aria-label="Account">
                {user?.imageUrl
                  ? <img src={user.imageUrl} alt="avatar" />
                  : <span className="nav-avatar-initials">{initials}</span>
                }
              </Link>
            </>
          ) : (
            <>
              <a href="mailto:contact@zenithapp.org" className="nav-link">Feedback</a>
              <Link to="/login"  className="nav-link">Sign In</Link>
              <Link to="/signup" className="nav-cta">Get Started</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
