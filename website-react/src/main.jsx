import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ClerkProvider } from '@clerk/clerk-react'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { reportClientError } from './services/reportClientError.js'
import './styles/global.css'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env')
}

// Catches errors escaping everywhere a React error boundary can't see —
// event handlers, async callbacks, promise rejections.
window.addEventListener('error', (event) => {
  reportClientError({
    message: event.message,
    stack:   event.error?.stack,
    screen:  'window_error',
  })
})
window.addEventListener('unhandledrejection', (event) => {
  reportClientError({
    message: event.reason?.message ?? String(event.reason),
    stack:   event.reason?.stack,
    screen:  'unhandled_rejection',
  })
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ClerkProvider>
    </ErrorBoundary>
  </StrictMode>,
)
