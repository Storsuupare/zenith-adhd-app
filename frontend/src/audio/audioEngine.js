// Circadian ambient audio engine — Web Audio API only, no libraries.
// AudioContext is created lazily on first user gesture (browser security + battery).

const FADE_S     = 10;      // cross-fade duration (seconds)
const ENV_LEVEL  = 0.65;    // nominal environment bus gain
const DUCK_LEVEL = 0.1;     // ducked gain when protocol is active
const HUM_LEVEL  = 0.35;    // void-hum gain during protocol
const HUM_FREQ   = 82;      // Hz — focus anchor oscillator
const MIN        = 0.0001;  // exponentialRamp cannot target exactly 0

const PHASE_PROFILE = {
  morning: 'arctic',
  day:     'arctic',
  noon:    'arctic',
  evening: 'amber',
  sunset:  'amber',
  night:   'arctic',
};

let _ctx          = null;
let _master       = null;
let _env          = null;
let _hum          = null;
let _humOsc       = null;
let _slots        = [null, null];
let _activeIdx    = 0;
let _curProfile   = null;
let _pendingPhase = null;
let _manualTrack  = null; // null = follow solar phase

// ── Initialization ─────────────────────────────────────────────────────────

export function prime() {
  const unlock = () => { init(); };
  document.addEventListener('click',      unlock, { once: true, capture: true });
  document.addEventListener('touchend',   unlock, { once: true, capture: true });
  document.addEventListener('keydown',    unlock, { once: true, capture: true });
}

export function init() {
  if (_ctx) {
    if (_ctx.state === 'suspended') _ctx.resume();
    return;
  }

  _ctx = new (window.AudioContext || window.webkitAudioContext)();
  _ctx.resume();

  _master = _ctx.createGain();
  _master.gain.value = 0.8;
  _master.connect(_ctx.destination);

  _env = _ctx.createGain();
  _env.gain.value = ENV_LEVEL;
  _env.connect(_master);

  _hum = _ctx.createGain();
  _hum.gain.value = MIN;
  _hum.connect(_master);

  // Void-hum oscillator always running; gain-controlled for silent standby.
  _humOsc = _ctx.createOscillator();
  _humOsc.type = 'sine';
  _humOsc.frequency.value = HUM_FREQ;
  _humOsc.connect(_hum);
  _humOsc.start();

  // Suspend/resume on tab visibility to eliminate background battery draw.
  document.addEventListener('visibilitychange', () => {
    if (!_ctx) return;
    document.hidden ? _ctx.suspend() : _ctx.resume();
  });

  if (_pendingPhase !== null) {
    const p = _pendingPhase;
    _pendingPhase = null;
    setPhase(p);
  }
}

// ── Noise buffer helpers ───────────────────────────────────────────────────

