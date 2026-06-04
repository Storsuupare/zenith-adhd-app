
const FADE_S       = 5;      // cross-fade duration (seconds)
const ENV_LEVEL    = 1.0;    // _env gain when not in protocol mode
const PROTOCOL_DUCK = 0.08;  // _env gain during kinetic/protocol mode
const HUM_LEVEL    = 0.35;   // focus-hum gain during protocol
const HUM_FREQ     = 82;     // Hz — focus anchor oscillator
const MIN          = 0.0001; // exponentialRamp cannot target exactly 0

let _ctx          = null;
let _master       = null;
let _env          = null;    // protocol duck bus
let _atmos        = null;    // independent atmosphere volume bus
let _hum          = null;
let _humOsc       = null;
let _slots        = [null, null];
let _activeIdx    = 0;
let _curProfile   = null;
let _pendingPhase = null;
let _manualTrack  = null;
let _atmosLevel   = 0.18;    // body-double level: ~18% of master (quiet but masks silence)

// ── Lazy-load cache ───────────────────────────────────────────────────────
const _bufferCache = new Map();

async function _fetchAndDecode(path) {
  if (_bufferCache.has(path)) return _bufferCache.get(path);
  const resp = await fetch(path);
  if (!resp.ok) throw new Error(`sample missing: ${path}`);
  const ab  = await resp.arrayBuffer();
  const buf = await _ctx.decodeAudioData(ab);
  _bufferCache.set(path, buf);
  return buf;
}

// ── Initialization ─────────────────────────────────────────────────────────

export function init() {
  if (_ctx) {
    if (_ctx.state === 'suspended') _ctx.resume().catch(() => {});
    return;
  }

  _ctx = new (window.AudioContext || window.webkitAudioContext)();
  _ctx.resume().catch(() => {});

  // Signal chain:  slot.gainNode → _env (protocol duck) → _atmos (atmosphere vol) → _master → destination
  // UI sounds bypass _env/_atmos and route directly to _master
  _master = _ctx.createGain();
  _master.gain.value = 0.001; // AudioController fades this to ~0.2 over 5 s
  _master.connect(_ctx.destination);

  _atmos = _ctx.createGain();
  _atmos.gain.value = _atmosLevel; // atmosphere volume, user-controlled
  _atmos.connect(_master);

  _env = _ctx.createGain();
  _env.gain.value = ENV_LEVEL; // modulated by setProtocol
  _env.connect(_atmos);

  _hum = _ctx.createGain();
  _hum.gain.value = MIN; // rises to HUM_LEVEL during protocol
  _hum.connect(_master); // hum bypasses atmosphere — it's a focus tone, not ambient

  _humOsc = _ctx.createOscillator();
  _humOsc.type = 'sine';
  _humOsc.frequency.value = HUM_FREQ;
  _humOsc.connect(_hum);
  _humOsc.start();

  document.addEventListener('visibilitychange', () => {
    if (!_ctx) return;
    if (document.hidden) {
      // AudioContext.suspend() is absent on iOS Safari < 14.5 — guard before calling
      if (typeof _ctx.suspend === 'function') _ctx.suspend().catch(() => {});
    } else {
      _ctx.resume().catch(() => {});
    }
  });

  if (_pendingPhase !== null) {
    const p = _pendingPhase;
    _pendingPhase = null;
    setPhase(p);
  }
}

export function prime() {
  const unlock = () => { init(); };
  document.addEventListener('click',    unlock, { once: true, capture: true });
  document.addEventListener('touchend', unlock, { once: true, capture: true });
  document.addEventListener('keydown',  unlock, { once: true, capture: true });
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
    d[i] *= 1.8;
  }
  return buf;
}

// ── Source builders — Basic tier (arctic/amber/phase-default) ──────────────

// Arctic: polar wind howl — layered bandpass noise in audible range (was 50 Hz sine+bandpass, inaudible on laptop)
function _buildArctic() {
  const out = _ctx.createGain();
  out.gain.value = MIN;
  out.connect(_env);

  // Low polar pressure — 65 Hz is on the edge of audible vs subwoofer-only
  const osc = _ctx.createOscillator();
  osc.type = 'sine'; osc.frequency.value = 65;
  const oscVol = _ctx.createGain(); oscVol.gain.value = 0.18;
  osc.connect(oscVol); oscVol.connect(out); osc.start();

  // Main wind howl — bandpass in mid-low range (350 Hz) so it's actually heard
  const ns1 = _ctx.createBufferSource();
  ns1.buffer = _whiteBuffer(); ns1.loop = true;
  const bp1 = _ctx.createBiquadFilter();
  bp1.type = 'bandpass'; bp1.frequency.value = 350; bp1.Q.value = 1.0;
  const v1 = _ctx.createGain(); v1.gain.value = 0.18;
  ns1.connect(bp1); bp1.connect(v1); v1.connect(out); ns1.start();

  // Upper harmonic shimmer — gives wind the airy quality without being harsh
  const ns2 = _ctx.createBufferSource();
  ns2.buffer = _whiteBuffer(); ns2.loop = true;
  const bp2 = _ctx.createBiquadFilter();
  bp2.type = 'bandpass'; bp2.frequency.value = 850; bp2.Q.value = 1.8;
  const v2 = _ctx.createGain(); v2.gain.value = 0.08;
  ns2.connect(bp2); bp2.connect(v2); v2.connect(out); ns2.start();

  return {
    gainNode: out,
    stop() { try { osc.stop(); ns1.stop(); ns2.stop(); } catch (_e) {} },
  };
}

