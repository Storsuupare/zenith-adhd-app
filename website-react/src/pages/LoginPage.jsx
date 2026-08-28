import { SignIn } from '@clerk/clerk-react'
import SolarBackdrop from '../components/SolarBackdrop.jsx'
import Nav from '../components/Nav.jsx'
import { useSEO } from '../hooks/useSEO.js'
export default function LoginPage() {
  useSEO({ title: 'Log In — Zenith', path: '/login', noindex: true })

  return (
    <>
      <SolarBackdrop />
      <Nav />
      <div className="auth-page-wrap">
        <SignIn
          routing="path"
          path="/login"
          signUpUrl="/signup"
          afterSignInUrl="/account"
        />
      </div>
    </>
  )
}
