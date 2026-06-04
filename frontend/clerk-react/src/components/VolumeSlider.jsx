import React, { useState, useRef, useCallback, useEffect } from 'react';
import { init, setVolume as updateEngineVolume, getVolume } from '../../../src/audio/audioEngine';
import './VolumeSlider.css';

export default function VolumeSlider() {
  const [vol, setVol]       = useState(getVolume() || 0.3);
  const [active, setActive] = useState(false);
  const trackRef  = useRef(null);
  const dragging  = useRef(false);
  const rectRef   = useRef(null);

  const calcVol = useCallback((clientY) => {
    const rect = rectRef.current ?? trackRef.current?.getBoundingClientRect();
    if (!rect) return 0;
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
    rectRef.current = trackRef.current?.getBoundingClientRect() ?? null;
    apply(e.clientY);

    const onMove = (e) => apply(e.clientY);
    const onUp   = () => {
      dragging.current = false;
      rectRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('mouseup',   onUp);
  };

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    const onTouchStart = (e) => {
      e.preventDefault();
      init();
      dragging.current = true;
      rectRef.current = trackRef.current?.getBoundingClientRect() ?? null;
      apply(e.touches[0].clientY);
    };

    const onTouchMove = (e) => {
      if (!dragging.current) return;
      e.preventDefault();
      apply(e.touches[0].clientY);
    };

    const onTouchEnd = () => {
      dragging.current = false;
      rectRef.current = null;
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
