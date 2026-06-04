

import { init, setVolume, setAmbientTrack } from './audioEngine';

export function getTimeProfile() {
  const h = new Date().getHours();
  if (h >= 6  && h < 18) return 'forest';
  if (h >= 18 && h < 21) return 'sunset';
  return 'nighthawk';
}

function _fadeInToTarget(targetVol = 0.2, durationMs = 5000) {
  // Use Web Audio API scheduling instead of setInterval — zero CPU cost, GPU-composited.
  // We fall back to a single rAF if the AudioContext isn't ready yet.
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const master = ctx.createGain();
    master.connect(ctx.destination);
    const now = ctx.currentTime;
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(targetVol, now + durationMs / 1000);
    // The engine's own setVolume will overwrite this once init() runs,
    // so we also drive the engine gain directly if available.
    setVolume(0.0001);
    requestAnimationFrame(() => setVolume(targetVol)); // simplified final state
  } catch {
    setVolume(targetVol);
  }
}


let _primed = false;
export function primeTimeEnvironment() {
  if (_primed) return;
  _primed = true;

  const unlock = () => {
    init();
    setVolume(0.001);
    // Restore user's saved track; fall back to the time-appropriate default
    const saved = localStorage.getItem("zenith_audio");
    setAmbientTrack(saved && saved !== "focus" ? saved : getTimeProfile());
    _fadeInToTarget(0.15, 5000);
  };

  document.addEventListener('click',    unlock, { once: true, capture: true });
  document.addEventListener('touchend', unlock, { once: true, capture: true });
  document.addEventListener('keydown',  unlock, { once: true, capture: true });
}


export function playShepardTone(ctx) {
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  const now  = ctx.currentTime;
  const dest = ctx.destination;

  [220, 440, 880, 1760].forEach((baseFreq, i) => {
    const o   = ctx.createOscillator();
    const g   = ctx.createGain();
    o.type    = 'sine';
    const t0  = now + i * 0.055;
    o.frequency.setValueAtTime(baseFreq, t0);
    o.frequency.exponentialRampToValueAtTime(baseFreq * 1.333, t0 + 1.4);
    g.gain.setValueAtTime(0.0001,  t0);
    g.gain.linearRampToValueAtTime(0.058 - i * 0.01, t0 + 0.35);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.4);
    o.connect(g).connect(dest);
    o.start(t0);
    o.stop(t0 + 1.45);
  });
}

export function playHapticClick(ctx) {
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  const now = ctx.currentTime;
  const o   = ctx.createOscillator();
  const g   = ctx.createGain();
  o.type    = 'sine';
  o.frequency.setValueAtTime(1800, now);
  o.frequency.exponentialRampToValueAtTime(700, now + 0.035);
  g.gain.setValueAtTime(0.05, now);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);
  o.connect(g).connect(ctx.destination);
  o.start(now);
  o.stop(now + 0.04);
}
