import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CHANGELOG } from "../data/changelog";
import "./ReleaseNotesPage.css";

const TYPE_META = {
  new:     { label: "NEW",     className: "chip--new"     },
  fix:     { label: "FIX",     className: "chip--fix"     },
  change:  { label: "CHANGE",  className: "chip--change"  },
  removed: { label: "REMOVED", className: "chip--removed" },
};

const ReleaseNotesPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    if (CHANGELOG.length > 0) {
      localStorage.setItem("zenith_changelog_seen", CHANGELOG[0].version);
    }
  }, []);

  return (
    <div className="rn-page">
      <div className="rn-header">
        <button
          className="page-back-btn"
          onClick={() => navigate("/dashboard")}
          aria-label="Back to dashboard"
        >
          ‹
        </button>
        <div className="rn-header-text">
          <span className="rn-eyebrow">◈ System Log</span>
          <h1 className="rn-title">Release Notes</h1>
        </div>
      </div>

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
                const meta = TYPE_META[entry.type] ?? TYPE_META.change;
                return (
                  <li key={j} className="rn-entry">
                    <span className={`rn-chip ${meta.className}`}>
                      {meta.label}
                    </span>
                    <span className="rn-entry-text">{entry.text}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReleaseNotesPage;
