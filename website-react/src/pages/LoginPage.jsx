import { SignIn } from '@clerk/clerk-react'
import SolarBackdrop from '../components/SolarBackdrop.jsx'
import Nav from '../components/Nav.jsx'
export default function LoginPage() {
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
