import React, { useState, useRef, useCallback, useEffect } from 'react';
import { init, setVolume as updateEngineVolume, getVolume } from '../../../src/audio/audioEngine';
import './VolumeSlider.css';

export default function VolumeSlider() {
  const [vol, setVol]       = useState(getVolume() || 0.3);
  const [active, setActive] = useState(false);
  const trackRef  = useRef(null);
  const dragging  = useRef(false);

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

    const onMove = (e) => apply(e.clientY);
    const onUp   = () => {
      dragging.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
  };

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    const onTouchStart = (e) => {
      e.preventDefault();
      init();
      dragging.current = true;
      apply(e.touches[0].clientY);
    };

    const onTouchMove = (e) => {
      if (!dragging.current) return;
      e.preventDefault();
      apply(e.touches[0].clientY);
    };

    const onTouchEnd = () => {
      dragging.current = false;
    };

    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove',  onTouchMove,  { passive: false });
    el.addEventListener('touchend',   onTouchEnd);

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove',  onTouchMove);
      el.removeEventListener('touchend',   onTouchEnd);
    };
  }, [apply]);

  return (
    <div
      ref={trackRef}
      className={`vol-track ${active ? 'vol-active' : ''}`}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      onMouseDown={onMouseDown}
      title={`Volume ${Math.round(vol * 100)}%`}
    >
      <div className="vol-fill"  style={{ height: `${vol * 100}%` }} />
      <div className="vol-thumb" style={{ bottom: `calc(${vol * 100}% - 5px)` }} />
    </div>
  );
}
