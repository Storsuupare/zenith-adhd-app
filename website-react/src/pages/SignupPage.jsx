import { SignUp } from '@clerk/clerk-react'
import SolarBackdrop from '../components/SolarBackdrop.jsx'
import Nav from '../components/Nav.jsx'
export default function SignupPage() {
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
