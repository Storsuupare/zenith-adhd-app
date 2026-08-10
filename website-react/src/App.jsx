import { Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage.jsx'
import PrivacyPage from './pages/PrivacyPage.jsx'
import TermsPage from './pages/TermsPage.jsx'
import RefundPage from './pages/RefundPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import SignupPage from './pages/SignupPage.jsx'
import PaymentSuccessPage from './pages/PaymentSuccessPage.jsx'
import PaymentCancelPage from './pages/PaymentCancelPage.jsx'
import ReleaseNotesPage from './pages/ReleaseNotesPage.jsx'
import AccountPage from './pages/AccountPage.jsx'
import ContactPage from './pages/ContactPage.jsx'
import AdminPage from './pages/AdminPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/"                index element={<HomePage />} />
      <Route path="/privacy"         element={<PrivacyPage />} />
      <Route path="/terms"           element={<TermsPage />} />
      <Route path="/refund"          element={<RefundPage />} />
      <Route path="/login"           element={<LoginPage />} />
      <Route path="/login/*"         element={<LoginPage />} />
      <Route path="/signup"          element={<SignupPage />} />
      <Route path="/signup/*"        element={<SignupPage />} />
      <Route path="/payment/success" element={<PaymentSuccessPage />} />
      <Route path="/payment/cancel"  element={<PaymentCancelPage />} />
      <Route path="/release-notes"   element={<ReleaseNotesPage />} />
      <Route path="/account"         element={<AccountPage />} />
      <Route path="/contact"         element={<ContactPage />} />
      <Route path={import.meta.env.VITE_ADMIN_PATH || '/admin'} element={<AdminPage />} />
      <Route path="*"                element={<NotFoundPage />} />
    </Routes>
  )
}
