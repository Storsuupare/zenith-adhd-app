import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import SolarBackdrop from '../components/SolarBackdrop.jsx'
import Nav from '../components/Nav.jsx'
import { useSEO } from '../hooks/useSEO.js'

const TIERS = ['FREE', 'PRO', 'ELITE']

const TIER_CLS = {
  FREE:  'adm-tier--free',
  PRO:   'adm-tier--pro',
  ELITE: 'adm-tier--elite',
  ADMIN: 'adm-tier--admin',
}

export default function AdminPage() {
  useSEO({ title: 'Admin — Zenith', path: window.location.pathname, noindex: true })

  const { getToken, isLoaded, isSignedIn } = useAuth()
  const navigate = useNavigate()

  const [users,   setUsers]   = useState([])
  const [search,  setSearch]  = useState('')
  const [loading, setLoading] = useState(true)
  const [toast,   setToast]   = useState(null)
  const [pending, setPending] = useState(null)
  const [banReason, setBanReason] = useState('')

  // Redirect signed-out users before making any requests
  useEffect(() => {
    if (isLoaded && !isSignedIn) navigate('/login')
  }, [isLoaded, isSignedIn, navigate])

  const fetchUsers = useCallback(async (q = '') => {
    setLoading(true)
    try {
      const token = await getToken()
      const url   = `${import.meta.env.VITE_BACKEND_URL}/admin/users${q ? `?search=${encodeURIComponent(q)}` : ''}`
      const res   = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 401) { navigate('/login'); return }
      if (res.status === 403) { navigate('/'); return }
      if (!res.ok) throw new Error()
      setUsers(await res.json())
    } catch {
      showToast('Failed to load users.', 'error')
    } finally {
      setLoading(false)
    }
  }, [getToken, navigate])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  useEffect(() => {
    const t = setTimeout(() => fetchUsers(search), 350)
    return () => clearTimeout(t)
  }, [search, fetchUsers])

  function showToast(msg, type = 'ok') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function toggleBan(externalId, username, currentlyBanned) {
    const key = `${externalId}-ban`
    setPending(key)
    try {
      const token = await getToken()
      const res   = await fetch(`${import.meta.env.VITE_BACKEND_URL}/admin/ban-user`, {
        method:  'POST',
        headers: {
          Authorization:  `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          externalId,
          ban:    !currentlyBanned,
          reason: !currentlyBanned ? (banReason.trim() || 'Banned by admin.') : null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setUsers(prev => prev.map(u =>
        u.external_id === externalId ? { ...u, is_banned: data.is_banned } : u
      ))
      showToast(`${username} ${data.is_banned ? 'banned' : 'unbanned'}`, data.is_banned ? 'error' : 'ok')
      setBanReason('')
    } catch (e) {
      showToast(e.message || 'Failed to update ban.', 'error')
    } finally {
      setPending(null)
    }
  }

  async function grantTier(externalId, username, tier) {
    const key = `${externalId}-${tier}`
    setPending(key)
    try {
      const token = await getToken()
      const res   = await fetch(`${import.meta.env.VITE_BACKEND_URL}/admin/grant-tier`, {
        method:  'POST',
        headers: {
          Authorization:  `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ externalId, tier }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setUsers(prev => prev.map(u =>
        u.external_id === externalId ? { ...u, role: data.role, account_tier: data.tier } : u
      ))
      showToast(`${username} → ${tier}`, 'ok')
    } catch (e) {
      showToast(e.message || 'Failed to update tier.', 'error')
    } finally {
      setPending(null)
    }
  }

  return (
    <>
      <SolarBackdrop />
      <Nav />
      <main className="legal-main">
        <div className="adm-page">

          <div className="adm-header">
            <span className="legal-eyebrow">◈ Admin</span>
            <h1 className="legal-title">User Management</h1>
          </div>

          <div className="adm-controls">
            <input
              className="adm-search"
              type="search"
              placeholder="Search by username or email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <input
              className="adm-search"
              type="text"
              placeholder="Ban reason (optional)…"
              value={banReason}
              onChange={e => setBanReason(e.target.value)}
            />
          </div>

          {loading ? (
            <p className="adm-state">Loading users…</p>
          ) : users.length === 0 ? (
            <p className="adm-state">No users found.</p>
          ) : (
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Tier</th>
                    <th>Level</th>
                    <th>Total XP</th>
                    <th>Grant Tier</th>
                    <th>Ban</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.external_id}>
                      <td className="adm-username">{u.username}</td>
                      <td className="adm-email">{u.email_address}</td>
                      <td>
                        <span className={`adm-tier-chip ${TIER_CLS[u.role] ?? TIER_CLS.FREE}`}>
                          {u.role}
                        </span>
                        {u.is_admin && (
                          <span className="adm-tier-chip adm-tier--admin" style={{ marginLeft: '4px' }}>ADMIN</span>
                        )}
                      </td>
                      <td>{u.level}</td>
                      <td>{(u.total_xp ?? 0).toLocaleString()}</td>
                      <td>
                        {u.is_admin ? (
                          <span className="adm-protected">—</span>
                        ) : (
                          <div className="adm-tier-btns">
                            {TIERS.map(t => (
                              <button
                                key={t}
                                className={`adm-tier-btn adm-tier-btn--${t.toLowerCase()}${u.role === t ? ' active' : ''}`}
                                disabled={u.role === t || pending === `${u.external_id}-${t}`}
                                onClick={() => grantTier(u.external_id, u.username, t)}
                              >
                                {t}
                              </button>
                            ))}
                          </div>
                        )}
                      </td>
                      <td>
                        {u.is_admin ? (
                          <span className="adm-protected">—</span>
                        ) : (
                          <button
                            className={`adm-ban-btn${u.is_banned ? ' adm-ban-btn--unban' : ''}`}
                            disabled={pending === `${u.external_id}-ban`}
                            onClick={() => toggleBan(u.external_id, u.username, u.is_banned)}
                          >
                            {u.is_banned ? 'Unban' : 'Ban'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="adm-count">{users.length} user{users.length !== 1 ? 's' : ''}</p>
        </div>
      </main>

      {toast && (
        <div className={`adm-toast adm-toast--${toast.type}`}>
          {toast.msg}
        </div>
      )}
    </>
  )
}