// Amber: warm evening embers — audible low drone + rich brown texture
function _buildAmber() {
  const out = _ctx.createGain();
  out.gain.value = MIN;
  out.connect(_env);

  // Warm drone at 70 Hz — low but audible on most speakers
  const osc = _ctx.createOscillator();
  osc.type = 'sine'; osc.frequency.value = 70;
  const ov = _ctx.createGain(); ov.gain.value = 0.16;
  osc.connect(ov); ov.connect(out); osc.start();

  // Brown warmth — shifted from 180 Hz to 300 Hz so it registers on earbuds
  const ns = _ctx.createBufferSource();
  ns.buffer = _brownBuffer(); ns.loop = true;
  const lp = _ctx.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 300; lp.Q.value = 0.6;
  const vol = _ctx.createGain(); vol.gain.value = 0.16;
  ns.connect(lp); lp.connect(vol); vol.connect(out); ns.start();

  return {
    gainNode: out,
    stop() { try { osc.stop(); ns.stop(); } catch (_e) {} },
  };
}

// ── Source builders — PRO tier ─────────────────────────────────────────────

// Rain: soft drizzle on glass — lowpass was 3000 Hz (harsh sibilance), now 1800 Hz (soft)
function _buildRain() {
  const out = _ctx.createGain();
  out.gain.value = MIN;
  out.connect(_env);

  // Primary rain texture — gentle lowpass so it doesn't shred ears
  const ns1 = _ctx.createBufferSource();
  ns1.buffer = _whiteBuffer(); ns1.loop = true;
  const lp = _ctx.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 1800; lp.Q.value = 0.5;
  const v1 = _ctx.createGain(); v1.gain.value = 0.15;
  ns1.connect(lp); lp.connect(v1); v1.connect(out); ns1.start();

  // Impact body — mid-range bandpass gives surface rumble without frequency spike
  const ns2 = _ctx.createBufferSource();
  ns2.buffer = _whiteBuffer(); ns2.loop = true;
  const bp = _ctx.createBiquadFilter();
  bp.type = 'bandpass'; bp.frequency.value = 600; bp.Q.value = 1.2;
  const v2 = _ctx.createGain(); v2.gain.value = 0.10;
  ns2.connect(bp); bp.connect(v2); v2.connect(out); ns2.start();

  // Distant thunder pressure — subtle, not dominant
  const sub = _ctx.createOscillator();
  sub.type = 'sine'; sub.frequency.value = 48;
  const sv = _ctx.createGain(); sv.gain.value = 0.06;
  sub.connect(sv); sv.connect(out); sub.start();

  return { gainNode: out, stop() { try { ns1.stop(); ns2.stop(); sub.stop(); } catch (_e) {} } };
}

// Cyberpunk: moving neon city — LFO traffic pulse + neon buzz + rain + rare doppler siren
// Unique signature: traffic MOVES (LFO amplitude modulation), not a static drone
function _buildCyberpunk() {
  const out = _ctx.createGain();
  out.gain.value = MIN;
  out.connect(_env);

  // Street traffic — brown noise with a slow LFO so it pulses like cars passing
  const traffic = _ctx.createBufferSource();
  traffic.buffer = _brownBuffer(); traffic.loop = true;
  const trafficLp = _ctx.createBiquadFilter();
  trafficLp.type = 'lowpass'; trafficLp.frequency.value = 250; trafficLp.Q.value = 0.6;
  const trafficVol = _ctx.createGain(); trafficVol.gain.value = 0.10;
  const trafficLfo = _ctx.createOscillator();
  trafficLfo.type = 'sine'; trafficLfo.frequency.value = 0.08; // one pulse every ~12 s
  const trafficLfoDepth = _ctx.createGain(); trafficLfoDepth.gain.value = 0.04;
  trafficLfo.connect(trafficLfoDepth); trafficLfoDepth.connect(trafficVol.gain);
  trafficLfo.start();
  traffic.connect(trafficLp); trafficLp.connect(trafficVol); trafficVol.connect(out); traffic.start();

  // Neon sign / power-line buzz
  const buzz = _ctx.createOscillator();
  buzz.type = 'sine'; buzz.frequency.value = 60;
  const bv = _ctx.createGain(); bv.gain.value = 0.07;
  buzz.connect(bv); bv.connect(out); buzz.start();

  // Light city rain on asphalt
  const rain = _ctx.createBufferSource();
  rain.buffer = _whiteBuffer(); rain.loop = true;
  const rainLp = _ctx.createBiquadFilter();
  rainLp.type = 'lowpass'; rainLp.frequency.value = 1400; rainLp.Q.value = 0.5;
  const rainVol = _ctx.createGain(); rainVol.gain.value = 0.06;
  rain.connect(rainLp); rainLp.connect(rainVol); rainVol.connect(out); rain.start();

  // Doppler siren every 3–7 min — the moment that makes you look up from your work
  let stopped = false;
  let sirenTimer = null;
  function scheduleSiren() {
    if (stopped || !_ctx) return;
    sirenTimer = setTimeout(() => {
      if (stopped || !_ctx || _ctx.state === 'suspended') { scheduleSiren(); return; }
      const now = _ctx.currentTime;
      const s = _ctx.createOscillator();
      const sg = _ctx.createGain();
      s.type = 'sine';
      s.frequency.setValueAtTime(620, now);
      s.frequency.linearRampToValueAtTime(920, now + 1.8);
      s.frequency.linearRampToValueAtTime(620, now + 3.8);
      sg.gain.setValueAtTime(0.0001, now);
      sg.gain.linearRampToValueAtTime(0.020, now + 0.9);
      sg.gain.linearRampToValueAtTime(0.0001, now + 3.8);
      s.connect(sg); sg.connect(out);
      s.start(now); s.stop(now + 3.9);
      scheduleSiren();
    }, 180000 + Math.random() * 240000);
  }
  scheduleSiren();

  return {
    gainNode: out,
    stop() {
      stopped = true;
      if (sirenTimer) clearTimeout(sirenTimer);
      try { traffic.stop(); trafficLfo.stop(); buzz.stop(); rain.stop(); } catch (_e) {}
    },
  };
}

