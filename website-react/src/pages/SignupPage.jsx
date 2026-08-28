import { SignUp } from '@clerk/clerk-react'
import SolarBackdrop from '../components/SolarBackdrop.jsx'
import Nav from '../components/Nav.jsx'
import { useSEO } from '../hooks/useSEO.js'
export default function SignupPage() {
  useSEO({ title: 'Sign Up — Zenith', path: '/signup', noindex: true })

  return (
    <>
      <SolarBackdrop />
      <Nav />
      <div className="auth-page-wrap">
        <SignUp
          routing="path"
          path="/signup"
          signInUrl="/login"
          afterSignUpUrl="/account"
        />
      </div>
    </>
  )
}
