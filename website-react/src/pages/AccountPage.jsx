import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth, useUser, useClerk } from '@clerk/clerk-react'
import SolarBackdrop from '../components/SolarBackdrop.jsx'
import Nav from '../components/Nav.jsx'
import { useSEO } from '../hooks/useSEO.js'


export default function AccountPage() {
  useSEO({ title: 'Account — Zenith', path: '/account', noindex: true })

  const { isSignedIn, getToken } = useAuth()
  const { user }                 = useUser()
  const { signOut }              = useClerk()
  const navigate                 = useNavigate()

  const [profile,       setProfile]       = useState(null)
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting,      setDeleting]      = useState(false)

  useEffect(() => {
    if (isSignedIn === false) navigate('/login')
  }, [isSignedIn, navigate])

  useEffect(() => {
    if (!user) return
    async function loadProfile() {
      try {
        const token = await getToken()
        const res   = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/user/${user.id}`,
          { headers: { Authorization: `Bearer ${token}` } },
        )
        if (!res.ok) throw new Error('Failed to load profile')
        setProfile(await res.json())
      } catch (fetchErr) {
        setError('Could not load your profile. Please refresh or try again later.')
      } finally {
        setLoading(false)
      }
    }
    loadProfile()
  }, [user])

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const token = await getToken()
      const res   = await fetch(`${import.meta.env.VITE_BACKEND_URL}/user/account`, {
        method:  'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Deletion failed')
      await signOut()
      navigate('/')
    } catch (deleteErr) {
      setError('Account deletion failed. Please try again or contact support.')
      setDeleting(false)
      setDeleteConfirm(false)
    }
  }

  const topSkills = (profile?.mastery ?? [])
    .slice()
    .sort((skillA, skillB) => skillB.current_xp - skillA.current_xp)
    .slice(0, 3)

  const prestigeCount = (profile?.mastery ?? [])
    .reduce((total, skill) => total + (skill.prestige_level ?? 0), 0)

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
              {profile?.username && (
                <span className="acc-username">{profile.username}</span>
              )}
              <span className="acc-name">
                {user?.firstName} {user?.lastName}
              </span>
              <span className="acc-email">
                {user?.primaryEmailAddress?.emailAddress}
              </span>
            </div>
          </div>

          {/* ── Stats ── */}
          {loading && <p className="acc-loading">Loading your stats…</p>}
          {error   && <p className="acc-error">{error}</p>}

          {profile && (
            <>
              {/* Level · Total XP · Streak */}
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
                <div className="acc-stat">
                  <span className="acc-stat-value">{profile.streak ?? 0}</span>
                  <span className="acc-stat-label">Streak</span>
                </div>
              </div>

              {/* Credits · Prestiges */}
              <div className="acc-stats">
                <div className="acc-stat">
                  <span className="acc-stat-value">
                    {(profile.system_credits ?? 0).toLocaleString()}
                  </span>
                  <span className="acc-stat-label">Credits</span>
                </div>
                <div className="acc-stat-divider" />
                <div className="acc-stat">
                  <span className="acc-stat-value">{prestigeCount}</span>
                  <span className="acc-stat-label">Prestiges</span>
                </div>
              </div>

              {/* Top skills */}
              {topSkills.length > 0 && (
                <div className="acc-skills">
                  <span className="acc-section-label">Top Skills</span>
                  {topSkills.map(skill => (
                    <div key={skill.skill_id} className="acc-skill-row">
                      <span className="acc-skill-name">{skill.skill_name}</span>
                      <span className="acc-skill-level">Lv.{skill.current_level}</span>
                      <div className="acc-skill-bar">
                        <div
                          className="acc-skill-fill"
                          style={{
                            width: `${Math.min((skill.current_xp / skill.next_level_xp) * 100, 100)}%`,
                          }}
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
              href={import.meta.env.VITE_APP_URL || 'https://zenithapp.org'}
              className="acc-btn acc-btn--primary"
            >
              Open App ↗
            </a>
            <button
              className="acc-btn acc-btn--signout"
              onClick={() => signOut(() => navigate('/'))}
            >
              Sign Out
            </button>
          </div>

          {/* ── Danger zone ── */}
          <div className="acc-danger-zone">
            <span className="acc-section-label acc-section-label--danger">Danger Zone</span>
            {!deleteConfirm ? (
              <button
                className="acc-btn acc-btn--danger"
                onClick={() => setDeleteConfirm(true)}
              >
                Delete Account
              </button>
            ) : (
              <div className="acc-confirm-box">
                <p className="acc-confirm-text">
                  This permanently deletes your account, all XP, skills, credits, and inventory.
                  There is no recovery — this cannot be undone.
                </p>
                <button
                  className="acc-btn acc-btn--danger-confirm"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? 'Deleting…' : 'Yes, delete everything'}
                </button>
                <button
                  className="acc-btn acc-btn--signout"
                  onClick={() => setDeleteConfirm(false)}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

        </div>
      </main>
    </>
  )
}