// Library: almost total silence — the QUIETEST track; rare events are what you listen for
// Unique signature: near-silence + page turn + distant soft footstep
function _buildLibrary() {
  const out = _ctx.createGain();
  out.gain.value = MIN;
  out.connect(_env);

  // Barely-there room noise floor — one narrow bandpass so it's almost inaudible
  const ns = _ctx.createBufferSource();
  ns.buffer = _whiteBuffer(); ns.loop = true;
  const bp = _ctx.createBiquadFilter();
  bp.type = 'bandpass'; bp.frequency.value = 500; bp.Q.value = 12;
  const nv = _ctx.createGain(); nv.gain.value = 0.020;
  ns.connect(bp); bp.connect(nv); nv.connect(out); ns.start();

  let stopped = false;

  // Page turns every 20–60 s
  let pageTimer = null;
  function schedulePage() {
    if (stopped || !_ctx) return;
    pageTimer = setTimeout(() => {
      if (stopped || !_ctx || _ctx.state === 'suspended') { schedulePage(); return; }
      const sz = Math.floor(_ctx.sampleRate * 0.07);
      const pb = _ctx.createBuffer(1, sz, _ctx.sampleRate);
      const pd = pb.getChannelData(0);
      for (let i = 0; i < sz; i++) pd[i] = Math.random() * 2 - 1;
      const pn = _ctx.createBufferSource();
      pn.buffer = pb;
      const pbp = _ctx.createBiquadFilter();
      pbp.type = 'bandpass'; pbp.frequency.value = 3500; pbp.Q.value = 1.0;
      const pg = _ctx.createGain();
      const now = _ctx.currentTime;
      pg.gain.setValueAtTime(0.0001, now);
      pg.gain.linearRampToValueAtTime(0.030, now + 0.018);
      pg.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
      pn.connect(pbp); pbp.connect(pg); pg.connect(out);
      pn.start(now);
      schedulePage();
    }, 20000 + Math.random() * 40000);
  }
  schedulePage();

  // Distant soft footstep every 60–120 s — someone walking two aisles away
  let footTimer = null;
  function scheduleFoot() {
    if (stopped || !_ctx) return;
    footTimer = setTimeout(() => {
      if (stopped || !_ctx || _ctx.state === 'suspended') { scheduleFoot(); return; }
      const now = _ctx.currentTime;
      const thud = _ctx.createOscillator();
      const tg = _ctx.createGain();
      thud.type = 'sine';
      thud.frequency.setValueAtTime(95, now);
      thud.frequency.exponentialRampToValueAtTime(38, now + 0.14);
      tg.gain.setValueAtTime(0.0001, now);
      tg.gain.linearRampToValueAtTime(0.016, now + 0.006);
      tg.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
      thud.connect(tg); tg.connect(out);
      thud.start(now); thud.stop(now + 0.16);
      scheduleFoot();
    }, 60000 + Math.random() * 60000);
  }
  scheduleFoot();

  return {
    gainNode: out,
    stop() {
      stopped = true;
      if (pageTimer) clearTimeout(pageTimer);
      if (footTimer) clearTimeout(footTimer);
      try { ns.stop(); } catch (_e) {}
    },
  };
}

// Lo-Fi: breathing tape machine — filter LFO gives that woozy warmth, detuned chord = vinyl wobble
// Unique signature: the filter itself moves slowly, making the whole texture feel alive
function _buildLofi() {
  const out = _ctx.createGain();
  out.gain.value = MIN;
  out.connect(_env);

  // Vinyl warmth through a slowly-breathing lowpass — the filter sweeps ±150 Hz over 10 s
  const ns = _ctx.createBufferSource();
  ns.buffer = _brownBuffer(); ns.loop = true;
  const lp = _ctx.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 450;
  const filterLfo = _ctx.createOscillator();
  filterLfo.type = 'sine'; filterLfo.frequency.value = 0.10;
  const filterDepth = _ctx.createGain(); filterDepth.gain.value = 150;
  filterLfo.connect(filterDepth); filterDepth.connect(lp.frequency); // modulate the cutoff
  filterLfo.start();
  const nv = _ctx.createGain(); nv.gain.value = 0.10;
  ns.connect(lp); lp.connect(nv); nv.connect(out); ns.start();

  // Vinyl surface crackle
  const crackle = _ctx.createBufferSource();
  crackle.buffer = _whiteBuffer(); crackle.loop = true;
  const hp = _ctx.createBiquadFilter();
  hp.type = 'highpass'; hp.frequency.value = 7000;
  const cv = _ctx.createGain(); cv.gain.value = 0.022;
  crackle.connect(hp); hp.connect(cv); cv.connect(out); crackle.start();

  // Detuned chord — two copies of C3 slightly off-pitch gives that old-vinyl wobble feeling
  const chordDefs = [
    { freq: 130.81, detune:  0  },
    { freq: 130.81, detune:  7  }, // 7 cents sharp — tape wobble
    { freq: 196.00, detune:  0  },
    { freq: 261.63, detune: -5  }, // 5 cents flat — worn pressing
  ];
  const oscs = chordDefs.map(({ freq, detune }) => {
    const o = _ctx.createOscillator();
    const g = _ctx.createGain();
    o.type = 'sine'; o.frequency.value = freq; o.detune.value = detune;
    g.gain.value = 0.028;
    o.connect(g); g.connect(out); o.start();
    return o;
  });

  return {
    gainNode: out,
    stop() {
      try { ns.stop(); crackle.stop(); filterLfo.stop(); } catch (_e) {}
      oscs.forEach((o) => { try { o.stop(); } catch (_e) {} });
    },
  };
}

