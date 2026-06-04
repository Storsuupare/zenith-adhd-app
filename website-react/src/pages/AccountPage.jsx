import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth, useUser, useClerk } from '@clerk/clerk-react'
import SolarBackdrop from '../components/SolarBackdrop.jsx'
import Nav from '../components/Nav.jsx'

const TIER_META = {
  FREE:  { label: 'FREE',  cls: 'acc-tier--free'  },
  PRO:   { label: 'PRO',   cls: 'acc-tier--pro'   },
  ELITE: { label: 'ELITE', cls: 'acc-tier--elite' },
}

export default function AccountPage() {
  const { isSignedIn, getToken } = useAuth()
  const { user } = useUser()
  const { signOut } = useClerk()
  const navigate = useNavigate()

  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    if (isSignedIn === false) navigate('/login')
  }, [isSignedIn, navigate])

  useEffect(() => {
    if (!user) return
    async function load() {
      try {
        const token = await getToken()
        const res   = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/user/${user.id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        if (!res.ok) throw new Error('Failed to load profile')
        setProfile(await res.json())
      } catch (e) {
        setError('Could not load your profile. Make sure the app backend is running.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user])

  const tierKey  = profile?.role ?? 'FREE'
  const tierMeta = TIER_META[tierKey] ?? TIER_META.FREE
  const topSkills = (profile?.mastery ?? [])
    .slice()
    .sort((a, b) => b.current_xp - a.current_xp)
    .slice(0, 3)

  const initials = user
    ? ((user.firstName?.[0] ?? '') + (user.lastName?.[0] ?? '')).toUpperCase() || '?'
    : '?'

  return (
    <>
      <SolarBackdrop />
      <Nav />
      <main className="legal-main">
        <div className="acc-page">

          {/* ── Header ── */}
          <div className="acc-header">
            <div className="acc-avatar">
              {user?.imageUrl
                ? <img src={user.imageUrl} alt="avatar" />
                : <span className="acc-avatar-initials">{initials}</span>
              }
            </div>
            <div className="acc-identity">
              <span className="acc-name">
                {user?.firstName} {user?.lastName}
              </span>
              <span className="acc-email">
                {user?.primaryEmailAddress?.emailAddress}
              </span>
              <span className={`acc-tier-badge ${tierMeta.cls}`}>
                {tierMeta.label}
              </span>
            </div>
          </div>

          {/* ── Stats ── */}
          {loading && <p className="acc-loading">Loading your stats…</p>}
          {error   && <p className="acc-error">{error}</p>}

          {profile && (
            <>
              <div className="acc-stats">
                <div className="acc-stat">
                  <span className="acc-stat-value">{profile.level ?? '—'}</span>
                  <span className="acc-stat-label">Level</span>
                </div>
                <div className="acc-stat-divider" />
                <div className="acc-stat">
                  <span className="acc-stat-value">
                    {profile.total_xp != null ? profile.total_xp.toLocaleString() : '—'}
                  </span>
                  <span className="acc-stat-label">Total XP</span>
                </div>
                <div className="acc-stat-divider" />
              </div>

              {topSkills.length > 0 && (
                <div className="acc-skills">
                  <span className="acc-section-label">Top Skills</span>
                  {topSkills.map(s => (
                    <div key={s.skill_id} className="acc-skill-row">
                      <span className="acc-skill-name">{s.skill_name}</span>
                      <span className="acc-skill-level">Lv.{s.current_level}</span>
                      <div className="acc-skill-bar">
                        <div
                          className="acc-skill-fill"
                          style={{ width: `${Math.min((s.current_xp / s.next_level_xp) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── Actions ── */}
          <div className="acc-actions">
            <a
              href={import.meta.env.VITE_APP_URL || '#'}
              className="acc-btn acc-btn--primary"
            >
              Open App ↗
            </a>
            {tierKey !== 'ELITE' && (
              <a href="/#pricing" className="acc-btn acc-btn--upgrade">
                {tierKey === 'FREE' ? 'Upgrade to PRO' : 'Upgrade to ELITE'}
              </a>
            )}
            <button
              className="acc-btn acc-btn--signout"
              onClick={() => signOut(() => navigate('/'))}
            >
              Sign Out
            </button>
          </div>

        </div>
      </main>
    </>
  )
}
