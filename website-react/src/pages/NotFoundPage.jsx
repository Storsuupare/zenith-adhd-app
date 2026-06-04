import { Link } from 'react-router-dom'
import SolarBackdrop from '../components/SolarBackdrop.jsx'
import Nav from '../components/Nav.jsx'

export default function NotFoundPage() {
  return (
    <>
      <SolarBackdrop />
      <Nav />
      <div className="notfound-wrap">
        <div className="notfound-code">404</div>
        <h1 className="notfound-title">Mission not found.</h1>
        <p className="notfound-sub">This page doesn't exist — or it moved. Head back to base and try again.</p>
        <Link to="/" className="notfound-btn">Back to Zenith</Link>
      </div>
    </>
  )
}
