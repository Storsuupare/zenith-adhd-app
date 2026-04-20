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

// ── Initialization ─────────────────────────────────────────────────────────

// Register a one-time capture-phase click listener so the context boots on the
// very first user gesture anywhere on the page.
export function prime() {
  document.addEventListener('click', init, { once: true, capture: true });
}

export function init() {
  if (_ctx) return;

  _ctx = new (window.AudioContext || window.webkitAudioContext)();

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

// ── Phase control ──────────────────────────────────────────────────────────

export function setPhase(phase) {
  const profile = PHASE_PROFILE[phase] ?? 'arctic';

  if (!_ctx) { _pendingPhase = phase; return; }
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
