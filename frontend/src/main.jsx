import React from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import App from './App.jsx'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
if (!PUBLISHABLE_KEY) throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in frontend/.env");

const clerkAppearance = {
  variables: {
    colorPrimary:         '#22d3ee',
    colorBackground:      '#08080f',
    colorText:            '#ffffff',
    colorTextSecondary:   'rgba(255, 255, 255, 0.42)',
    colorInputBackground: 'rgba(255, 255, 255, 0.04)',
    colorInputText:       '#ffffff',
    colorNeutral:         'rgba(255, 255, 255, 0.55)',
    fontFamily:           '"Inter", sans-serif',
    borderRadius:         '8px',
  },
  elements: {
    // ── Backdrop ─────────────────────────────────────────────
    modalBackdrop: {
      background:     'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
    },

    // ── Card shell ───────────────────────────────────────────
    card: {
      background:     'rgba(8, 8, 15, 0.96)',
      border:         '1px solid rgba(255, 255, 255, 0.09)',
      borderRadius:   '18px',
      backdropFilter: 'blur(20px)',
      boxShadow:      '0 32px 80px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.05)',
      padding:        '8px',
    },

    // ── Header ───────────────────────────────────────────────
    headerTitle: {
      fontSize:      '1.2rem',
      fontWeight:    '800',
      letterSpacing: '-0.02em',
      color:         '#ffffff',
    },
    headerSubtitle: {
      fontSize:   '0.78rem',
      fontWeight: '400',
      color:      'rgba(255, 255, 255, 0.38)',
      lineHeight: '1.6',
    },

    // ── Close button ─────────────────────────────────────────
    modalCloseButton: {
      color: 'rgba(255, 255, 255, 0.28)',
    },

    // ── Social (Google) button ────────────────────────────────
    socialButtonsBlockButton: {
      background:     'rgba(255, 255, 255, 0.04)',
      border:         '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius:   '8px',
      color:          '#ffffff',
      fontWeight:     '600',
      fontSize:       '0.82rem',
      backdropFilter: 'blur(4px)',
      transition:     'all 0.2s ease',
    },
    socialButtonsProviderIcon: {
      filter: 'none',
    },

    // ── Divider ───────────────────────────────────────────────
    dividerLine: {
      background: 'rgba(255, 255, 255, 0.08)',
    },
    dividerText: {
      color:         'rgba(255, 255, 255, 0.25)',
      fontSize:      '0.62rem',
      fontWeight:    '700',
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
    },

    // ── Form fields ───────────────────────────────────────────
    formFieldLabel: {
      fontSize:      '0.62rem',
      fontWeight:    '700',
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      color:         'rgba(255, 255, 255, 0.4)',
    },
    formFieldInput: {
      background:  'rgba(255, 255, 255, 0.04)',
      border:      '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius:'8px',
      color:       '#ffffff',
      fontSize:    '0.85rem',
    },
    formFieldInputShowPasswordButton: {
      color: 'rgba(255, 255, 255, 0.3)',
    },

    // ── Primary CTA ───────────────────────────────────────────
    formButtonPrimary: {
      background:    'rgba(34, 211, 238, 0.1)',
      border:        '1px solid rgba(34, 211, 238, 0.28)',
      borderRadius:  '8px',
      color:         '#ffffff',
      fontWeight:    '700',
      fontSize:      '0.72rem',
      letterSpacing: '0.16em',
      textTransform: 'uppercase',
      transition:    'all 0.25s ease',
    },

    // ── Footer ────────────────────────────────────────────────
    footer: {
      background:   'rgba(0, 0, 0, 0.18)',
      borderTop:    '1px solid rgba(255, 255, 255, 0.06)',
      borderRadius: '0 0 18px 18px',
    },
    footerActionText: {
      color:    'rgba(255, 255, 255, 0.32)',
      fontSize: '0.75rem',
    },
    footerActionLink: {
      color:      '#22d3ee',
      fontWeight: '700',
      fontSize:   '0.75rem',
    },

    // ── Badge / last-used label ───────────────────────────────
    badge: {
      background: 'rgba(34, 211, 238, 0.08)',
      border:     '1px solid rgba(34, 211, 238, 0.2)',
      color:      '#22d3ee',
      fontSize:   '0.55rem',
    },
  },
};

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} appearance={clerkAppearance}>
      <App />
    </ClerkProvider>
  </React.StrictMode>
)