function _whiteBuffer() {
  const size = 2 * _ctx.sampleRate;
  const buf  = _ctx.createBuffer(1, size, _ctx.sampleRate);
  const d    = buf.getChannelData(0);
  for (let i = 0; i < size; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

function _brownBuffer() {
  const size = 4 * _ctx.sampleRate;
  const buf  = _ctx.createBuffer(1, size, _ctx.sampleRate);
  const d    = buf.getChannelData(0);
  let last   = 0;
  for (let i = 0; i < size; i++) {
    const w = Math.random() * 2 - 1;
    d[i]  = (last + 0.02 * w) / 1.02;
    last  = d[i];
    d[i] *= 3.5;
  }
  return buf;
}

// ── Source builders ────────────────────────────────────────────────────────

function _buildArctic() {
  // 50 Hz sub-bass sine + bandpass-filtered white noise (40–60 Hz "ice texture")
  const out = _ctx.createGain();
  out.gain.value = MIN;
  out.connect(_env);

  const osc    = _ctx.createOscillator();
  osc.type     = 'sine';
  osc.frequency.value = 50;
  const oscVol = _ctx.createGain();
  oscVol.gain.value = 0.55;
  osc.connect(oscVol);
  oscVol.connect(out);

  const ns  = _ctx.createBufferSource();
  ns.buffer = _whiteBuffer();
  ns.loop   = true;
  const bp  = _ctx.createBiquadFilter();
  bp.type   = 'bandpass';
  bp.frequency.value = 50;
  bp.Q.value = 1.5;
  const nsVol = _ctx.createGain();
  nsVol.gain.value = 0.45;
  ns.connect(bp);
  bp.connect(nsVol);
  nsVol.connect(out);

  osc.start();
  ns.start();

  return {
    gainNode: out,
    stop() { try { osc.stop(); ns.stop(); } catch (e) {} },
  };
}

function _buildAmber() {
  // Brown noise → lowpass 180 Hz — 100–200 Hz "Earth" tones
  const out = _ctx.createGain();
  out.gain.value = MIN;
  out.connect(_env);

  const ns  = _ctx.createBufferSource();
  ns.buffer = _brownBuffer();
  ns.loop   = true;
  const lp  = _ctx.createBiquadFilter();
  lp.type   = 'lowpass';
  lp.frequency.value = 180;
  lp.Q.value = 0.7;
  ns.connect(lp);
  lp.connect(out);
  ns.start();

  return {
    gainNode: out,
    stop() { try { ns.stop(); } catch (e) {} },
  };
}

// ── New ambient track builders ─────────────────────────────────────────────

function _buildRain() {
  const out = _ctx.createGain();
  out.gain.value = MIN;
  out.connect(_env);

  // Dense white noise → lowpass at 3 kHz gives rain texture
  const ns  = _ctx.createBufferSource();
  ns.buffer = _whiteBuffer();
  ns.loop   = true;
  const lp  = _ctx.createBiquadFilter();
  lp.type   = 'lowpass';
  lp.frequency.value = 3000;
  lp.Q.value = 0.4;
  const vol = _ctx.createGain();
  vol.gain.value = 0.85;
  ns.connect(lp);
  lp.connect(vol);
  vol.connect(out);
  ns.start();

  // Low sub rumble for heavy rain feel
  const sub = _ctx.createOscillator();
  sub.type = 'sine';
  sub.frequency.value = 38;
  const subVol = _ctx.createGain();
  subVol.gain.value = 0.18;
  sub.connect(subVol);
  subVol.connect(out);
  sub.start();

  return { gainNode: out, stop() { try { ns.stop(); sub.stop(); } catch (e) {} } };
}

function _buildCyberpunk() {
  const out = _ctx.createGain();
  out.gain.value = MIN;
  out.connect(_env);

  // Deep city hum
  const hum = _ctx.createOscillator();
  hum.type = 'sine';
  hum.frequency.value = 55;
  const humVol = _ctx.createGain();
  humVol.gain.value = 0.45;
  hum.connect(humVol);
  humVol.connect(out);
  hum.start();

  // Bandpass-filtered noise for synth-city texture
  const ns  = _ctx.createBufferSource();
  ns.buffer = _whiteBuffer();
  ns.loop   = true;
  const bp  = _ctx.createBiquadFilter();
  bp.type   = 'bandpass';
  bp.frequency.value = 900;
  bp.Q.value = 6;
  const nsVol = _ctx.createGain();
  nsVol.gain.value = 0.22;
  ns.connect(bp);
  bp.connect(nsVol);
  nsVol.connect(out);
  ns.start();

  // Higher shimmer layer
  const hi = _ctx.createOscillator();
  hi.type = 'sawtooth';
  hi.frequency.value = 220;
  const hiFilter = _ctx.createBiquadFilter();
  hiFilter.type = 'lowpass';
  hiFilter.frequency.value = 400;
  const hiVol = _ctx.createGain();
  hiVol.gain.value = 0.08;
  hi.connect(hiFilter);
  hiFilter.connect(hiVol);
  hiVol.connect(out);
  hi.start();

  return { gainNode: out, stop() { try { hum.stop(); ns.stop(); hi.stop(); } catch (e) {} } };
}

function _buildDeepSpace() {
  const out = _ctx.createGain();
  out.gain.value = MIN;
  out.connect(_env);

  // Very deep resonant drone
  const d1 = _ctx.createOscillator();
  d1.type = 'sine';
  d1.frequency.value = 32;
  const v1 = _ctx.createGain();
  v1.gain.value = 0.65;
  d1.connect(v1);
  v1.connect(out);
  d1.start();

  // Octave shimmer
  const d2 = _ctx.createOscillator();
  d2.type = 'sine';
  d2.frequency.value = 64;
  const v2 = _ctx.createGain();
  v2.gain.value = 0.25;
  d2.connect(v2);
  v2.connect(out);
  d2.start();

  // Subtle cosmic noise, very narrow bandpass
  const ns  = _ctx.createBufferSource();
  ns.buffer = _brownBuffer();
  ns.loop   = true;
  const bp  = _ctx.createBiquadFilter();
  bp.type   = 'bandpass';
  bp.frequency.value = 60;
  bp.Q.value = 0.8;
  const nv  = _ctx.createGain();
  nv.gain.value = 0.3;
  ns.connect(bp);
  bp.connect(nv);
  nv.connect(out);
  ns.start();

  return { gainNode: out, stop() { try { d1.stop(); d2.stop(); ns.stop(); } catch (e) {} } };
}

// ── Shared crossfade helper ────────────────────────────────────────────────

function _crossfadeTo(buildFn) {
  if (!_ctx) return;
  const now    = _ctx.currentTime;
  const inIdx  = (_activeIdx + 1) % 2;
  const outSlot = _slots[_activeIdx];

  const newSlot = buildFn();
  _slots[inIdx] = newSlot;

  newSlot.gainNode.gain.setValueAtTime(MIN, now);
  newSlot.gainNode.gain.exponentialRampToValueAtTime(1.0, now + FADE_S);

  if (outSlot) {
    outSlot.gainNode.gain.setValueAtTime(Math.max(outSlot.gainNode.gain.value, MIN), now);
    outSlot.gainNode.gain.exponentialRampToValueAtTime(MIN, now + FADE_S);
    const dying = outSlot;
    setTimeout(() => dying.stop(), (FADE_S + 0.5) * 1000);
    _slots[_activeIdx] = null;
  }

  _activeIdx  = inIdx;
  _curProfile = null; // manual track overrides profile label
}

// ── setAmbientTrack — public API for tier-gated track switching ───────────

const TRACK_BUILDERS = {
  rain:      _buildRain,
  cyberpunk: _buildCyberpunk,
  deepspace: _buildDeepSpace,
};

export function setAmbientTrack(track) {
  // track: 'focus' | 'rain' | 'cyberpunk' | 'deepspace'
  _manualTrack = track === 'focus' ? null : track;

  if (!_ctx) return; // will apply on next init/phase call

  if (!_manualTrack) {
    // Restore phase-based audio
    _curProfile = null;
    if (_pendingPhase) setPhase(_pendingPhase);
    return;
  }

  const buildFn = TRACK_BUILDERS[_manualTrack];
  if (buildFn) _crossfadeTo(buildFn);
}

// ── Phase control ──────────────────────────────────────────────────────────

export function setPhase(phase) {
  _pendingPhase = phase;
  const profile = PHASE_PROFILE[phase] ?? 'arctic';

  if (!_ctx) { return; }
  if (_manualTrack) return; // manual track takes priority
  if (profile === _curProfile) return;
  _curProfile = profile;

  const now     = _ctx.currentTime;
  const outSlot = _slots[_activeIdx];
  const inIdx   = (_activeIdx + 1) % 2;

  const newSlot = profile === 'amber' ? _buildAmber() : _buildArctic();
  _slots[inIdx] = newSlot;

  // Exponential ramp — smoother and cheaper on CPU than linear for long fades.
  newSlot.gainNode.gain.setValueAtTime(MIN, now);
  newSlot.gainNode.gain.exponentialRampToValueAtTime(1.0, now + FADE_S);

  if (outSlot) {
    outSlot.gainNode.gain.setValueAtTime(
      Math.max(outSlot.gainNode.gain.value, MIN), now
    );
    outSlot.gainNode.gain.exponentialRampToValueAtTime(MIN, now + FADE_S);
    const dying = outSlot;
    setTimeout(() => dying.stop(), (FADE_S + 0.5) * 1000);
    _slots[_activeIdx] = null;
  }

  _activeIdx = inIdx;
}

// ── Protocol ducking ───────────────────────────────────────────────────────

export function setProtocol(active) {
  if (!_ctx) return;
  const now  = _ctx.currentTime;
  const ramp = 2; // seconds for duck/unduck transition

  _env.gain.cancelScheduledValues(now);
  _env.gain.setValueAtTime(Math.max(_env.gain.value, MIN), now);
  _env.gain.exponentialRampToValueAtTime(active ? DUCK_LEVEL : ENV_LEVEL, now + ramp);

  _hum.gain.cancelScheduledValues(now);
  _hum.gain.setValueAtTime(Math.max(_hum.gain.value, MIN), now);
  _hum.gain.exponentialRampToValueAtTime(active ? HUM_LEVEL : MIN, now + ramp);
}

// ── Volume ─────────────────────────────────────────────────────────────────

export function setVolume(v) {
  if (_master) _master.gain.value = Math.max(0, Math.min(1, v));
}

export function getVolume() {
  return _master ? _master.gain.value : 0.8;
}

export function playUISound(type) {
  if (!_ctx) init();
  if (!_ctx) return;
  if (_ctx.state === 'suspended') _ctx.resume();

  const now  = _ctx.currentTime;
  const dest = _master ?? _ctx.destination;

  const tone = (freq, start, dur, wave = 'sine', vol = 0.07, freqRamp = 1.0) => {
    const o = _ctx.createOscillator();
    const g = _ctx.createGain();
    o.type = wave;
    o.frequency.setValueAtTime(freq, now + start);
    if (freqRamp !== 1.0)
      o.frequency.exponentialRampToValueAtTime(freq * freqRamp, now + start + dur);
    g.gain.setValueAtTime(vol, now + start);
    g.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
    o.connect(g).connect(dest);
    o.start(now + start);
    o.stop(now + start + dur + 0.01);
  };

  const burst = (start, dur, vol, centerHz) => {
    const sz  = Math.floor(_ctx.sampleRate * dur);
    const buf = _ctx.createBuffer(1, sz, _ctx.sampleRate);
    const d   = buf.getChannelData(0);
    for (let i = 0; i < sz; i++) d[i] = Math.random() * 2 - 1;
    const src = _ctx.createBufferSource();
    src.buffer = buf;
    const bp = _ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = centerHz;
    bp.Q.value = 1.8;
    const g = _ctx.createGain();
    g.gain.setValueAtTime(vol, now + start);
    g.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
    src.connect(bp).connect(g).connect(dest);
    src.start(now + start);
  };

  switch (type) {

    case 'ambience_focus':
      tone(1400, 0,    0.09, 'sine', 0.07, 0.95);
      tone(2100, 0.04, 0.07, 'sine', 0.03, 0.97);
      break;

    case 'ambience_rain':
      burst(0, 0.13, 0.09, 4000);
      tone(2600, 0, 0.05, 'sine', 0.02, 0.82);
      break;

    case 'ambience_cyberpunk':
      tone(160, 0, 0.06, 'sawtooth', 0.06, 2.8);
      burst(0, 0.09, 0.03, 900);
      break;

    case 'ambience_deepspace':
      tone(38,  0,    0.4,  'sine', 0.09, 0.88);
      tone(76,  0.06, 0.28, 'sine', 0.04, 0.93);
      break;

    case 'theme_classic':
      tone(2200, 0,    0.11, 'sine', 0.07, 0.97);
      tone(3300, 0.03, 0.07, 'sine', 0.02, 0.97);
      break;

    case 'theme_cobalt':
      tone(1500, 0,    0.14, 'sine', 0.07, 0.98);
      tone(750,  0.05, 0.10, 'sine', 0.03, 0.99);
      break;

    case 'theme_amber':
      tone(880, 0,    0.18, 'sine', 0.07, 0.99);
      tone(440, 0.07, 0.13, 'sine', 0.03, 0.99);
      break;

    case 'theme_crimson':
      tone(320, 0, 0.05, 'sawtooth', 0.08, 0.45);
      burst(0, 0.07, 0.04, 400);
      break;

    default: break;
  }
}
