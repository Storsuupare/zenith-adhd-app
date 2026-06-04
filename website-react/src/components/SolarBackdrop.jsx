import { useEffect, useRef } from 'react'
import { useSolarPhase } from '../hooks/useSolarPhase.js'

export default function SolarBackdrop() {
  const phase = useSolarPhase()
  const starsRef = useRef(null)

  useEffect(() => {
    document.body.className = `phase-${phase}`
    return () => { document.body.className = '' }
  }, [phase])

  useEffect(() => {
    if (phase !== 'night' || !starsRef.current) return
    const el = starsRef.current
    el.innerHTML = ''
    for (let i = 0; i < 60; i++) {
      const star = document.createElement('span')
      star.className = 'star'
      star.style.left           = ((i * 37) % 100) + '%'
      star.style.top            = ((i * 53) % 90)  + '%'
      star.style.width          = (1 + ((i * 7) % 3)) + 'px'
      star.style.height         = star.style.width
      star.style.animationDelay = ((i * 0.37) % 4) + 's'
      el.appendChild(star)
    }
  }, [phase])

  const showClouds = phase === 'morning' || phase === 'day'

  return (
    <div className="solar-backdrop" aria-hidden="true">
      {phase !== 'night' && (
        <div className={`sun sun-${phase}`} />
      )}
      <div className="backdrop-clouds" style={{ display: showClouds ? 'block' : 'none' }}>
        <div className="cloud cloud-1" />
        <div className="cloud cloud-2" />
        <div className="cloud cloud-3" />
        <div className="cloud cloud-4" />
      </div>
      <div className="backdrop-night" style={{ display: phase === 'night' ? 'block' : 'none' }}>
        <div className="moon"><div className="moon-glow" /></div>
        <div className="stars" ref={starsRef} />
      </div>
    </div>
  )
}
