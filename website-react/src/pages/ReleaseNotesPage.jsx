import { useEffect } from 'react'
import SolarBackdrop from '../components/SolarBackdrop.jsx'
import Nav from '../components/Nav.jsx'
import Footer from '../components/Footer.jsx'
import { CHANGELOG } from '../data/changelog.js'

const TYPE_META = {
  new:     { label: 'NEW',     cls: 'rn-chip--new'     },
  fix:     { label: 'FIX',     cls: 'rn-chip--fix'     },
  change:  { label: 'CHANGE',  cls: 'rn-chip--change'  },
  removed: { label: 'REMOVED', cls: 'rn-chip--removed' },
}

export default function ReleaseNotesPage() {
  useEffect(() => {
    localStorage.setItem('zenith_rn_seen', CHANGELOG[0].version)
  }, [])

  return (
    <>
      <SolarBackdrop />
      <Nav />
      <main className="legal-main">
        <div className="legal-section">
          <span className="legal-eyebrow">◈ System Log</span>
          <h1 className="legal-title">Release Notes</h1>
          <span className="legal-updated">Current version: {CHANGELOG[0].version}</span>

          <div className="rn-feed">
            {CHANGELOG.map((release, i) => (
              <div key={release.version} className="rn-block">
                <div className="rn-block-header">
                  <div className="rn-version-row">
                    <span className="rn-version">v{release.version}</span>
                    {i === 0 && <span className="rn-latest-badge">LATEST</span>}
                  </div>
                  <span className="rn-date">{release.date}</span>
                  <span className="rn-release-title">{release.title}</span>
                </div>
                <ul className="rn-entry-list">
                  {release.entries.map((entry, j) => {
                    const meta = TYPE_META[entry.type] ?? TYPE_META.change
                    return (
                      <li key={j} className="rn-entry">
                        <span className={`rn-chip ${meta.cls}`}>{meta.label}</span>
                        <span className="rn-entry-text">{entry.text}</span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