// ── Source builders — ELITE tier ──────────────────────────────────────────

// Deep Space: the cosmos breathes — no static drone, LFO slowly inhales and exhales the texture
// Unique signature: everything MOVES slowly, nothing is fixed; rare pulsar events punctuate the silence
function _buildDeepSpace() {
  const out = _ctx.createGain();
  out.gain.value = MIN;
  out.connect(_env);

  // Cosmic wash — wide bandpass noise whose volume slowly breathes via LFO (14-second period)
  const cosmos = _ctx.createBufferSource();
  cosmos.buffer = _whiteBuffer(); cosmos.loop = true;
  const cosmosBp = _ctx.createBiquadFilter();
  cosmosBp.type = 'bandpass'; cosmosBp.frequency.value = 200; cosmosBp.Q.value = 0.5;
  const cosmosVol = _ctx.createGain(); cosmosVol.gain.value = 0.055;
  const breathLfo = _ctx.createOscillator();
  breathLfo.type = 'sine'; breathLfo.frequency.value = 0.07; // one breath every ~14 s
  const breathDepth = _ctx.createGain(); breathDepth.gain.value = 0.035;
  breathLfo.connect(breathDepth); breathDepth.connect(cosmosVol.gain);
  breathLfo.start();
  cosmos.connect(cosmosBp); cosmosBp.connect(cosmosVol); cosmosVol.connect(out); cosmos.start();

  // Star shimmer — barely-there high frequency dust
  const stars = _ctx.createBufferSource();
  stars.buffer = _whiteBuffer(); stars.loop = true;
  const starHp = _ctx.createBiquadFilter();
  starHp.type = 'highpass'; starHp.frequency.value = 9000;
  const sv = _ctx.createGain(); sv.gain.value = 0.010;
  stars.connect(starHp); starHp.connect(sv); sv.connect(out); stars.start();

  // Pulsar event every 2–4 min — a brief tone that descends like a distant cosmic signal
  let stopped = false;
  let pulsarTimer = null;
  function schedulePulsar() {
    if (stopped || !_ctx) return;
    pulsarTimer = setTimeout(() => {
      if (stopped || !_ctx || _ctx.state === 'suspended') { schedulePulsar(); return; }
      const now = _ctx.currentTime;
      const p = _ctx.createOscillator();
      const pg = _ctx.createGain();
      p.type = 'sine';
      p.frequency.setValueAtTime(300, now);
      p.frequency.exponentialRampToValueAtTime(180, now + 1.8);
      pg.gain.setValueAtTime(0.0001, now);
      pg.gain.linearRampToValueAtTime(0.018, now + 0.1);
      pg.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);
      p.connect(pg); pg.connect(out);
      p.start(now); p.stop(now + 1.9);
      schedulePulsar();
    }, 120000 + Math.random() * 120000);
  }
  schedulePulsar();

  return {
    gainNode: out,
    stop() {
      stopped = true;
      if (pulsarTimer) clearTimeout(pulsarTimer);
      try { cosmos.stop(); breathLfo.stop(); stars.stop(); } catch (_e) {}
    },
  };
}

