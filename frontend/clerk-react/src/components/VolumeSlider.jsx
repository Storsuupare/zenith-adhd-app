import React, { useState, useRef, useCallback } from 'react';
import { init, setVolume as updateEngineVolume, getVolume } from '../../../src/audio/audioEngine';
import './VolumeSlider.css';

export default function VolumeSlider() {
  const [vol, setVol] = useState(getVolume() || 0.3);
  const [active, setActive] = useState(false);
  const trackRef = useRef(null);
  const dragging = useRef(false);
  
  const calcVol = useCallback((clientY) => {
    if (!trackRef.current) return 0;
    const rect = trackRef.current.getBoundingClientRect();
    return 1 - Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
  }, []);

  const apply = useCallback((clientY) => {
    const v = calcVol(clientY);
    setVol(v);
    updateEngineVolume(v);
  }, [calcVol]);

  const onMouseDown = (e) => {
    init(); 
    dragging.current = true;
    apply(e.clientY);
    
    const handleGlobalMove = (moveEvent) => apply(moveEvent.clientY);
    const handleGlobalUp = () => {
      dragging.current = false;
      window.removeEventListener('mousemove', handleGlobalMove);
      window.removeEventListener('mouseup', handleGlobalUp);
    };
    
    window.addEventListener('mousemove', handleGlobalMove);
    window.addEventListener('mouseup', handleGlobalUp);
  };

  return (
    <div
      ref={trackRef}
      className={`vol-track ${active ? 'vol-active' : ''}`}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      onMouseDown={onMouseDown}
      title={`Volume ${Math.round(vol * 100)}%`}
    >
      <div className="vol-fill" style={{ height: `${vol * 100}%` }} />
      <div className="vol-thumb" style={{ bottom: `calc(${vol * 100}% - 5px)` }} />
    </div>
  );
}