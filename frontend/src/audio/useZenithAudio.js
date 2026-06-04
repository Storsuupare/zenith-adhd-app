import { useEffect, useCallback, useState, useRef } from 'react';
import { primeTimeEnvironment } from './AudioController';
import { setVolume, setAmbientTrack, playUISound, setAtmosphereVolume } from './audioEngine';

const VOLUME_KEY = 'zenith-audio-volume';
const ATMOS_KEY  = 'zenith-atmos-volume';


const PHASE_TO_TRACK = {
  morning: 'forest',
  day:     'forest',
  noon:    'forest',
  evening: 'forest',
  sunset:  'sunset',
  night:   'nighthawk',
};

function _getTrack(phase) {
  return PHASE_TO_TRACK[phase] ?? 'forest';
}

/**
 * useZenithAudio — manages the time-aware environment audio engine.
 *
 * @param {string} solarPhase — current phase string from App.jsx
 */
export function useZenithAudio(solarPhase) {
  // Restore persisted volume; default to 15 %
  const [volume, setLocalVolume] = useState(() => {
    try {
      const saved = parseFloat(localStorage.getItem(VOLUME_KEY));
      return isNaN(saved) ? 0.15 : Math.max(0, Math.min(1, saved));
    } catch { return 0.15; }
  });

  // Restore persisted atmosphere volume; default to 18 %
  const [atmosphereVolume, setAtmosLocal] = useState(() => {
    try {
      const saved = parseFloat(localStorage.getItem(ATMOS_KEY));
      return isNaN(saved) ? 0.18 : Math.max(0, Math.min(1, saved));
    } catch { return 0.18; }
  });

  // Initialise with the solarPhase track so the phase-change effect skips on mount
  const lastTrackRef = useRef(_getTrack(solarPhase));

  // Prime audio engine (gesture-gated) and apply persisted volumes
  useEffect(() => {
    primeTimeEnvironment();
    setVolume(volume);
    setAtmosphereVolume(atmosphereVolume);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Cross-fade to the correct track when the solar phase crosses a boundary,
  // but only if the user hasn't picked a manual track from the shop.
  useEffect(() => {
    if (!solarPhase) return;
    const saved = localStorage.getItem("zenith_audio");
    if (saved && saved !== "focus") return; // user's pick always wins
    const track = _getTrack(solarPhase);
    if (track === lastTrackRef.current) return;
    lastTrackRef.current = track;
    setAmbientTrack(track);
  }, [solarPhase]);


  /** Link this to a <input type="range" /> or custom slider */
  const handleVolumeChange = useCallback((v) => {
    const clamped = Math.max(0, Math.min(1, Number(v)));
    setVolume(clamped);
    setLocalVolume(clamped);
    try { localStorage.setItem(VOLUME_KEY, String(clamped)); } catch { /* private mode */ }
  }, []);

  const handleAtmosphereVolumeChange = useCallback((v) => {
    const clamped = Math.max(0, Math.min(1, Number(v)));
    setAtmosphereVolume(clamped);
    setAtmosLocal(clamped);
    try { localStorage.setItem(ATMOS_KEY, String(clamped)); } catch { /* private mode */ }
  }, []);

  /** Fire on skill level-up — crystal chime */
  const playLevelUp = useCallback(() => {
    playUISound('level_up');
  }, []);

  /** Fire on any button press — organic wood tap */
  const playClick = useCallback(() => {
    playUISound('wood_tap');
  }, []);

  return { volume, handleVolumeChange, atmosphereVolume, handleAtmosphereVolumeChange, playLevelUp, playClick };
}