// Space Station: ISS interior — tremolo fan is the identity; nothing else sounds like this
// Unique signature: fan oscillator tremolo (LFO at 22 Hz) makes a spinning-blade flutter + computer beeps
function _buildSpaceStation() {
  const out = _ctx.createGain();
  out.gain.value = MIN;
  out.connect(_env);

  // Cooling fan — a sine through tremolo LFO at 22 Hz makes it sound like real spinning blades
  const fan = _ctx.createOscillator();
  fan.type = 'sine'; fan.frequency.value = 160;
  const fanVol = _ctx.createGain(); fanVol.gain.value = 0.07;
  const fanLfo = _ctx.createOscillator();
  fanLfo.type = 'sine'; fanLfo.frequency.value = 22;
  const fanLfoDepth = _ctx.createGain(); fanLfoDepth.gain.value = 0.030;
  fanLfo.connect(fanLfoDepth); fanLfoDepth.connect(fanVol.gain);
  fanLfo.start();
  fan.connect(fanVol); fanVol.connect(out); fan.start();

  // Life support ventilation hiss
  const vent = _ctx.createBufferSource();
  vent.buffer = _whiteBuffer(); vent.loop = true;
  const ventBp = _ctx.createBiquadFilter();
  ventBp.type = 'bandpass'; ventBp.frequency.value = 1000; ventBp.Q.value = 1.5;
  const ventVol = _ctx.createGain(); ventVol.gain.value = 0.030;
  vent.connect(ventBp); ventBp.connect(ventVol); ventVol.connect(out); vent.start();

  // Machinery sub-rumble — distant pumps and compressors
  const rumble = _ctx.createBufferSource();
  rumble.buffer = _brownBuffer(); rumble.loop = true;
  const rumbleLp = _ctx.createBiquadFilter();
  rumbleLp.type = 'lowpass'; rumbleLp.frequency.value = 180;
  const rumbleVol = _ctx.createGain(); rumbleVol.gain.value = 0.05;
  rumble.connect(rumbleLp); rumbleLp.connect(rumbleVol); rumbleVol.connect(out); rumble.start();

  // Computer system alert beep every 35–70 s
  let stopped = false;
  let beepTimer = null;
  function scheduleBeep() {
    if (stopped || !_ctx) return;
    beepTimer = setTimeout(() => {
      if (stopped || !_ctx || _ctx.state === 'suspended') { scheduleBeep(); return; }
      const now = _ctx.currentTime;
      const b = _ctx.createOscillator();
      const bg = _ctx.createGain();
      b.type = 'sine'; b.frequency.value = 1200;
      bg.gain.setValueAtTime(0.0001, now);
      bg.gain.linearRampToValueAtTime(0.018, now + 0.005);
      bg.gain.setValueAtTime(0.018, now + 0.075);
      bg.gain.exponentialRampToValueAtTime(0.0001, now + 0.10);
      b.connect(bg); bg.connect(out);
      b.start(now); b.stop(now + 0.12);
      scheduleBeep();
    }, 35000 + Math.random() * 35000);
  }
  scheduleBeep();

  return {
    gainNode: out,
    stop() {
      stopped = true;
      if (beepTimer) clearTimeout(beepTimer);
      try { fan.stop(); fanLfo.stop(); vent.stop(); rumble.stop(); } catch (_e) {}
    },
  };
}

// Deep Sea: pressure hull — dual water layers + hull creak is what defines this track
// Unique signature: sawtooth hull creak (metallic, frequency-sweeping) every 25–55 s
function _buildDeepSea() {
  const out = _ctx.createGain();
  out.gain.value = MIN;
  out.connect(_env);

  // Water flowing past the hull — low brown layer
  const water1 = _ctx.createBufferSource();
  water1.buffer = _brownBuffer(); water1.loop = true;
  const w1Lp = _ctx.createBiquadFilter();
  w1Lp.type = 'lowpass'; w1Lp.frequency.value = 300; w1Lp.Q.value = 0.6;
  const w1v = _ctx.createGain(); w1v.gain.value = 0.08;
  water1.connect(w1Lp); w1Lp.connect(w1v); w1v.connect(out); water1.start();

  // Water hiss layer — mid bandpass gives turbulence against the hull
  const water2 = _ctx.createBufferSource();
  water2.buffer = _whiteBuffer(); water2.loop = true;
  const w2Bp = _ctx.createBiquadFilter();
  w2Bp.type = 'bandpass'; w2Bp.frequency.value = 500; w2Bp.Q.value = 1.0;
  const w2v = _ctx.createGain(); w2v.gain.value = 0.038;
  water2.connect(w2Bp); w2Bp.connect(w2v); w2v.connect(out); water2.start();

  // Pressure sub-sine — just audible, gives physical "weight"
  const pressure = _ctx.createOscillator();
  pressure.type = 'sine'; pressure.frequency.value = 55;
  const pv = _ctx.createGain(); pv.gain.value = 0.06;
  pressure.connect(pv); pv.connect(out); pressure.start();

  let stopped = false;

  // Hull creak every 25–55 s — sawtooth sweeping down through a lowpass; unmistakably metal under pressure
  let creakTimer = null;
  function scheduleCreak() {
    if (stopped || !_ctx) return;
    creakTimer = setTimeout(() => {
      if (stopped || !_ctx || _ctx.state === 'suspended') { scheduleCreak(); return; }
      const now = _ctx.currentTime;
      const creak = _ctx.createOscillator();
      const creakLp = _ctx.createBiquadFilter();
      const cg = _ctx.createGain();
      creak.type = 'sawtooth';
      creak.frequency.setValueAtTime(190, now);
      creak.frequency.exponentialRampToValueAtTime(55, now + 0.30);
      creakLp.type = 'lowpass'; creakLp.frequency.value = 380;
      cg.gain.setValueAtTime(0.0001, now);
      cg.gain.linearRampToValueAtTime(0.020, now + 0.008);
      cg.gain.exponentialRampToValueAtTime(0.0001, now + 0.30);
      creak.connect(creakLp); creakLp.connect(cg); cg.connect(out);
      creak.start(now); creak.stop(now + 0.32);
      scheduleCreak();
    }, 25000 + Math.random() * 30000);
  }
  scheduleCreak();

  // Sonar ping every 60–120 s
  let sonarTimer = null;
  function scheduleSonar() {
    if (stopped || !_ctx) return;
    sonarTimer = setTimeout(() => {
      if (stopped || !_ctx || _ctx.state === 'suspended') { scheduleSonar(); return; }
      const now = _ctx.currentTime;
      const ping = _ctx.createOscillator();
      const pg   = _ctx.createGain();
      ping.type  = 'sine';
      ping.frequency.setValueAtTime(820, now);
      ping.frequency.exponentialRampToValueAtTime(660, now + 2.0);
      pg.gain.setValueAtTime(0.0001, now);
      pg.gain.linearRampToValueAtTime(0.022, now + 0.012);
      pg.gain.exponentialRampToValueAtTime(0.0001, now + 2.0);
      ping.connect(pg); pg.connect(out);
      ping.start(now); ping.stop(now + 2.05);
      scheduleSonar();
    }, 60000 + Math.random() * 60000);
  }
  scheduleSonar();

  return {
    gainNode: out,
    stop() {
      stopped = true;
      if (creakTimer) clearTimeout(creakTimer);
      if (sonarTimer) clearTimeout(sonarTimer);
      try { water1.stop(); water2.stop(); pressure.stop(); } catch (_e) {}
    },
  };
}

