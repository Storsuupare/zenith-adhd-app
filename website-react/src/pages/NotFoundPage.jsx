import { Link } from 'react-router-dom'
import SolarBackdrop from '../components/SolarBackdrop.jsx'
import Nav from '../components/Nav.jsx'
import { useSEO } from '../hooks/useSEO.js'

export default function NotFoundPage() {
  useSEO({ title: 'Page Not Found — Zenith', path: window.location.pathname, noindex: true })

  return (
    <>
      <SolarBackdrop />
      <Nav />
      <div className="notfound-wrap">
        <div className="notfound-code">404</div>
        <h1 className="notfound-title">Yikes! Looks like this link lost focus.</h1>
        <p className="notfound-sub">Even the best sessions get interrupted. This page isn't one of them — it just doesn't exist.</p>
        <Link to="/" className="notfound-btn">Back to Zenith</Link>
      </div>
    </>
  )
}
