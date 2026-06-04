import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ClerkProvider } from '@clerk/clerk-react'
import App from './App.jsx'
import { getSolarPhase, PHASE_ACCENT } from './utils/solar.js'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
if (!PUBLISHABLE_KEY) throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in frontend/.env");

const accent = PHASE_ACCENT[getSolarPhase()] ?? "#22d3ee";

const clerkAppearance = {
  variables: {
    colorPrimary:         accent,
    colorBackground:      '#000000',
    colorText:            '#ffffff',
    colorTextSecondary:   'rgba(255, 255, 255, 0.75)',
    colorInputBackground: 'rgba(255, 255, 255, 0.05)',
    colorInputText:       '#ffffff',
    colorNeutral:         '#ffffff',
    fontFamily:           '"Inter", sans-serif',
    borderRadius:         '10px',
    fontSize:             '16px',
  },
  elements: {
    /* ── Root box — prevents left-side overflow ── */
    rootBox: {
      width:          '100%',
      display:        'flex',
      justifyContent: 'center',
      alignItems:     'center',
    },

    /* ── Backdrop ── */
    modalBackdrop: {
      background:     'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(14px)',
    },

    /* ── Modal content container — safe centering ── */
    modalContent: {
      display:        'flex',
      justifyContent: 'center',
      alignItems:     'center',
      padding:        '16px',
      boxSizing:      'border-box',
      width:          '100%',
    },

    /* ── Card shell — fluid width to prevent overflow ── */
    card: {
      background:    '#000000',
      border:        '1px solid rgba(255, 255, 255, 0.13)',
      borderRadius:  '20px',
      boxShadow:     `0 40px 100px rgba(0,0,0,0.90), 0 0 0 1px ${accent}18 inset, 0 0 60px ${accent}08`,
      padding:       '8px',
      width:         '100%',
      maxWidth:      '420px',
      margin:        '0 auto',
      boxSizing:     'border-box',
    },

    /* ── Sign-up first/last name — stack vertically, not side-by-side ── */
    formFieldRow: {
      display:       'flex',
      flexDirection: 'column',
      gap:           '16px',
      width:         '100%',
    },
    formField: {
      width: '100%',
    },

    /* ── Header ── */
    headerTitle: {
      fontFamily:    '"JetBrains Mono", "Courier New", monospace',
      fontSize:      '1.1rem',
      fontWeight:    '800',
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color:         '#ffffff',
    },
    headerSubtitle: {
      fontSize:   '0.82rem',
      fontWeight: '400',
      color:      'rgba(255, 255, 255, 0.55)',
      lineHeight: '1.65',
      marginTop:  '6px',
    },

    /* ── Close button ── */
    modalCloseButton: {
      color:        'rgba(255, 255, 255, 0.55)',
      background:   'rgba(255, 255, 255, 0.06)',
      borderRadius: '6px',
      border:       '1px solid rgba(255, 255, 255, 0.10)',
    },

    /* ── Social (Google) button ── */
    socialButtonsBlockButton: {
      background:   'rgba(255, 255, 255, 0.05)',
      border:       '1px solid rgba(255, 255, 255, 0.14)',
      borderRadius: '10px',
      color:        '#ffffff',
      fontWeight:   '600',
      fontSize:     '0.88rem',
      padding:      '12px 16px',
      transition:   'all 0.2s ease',
      width:        '100%',
      boxSizing:    'border-box',
    },
    socialButtonsBlockButtonText: {
      color:      '#ffffff',
      fontWeight: '600',
    },
    socialButtonsProviderIcon: {
      filter: 'none',
    },

    /* ── Divider ── */
    dividerLine: {
      background: 'rgba(255, 255, 255, 0.10)',
    },
    dividerText: {
      color:         'rgba(255, 255, 255, 0.40)',
      fontSize:      '0.62rem',
      fontWeight:    '700',
      letterSpacing: '0.14em',
      textTransform: 'uppercase',
      fontFamily:    '"JetBrains Mono", monospace',
    },

    /* ── Form labels — monospace uppercase diagnostic style ── */
    formFieldLabel: {
      fontFamily:    '"JetBrains Mono", "Courier New", monospace',
      fontSize:      '0.62rem',
      fontWeight:    '700',
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      color:         'rgba(255, 255, 255, 0.65)',
      marginBottom:  '8px',
      display:       'block',
    },

    /* ── Inputs — 16 px prevents iOS forced-zoom ── */
    formFieldInput: {
      background:   'rgba(255, 255, 255, 0.05)',
      border:       '1px solid rgba(255, 255, 255, 0.16)',
      borderRadius: '10px',
      color:        '#ffffff',
      fontSize:     '16px',
      padding:      '13px 16px',
      width:        '100%',
      boxSizing:    'border-box',
      transition:   'border-color 0.18s ease, box-shadow 0.18s ease',
      outline:      'none',
    },
    formFieldInputShowPasswordButton: {
      color: 'rgba(255, 255, 255, 0.50)',
    },

    /* ── Field hints & errors ── */
    formFieldHintText: {
      color:    'rgba(255, 255, 255, 0.45)',
      fontSize: '0.72rem',
    },
    formFieldErrorText: {
      color:      '#ff6b6b',
      fontSize:   '0.72rem',
      fontWeight: '500',
    },
    alertText: {
      color: '#ffffff',
    },

    /* ── Primary CTA — phase accent border ── */
    formButtonPrimary: {
      background:    'rgba(255, 255, 255, 0.04)',
      border:        `1px solid ${accent}`,
      borderRadius:  '10px',
      color:         '#ffffff',
      fontFamily:    '"JetBrains Mono", "Courier New", monospace',
      fontWeight:    '800',
      fontSize:      '0.68rem',
      letterSpacing: '0.20em',
      textTransform: 'uppercase',
      padding:       '14px 24px',
      transition:    'background 0.22s ease, box-shadow 0.22s ease',
      width:         '100%',
      boxSizing:     'border-box',
    },

    /* ── Secondary / ghost ── */
    formButtonReset: {
      color:      'rgba(255, 255, 255, 0.65)',
      fontWeight: '600',
      fontSize:   '0.78rem',
    },

    /* ── Identity preview ── */
    identityPreviewText: {
      color:      '#ffffff',
      fontWeight: '500',
      fontSize:   '0.85rem',
    },
    identityPreviewEditButton: {
      color:      accent,
      fontWeight: '600',
    },

    /* ── OTP inputs ── */
    otpCodeFieldInput: {
      background:   'rgba(255, 255, 255, 0.06)',
      border:       '1px solid rgba(255, 255, 255, 0.16)',
      borderRadius: '8px',
      color:        '#ffffff',
      fontSize:     '1.1rem',
      fontWeight:   '700',
    },

    /* ── Footer — "Don't have an account?" redesign ── */
    footer: {
      background:    'transparent',
      borderTop:     '1px solid rgba(255, 255, 255, 0.07)',
      borderRadius:  '0 0 20px 20px',
      padding:       '18px 24px 20px',
      display:       'flex',
      justifyContent: 'center',
      alignItems:    'center',
      gap:           '8px',
    },
    footerActionText: {
      fontFamily:    '"JetBrains Mono", "Courier New", monospace',
      color:         'rgba(255, 255, 255, 0.38)',
      fontSize:      '0.70rem',
      fontWeight:    '500',
      letterSpacing: '0.04em',
    },
    footerActionLink: {
      fontFamily:    '"JetBrains Mono", "Courier New", monospace',
      color:         accent,
      fontWeight:    '700',
      fontSize:      '0.70rem',
      letterSpacing: '0.10em',
      textTransform: 'uppercase',
      textDecoration: 'none',
      borderBottom:  `1px solid ${accent}55`,
      paddingBottom: '1px',
    },

    /* ── Badge / last-used label ── */
    badge: {
      background: `${accent}18`,
      border:     `1px solid ${accent}44`,
      color:      accent,
      fontSize:   '0.55rem',
      fontWeight: '700',
    },

    /* ── Resend / action links ── */
    formResendCodeLink: {
      color:      accent,
      fontWeight: '600',
      fontSize:   '0.78rem',
    },
  },
};

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ClerkProvider publishableKey={PUBLISHABLE_KEY} appearance={clerkAppearance}>
        <App />
      </ClerkProvider>
    </BrowserRouter>
  </React.StrictMode>
)