// ── Real-sample builders (with synthesis fallback) ─────────────────────────

async function _buildForestDay() {
  const out = _ctx.createGain();
  out.gain.value = MIN;
  out.connect(_env);

  const nodes = [];

  // Synthesis texture — always present, subtle airy backdrop
  const ns1 = _ctx.createBufferSource();
  ns1.buffer = _whiteBuffer(); ns1.loop = true;
  const bp1 = _ctx.createBiquadFilter();
  bp1.type = 'bandpass'; bp1.frequency.value = 2000; bp1.Q.value = 1.6;
  const v1 = _ctx.createGain(); v1.gain.value = 0.12;
  ns1.connect(bp1); bp1.connect(v1); v1.connect(out); ns1.start();
  nodes.push(ns1);

  const sub = _ctx.createOscillator();
  sub.type = 'sine'; sub.frequency.value = 45;
  const sv = _ctx.createGain(); sv.gain.value = 0.05;
  sub.connect(sv); sv.connect(out); sub.start();
  nodes.push(sub);

  // MP3 layer — plays on top of the synthesis texture when available
  try {
    const buf = await _fetchAndDecode('/audio/forest-day.mp3');
    const src = _ctx.createBufferSource();
    src.buffer = buf; src.loop = true; src.loopEnd = buf.duration;
    const mpGain = _ctx.createGain(); mpGain.gain.value = 0.40;
    src.connect(mpGain); mpGain.connect(out); src.start();
    nodes.push(src);
  } catch { /* synthesis-only fallback is already running above */ }

  return {
    gainNode: out,
    stop() { nodes.forEach((n) => { try { n.stop(); n.disconnect(); } catch (_e) {} }); out.disconnect(); },
  };
}

async function _buildNighthawk() {
  const out = _ctx.createGain();
  out.gain.value = MIN;
  out.connect(_env);

  const nodes = [];
  let stopped = false;
  let owlTimer = null;

  const bass = _ctx.createOscillator();
  bass.type = 'sine'; bass.frequency.value = 40;
  const bv = _ctx.createGain(); bv.gain.value = 0.12;
  bass.connect(bv); bv.connect(out); bass.start();
  nodes.push(bass);

  const ns = _ctx.createBufferSource();
  ns.buffer = _brownBuffer(); ns.loop = true;
  const lp = _ctx.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 300;
  const nv = _ctx.createGain(); nv.gain.value = 0.10;
  ns.connect(lp); lp.connect(nv); nv.connect(out); ns.start();
  nodes.push(ns);

  // Owl calls layer — runs regardless of whether MP3 is present
  function scheduleOwl() {
    if (stopped || !_ctx) return;
    owlTimer = setTimeout(() => {
      if (stopped || !_ctx || _ctx.state === 'suspended') { scheduleOwl(); return; }
      const now = _ctx.currentTime;
      [0, 0.55].forEach((offset) => {
        const o = _ctx.createOscillator();
        const g = _ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(270, now + offset);
        o.frequency.exponentialRampToValueAtTime(185, now + offset + 0.4);
        g.gain.setValueAtTime(0.0001, now + offset);
        g.gain.linearRampToValueAtTime(0.025, now + offset + 0.08);
        g.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.4);
        o.connect(g).connect(out);
        o.start(now + offset); o.stop(now + offset + 0.42);
      });
      scheduleOwl();
    }, 30000 + Math.random() * 60000);
  }
  scheduleOwl();

  // MP3 layer — plays on top of synthesis when available
  try {
    const buf = await _fetchAndDecode('/audio/midnight-deep.mp3');
    const src = _ctx.createBufferSource();
    src.buffer = buf; src.loop = true; src.loopEnd = buf.duration;
    const mpGain = _ctx.createGain(); mpGain.gain.value = 0.40;
    src.connect(mpGain); mpGain.connect(out); src.start();
    nodes.push(src);
  } catch { /* synthesis-only is already running */ }

  return {
    gainNode: out,
    stop() {
      stopped = true;
      if (owlTimer) clearTimeout(owlTimer);
      nodes.forEach((n) => { try { n.stop(); n.disconnect(); } catch (_e) {} });
      out.disconnect();
    },
  };
}

