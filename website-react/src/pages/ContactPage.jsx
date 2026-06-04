import { useState } from 'react'
import { useUser } from '@clerk/clerk-react'
import SolarBackdrop from '../components/SolarBackdrop.jsx'
import Nav from '../components/Nav.jsx'

const TOPICS = [
  'General Inquiry',
  'Bug Report',
  'Subscription & Billing',
  'Feature Request',
  'Account Issue',
  'Other',
]

export default function ContactPage() {
  const { user } = useUser()

  const [form, setForm] = useState({
    email:   user?.primaryEmailAddress?.emailAddress ?? '',
    topic:   '',
    message: '',
  })
  const [sent, setSent]       = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/contact`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      })
      if (!res.ok) throw new Error('Failed')
      setSent(true)
    } catch {
      setError('Something went wrong. Try emailing us directly at contact@zenithapp.org.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <SolarBackdrop />
      <Nav />
      <main className="legal-main">
        <div className="contact-page">
          <span className="legal-eyebrow">◈ Support</span>
          <h1 className="legal-title">Contact Us</h1>
          <p className="contact-sub">
            We read every message. Typical response time is 1–2 business days.
          </p>

          {sent ? (
            <div className="contact-sent">
              <span className="contact-sent-icon">✓</span>
              <p>Message sent. We'll get back to you within 1–2 business days at <strong>{form.email}</strong>.</p>
            </div>
          ) : (
            <form className="contact-form" onSubmit={handleSubmit} noValidate>
              <div className="contact-field">
                <label className="contact-label" htmlFor="cf-email">Your email</label>
                <input
                  id="cf-email"
                  className="contact-input"
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={e => set('email', e.target.value)}
                  required
                />
              </div>

              <div className="contact-field">
                <label className="contact-label" htmlFor="cf-topic">Topic</label>
                <select
                  id="cf-topic"
                  className="contact-input contact-select"
                  value={form.topic}
                  onChange={e => set('topic', e.target.value)}
                  required
                >
                  <option value="" disabled>Select a topic…</option>
                  {TOPICS.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="contact-field">
                <label className="contact-label" htmlFor="cf-message">Message</label>
                <textarea
                  id="cf-message"
                  className="contact-input contact-textarea"
                  placeholder="Describe your issue or question in detail…"
                  value={form.message}
                  onChange={e => set('message', e.target.value)}
                  required
                  rows={6}
                />
              </div>

              {error && <p style={{ color: '#f87171', fontSize: '0.85rem' }}>{error}</p>}
              <div className="contact-footer-row">
                <span className="contact-recipient">Sends to contact@zenithapp.org</span>
                <button type="submit" className="contact-submit" disabled={loading}>
                  {loading ? 'Sending…' : 'Send Message'}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </>
  )
}