async function _buildSunset() {
  const out = _ctx.createGain();
  out.gain.value = MIN;
  out.connect(_env);

  const nodes = [];

  // Synthesis texture — warm low drone, always present underneath the MP3
  const ns = _ctx.createBufferSource();
  ns.buffer = _brownBuffer(); ns.loop = true;
  const lp = _ctx.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 400;
  const nv = _ctx.createGain(); nv.gain.value = 0.10;
  ns.connect(lp); lp.connect(nv); nv.connect(out); ns.start();
  nodes.push(ns);

  const osc = _ctx.createOscillator();
  osc.type = 'sine'; osc.frequency.value = 60;
  const ov = _ctx.createGain(); ov.gain.value = 0.06;
  osc.connect(ov); ov.connect(out); osc.start();
  nodes.push(osc);

  // MP3 layer — plays on top of synthesis when available
  try {
    const buf = await _fetchAndDecode('/audio/sunset-sound.mp3');
    const src = _ctx.createBufferSource();
    src.buffer = buf; src.loop = true; src.loopEnd = buf.duration;
    const mpGain = _ctx.createGain(); mpGain.gain.value = 0.40;
    src.connect(mpGain); mpGain.connect(out); src.start();
    nodes.push(src);
  } catch { /* synthesis-only is already running */ }

  return {
    gainNode: out,
    stop() { nodes.forEach((n) => { try { n.stop(); n.disconnect(); } catch (_e) {} }); out.disconnect(); },
  };
}

// ── Shared crossfade helper ────────────────────────────────────────────────

async function _crossfadeTo(buildFn) {
  if (!_ctx) return;

  const maybeSlot = buildFn();
  const newSlot   = (maybeSlot && typeof maybeSlot.then === 'function')
    ? await maybeSlot
    : maybeSlot;

  const now    = _ctx.currentTime;
  const inIdx  = (_activeIdx + 1) % 2;
  const outSlot = _slots[_activeIdx];

  _slots[inIdx] = newSlot;

  newSlot.gainNode.gain.setValueAtTime(MIN, now);
  newSlot.gainNode.gain.exponentialRampToValueAtTime(1.0, now + FADE_S);

  if (outSlot) {
    outSlot.gainNode.gain.setValueAtTime(Math.max(outSlot.gainNode.gain.value, MIN), now);
    outSlot.gainNode.gain.exponentialRampToValueAtTime(MIN, now + FADE_S);
    const dying = outSlot;
    setTimeout(() => { dying.stop(); dying.gainNode.disconnect(); }, (FADE_S + 0.5) * 1000);
    _slots[_activeIdx] = null;
  }

  _activeIdx  = inIdx;
  _curProfile = null;
}

// ── Track registry ─────────────────────────────────────────────────────────

const TRACK_BUILDERS = {
  // Basic
  arctic:       _buildArctic,
  amber:        _buildAmber,
  // Phase-based real-sample
  forest:       _buildForestDay,
  sunset:       _buildSunset,
  nighthawk:    _buildNighthawk,
  // PRO
  rain:         _buildRain,
  cyberpunk:    _buildCyberpunk,
  library:      _buildLibrary,
  lofi:         _buildLofi,
  // ELITE
  deepspace:    _buildDeepSpace,
  spacestation: _buildSpaceStation,
  deepsea:      _buildDeepSea,
};

// ── Public API: ambient track ──────────────────────────────────────────────

export async function setAmbientTrack(track) {
  _manualTrack = track === 'focus' ? null : track;

  if (!_ctx) return;

  if (!_manualTrack) {
    _curProfile = null;
    if (_pendingPhase) setPhase(_pendingPhase);
    return;
  }

  const buildFn = TRACK_BUILDERS[_manualTrack];
  if (buildFn) await _crossfadeTo(buildFn);
}

// ── Phase control (used when no manual track override) ────────────────────

const PHASE_PROFILE = {
  morning: 'arctic',
  day:     'arctic',
  noon:    'arctic',
  evening: 'amber',
  sunset:  'amber',
  night:   'arctic',
};

export function setPhase(phase) {
  _pendingPhase = phase;
  const profile = PHASE_PROFILE[phase] ?? 'arctic';

  if (!_ctx) return;
  if (_manualTrack) return;
  if (profile === _curProfile) return;
  _curProfile = profile;

  const now     = _ctx.currentTime;
  const outSlot = _slots[_activeIdx];
  const inIdx   = (_activeIdx + 1) % 2;

  const newSlot = profile === 'amber' ? _buildAmber() : _buildArctic();
  _slots[inIdx] = newSlot;

  newSlot.gainNode.gain.setValueAtTime(MIN, now);
  newSlot.gainNode.gain.exponentialRampToValueAtTime(1.0, now + FADE_S);

  if (outSlot) {
    outSlot.gainNode.gain.setValueAtTime(Math.max(outSlot.gainNode.gain.value, MIN), now);
    outSlot.gainNode.gain.exponentialRampToValueAtTime(MIN, now + FADE_S);
    const dying = outSlot;
    setTimeout(() => { dying.stop(); dying.gainNode.disconnect(); }, (FADE_S + 0.5) * 1000);
    _slots[_activeIdx] = null;
  }

  _activeIdx = inIdx;
}

// ── Protocol ducking (kinetic mode) ───────────────────────────────────────

export function setProtocol(active) {
  if (!_ctx) return;
  const now  = _ctx.currentTime;
  const ramp = 2;

  _env.gain.cancelScheduledValues(now);
  _env.gain.setValueAtTime(Math.max(_env.gain.value, MIN), now);
  _env.gain.exponentialRampToValueAtTime(active ? PROTOCOL_DUCK : ENV_LEVEL, now + ramp);

  _hum.gain.cancelScheduledValues(now);
  _hum.gain.setValueAtTime(Math.max(_hum.gain.value, MIN), now);
  _hum.gain.exponentialRampToValueAtTime(active ? HUM_LEVEL : MIN, now + ramp);
}

// ── Notification duck — brief 10% ambient dip on any notification ─────────

export function duckNotification() {
  if (!_ctx || !_atmos) return;
  const now = _ctx.currentTime;
  const cur = Math.max(_atmos.gain.value, MIN);
  _atmos.gain.cancelScheduledValues(now);
  _atmos.gain.setValueAtTime(cur, now);
  _atmos.gain.linearRampToValueAtTime(cur * 0.90, now + 0.06); // fast 10% dip
  _atmos.gain.linearRampToValueAtTime(cur, now + 0.75);         // smooth restore
}

// ── Atmosphere volume — independent from master/SFX ──────────────────────

export function setAtmosphereVolume(v) {
  _atmosLevel = Math.max(0, Math.min(1, v));
  if (_atmos) _atmos.gain.value = _atmosLevel;
}

export function getAtmosphereVolume() {
  return _atmosLevel;
}

// ── Master volume ──────────────────────────────────────────────────────────

export function setVolume(v) {
  if (_master) _master.gain.value = Math.max(0, Math.min(1, v));
}

export function getVolume() {
  return _master ? _master.gain.value : 0.8;
}

// ── UI Sound effects (bypass atmosphere — routed directly to master) ───────

export function playUISound(type) {
  if (!_ctx) init();
  if (!_ctx) return;
  if (_ctx.state === 'suspended') _ctx.resume().catch(() => {});

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
    const sz  = Math.max(1, Math.floor(_ctx.sampleRate * dur));
    const buf = _ctx.createBuffer(1, sz, _ctx.sampleRate);
    const d   = buf.getChannelData(0);
    for (let i = 0; i < sz; i++) d[i] = Math.random() * 2 - 1;
    const src = _ctx.createBufferSource();
    src.buffer = buf;
    const bp = _ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = centerHz; bp.Q.value = 1.8;
    const g = _ctx.createGain();
    g.gain.setValueAtTime(vol, now + start);
    g.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
    src.connect(bp).connect(g).connect(dest);
    src.start(now + start);
  };

  switch (type) {
    case 'ambience_focus':
      tone(1400, 0, 0.09, 'sine', 0.07, 0.95);
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
      tone(80,  0,    0.5,  'sine', 0.09, 0.92);
      tone(160, 0.06, 0.35, 'sine', 0.05, 0.96);
      break;
    case 'ambience_library':
      tone(65,  0,    0.35, 'sine', 0.05, 1.0);
      tone(40,  0.05, 0.28, 'sine', 0.04, 1.0);
      break;
    case 'ambience_lofi':
      tone(130.81, 0,    0.4,  'sine', 0.038, 1.0);
      tone(196.00, 0.04, 0.32, 'sine', 0.022, 1.0);
      break;
    case 'ambience_spacestation':
      tone(80,  0,    0.5,  'sine', 0.08, 1.0);
      tone(160, 0.06, 0.35, 'sine', 0.05, 1.0);
      break;
    case 'ambience_deepsea':
      tone(55,  0,    0.55, 'sine', 0.09, 1.0);
      tone(110, 0.05, 0.40, 'sine', 0.05, 1.0);
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
    case 'level_up': {
      [
        { freq: 1047, vol: 0.11, decay: 2.8 },
        { freq: 1661, vol: 0.06, decay: 1.9 },
        { freq: 2349, vol: 0.04, decay: 1.2 },
        { freq: 3136, vol: 0.02, decay: 0.7 },
      ].forEach(({ freq, vol, decay }, i) => {
        const o = _ctx.createOscillator();
        const g = _ctx.createGain();
        o.type = 'sine'; o.frequency.value = freq;
        const t = now + i * 0.004;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(vol, t + 0.006);
        g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
        o.connect(g).connect(dest);
        o.start(t); o.stop(t + decay + 0.01);
      });
      [784, 1047, 1568].forEach((freq, i) => {
        const o = _ctx.createOscillator();
        const g = _ctx.createGain();
        o.type = 'sine';
        const t = now + 0.08 + i * 0.12;
        o.frequency.setValueAtTime(freq, t);
        o.frequency.exponentialRampToValueAtTime(freq * 1.25, t + 0.4);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.035, t + 0.05);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
        o.connect(g).connect(dest);
        o.start(t); o.stop(t + 0.45);
      });
      break;
    }
    case 'wood_tap': {
      const tapLen  = Math.floor(_ctx.sampleRate * 0.015);
      const tapBuf  = _ctx.createBuffer(1, tapLen, _ctx.sampleRate);
      const tapData = tapBuf.getChannelData(0);
      for (let i = 0; i < tapLen; i++) tapData[i] = Math.random() * 2 - 1;
      const tapSrc = _ctx.createBufferSource();
      tapSrc.buffer = tapBuf;
      const tapBp = _ctx.createBiquadFilter();
      tapBp.type = 'bandpass'; tapBp.frequency.value = 440; tapBp.Q.value = 3.5;
      const tapG = _ctx.createGain();
      tapG.gain.setValueAtTime(0.22, now);
      tapG.gain.exponentialRampToValueAtTime(0.0001, now + 0.055);
      tapSrc.connect(tapBp).connect(tapG).connect(dest);
      tapSrc.start(now);
      const thud  = _ctx.createOscillator();
      const thudG = _ctx.createGain();
      thud.type = 'sine';
      thud.frequency.setValueAtTime(90, now);
      thud.frequency.exponentialRampToValueAtTime(40, now + 0.04);
      thudG.gain.setValueAtTime(0.09, now);
      thudG.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
      thud.connect(thudG).connect(dest);
      thud.start(now); thud.stop(now + 0.045);
      break;
    }
    default: break;
  }
}
