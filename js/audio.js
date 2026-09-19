// Atmosphere, synthesised.
//
// Browser speech cannot be routed through Web Audio -- there is no way to
// capture it -- so we cannot process the narrator's voice directly. What we
// can do is give it somewhere to be. Perfectly dry speech in silence reads as
// a machine; the same speech arriving over a precinct radio in a rainy room
// reads as a voice. This builds that room out of filtered noise: rain under
// everything, and a carrier that opens with a click when the narrator starts.
//
// Every source is generated, so there are no audio assets to load.

const RAIN_IDLE = 0.055;
const RAIN_DUCK = 0.032;   // pull the rain back so the voice sits on top
const HISS_OPEN = 0.020;
const HUM_OPEN = 0.010;

/** A couple of seconds of noise, looped. Brown for rain, white for hiss. */
function noiseBuffer(ctx, seconds, brown) {
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    if (brown) {
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.2;
    } else {
      data[i] = white;
    }
  }
  return buf;
}

export class Ambience {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.started = false;
    this.open = false;
    try {
      if (localStorage.getItem('ashgrave.ambience') === '0') this.enabled = false;
    } catch { /* private mode */ }
  }

  get supported() {
    return typeof window !== 'undefined' && !!(window.AudioContext || window.webkitAudioContext);
  }

  /** Must be called from a user gesture; safe to call repeatedly. */
  start() {
    if (!this.supported || !this.enabled) return;
    if (!this.ctx) this._build();
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
  }

  _build() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = this.enabled ? 1 : 0;
    this.master.connect(ctx.destination);

    // --- rain: brown noise, rolled off, with a little top for the spatter ---
    const rainSrc = ctx.createBufferSource();
    rainSrc.buffer = noiseBuffer(ctx, 3, true);
    rainSrc.loop = true;
    const rainLow = ctx.createBiquadFilter();
    rainLow.type = 'lowpass';
    rainLow.frequency.value = 1100;
    const rainAir = ctx.createBiquadFilter();
    rainAir.type = 'highshelf';
    rainAir.frequency.value = 2600;
    rainAir.gain.value = -6;
    this.rain = ctx.createGain();
    this.rain.gain.value = RAIN_IDLE;
    rainSrc.connect(rainLow).connect(rainAir).connect(this.rain).connect(this.master);
    rainSrc.start();

    // --- carrier hiss: the radio's own noise floor, only while it is open ---
    const hissSrc = ctx.createBufferSource();
    hissSrc.buffer = noiseBuffer(ctx, 2, false);
    hissSrc.loop = true;
    const hissBand = ctx.createBiquadFilter();
    hissBand.type = 'bandpass';
    hissBand.frequency.value = 1500;
    hissBand.Q.value = 0.7;
    this.hiss = ctx.createGain();
    this.hiss.gain.value = 0;
    hissSrc.connect(hissBand).connect(this.hiss).connect(this.master);
    hissSrc.start();

    // --- mains hum, the sound of a live valve set --------------------------
    const hum = ctx.createOscillator();
    hum.type = 'sine';
    hum.frequency.value = 60;
    const hum2 = ctx.createOscillator();
    hum2.type = 'sine';
    hum2.frequency.value = 120;
    this.hum = ctx.createGain();
    this.hum.gain.value = 0;
    hum.connect(this.hum); hum2.connect(this.hum);
    this.hum.connect(this.master);
    hum.start(); hum2.start();

    this.started = true;
  }

  _ramp(param, value, seconds = 0.4) {
    const now = this.ctx.currentTime;
    param.cancelScheduledValues(now);
    param.setValueAtTime(param.value, now);
    param.linearRampToValueAtTime(value, now + seconds);
  }

  /** A relay click: short filtered noise burst with a fast decay. */
  _click(level = 0.06) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx, 0.08, false);
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 1900;
    band.Q.value = 1.2;
    const g = ctx.createGain();
    const now = ctx.currentTime;
    g.gain.setValueAtTime(level, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
    src.connect(band).connect(g).connect(this.master);
    src.start();
    src.stop(now + 0.09);
  }

  /** The narrator has started: open the carrier and duck the rain. */
  openChannel() {
    if (!this.enabled || !this.ctx || this.open) return;
    this.open = true;
    this._click(0.05);
    this._ramp(this.hiss.gain, HISS_OPEN, 0.12);
    this._ramp(this.hum.gain, HUM_OPEN, 0.2);
    this._ramp(this.rain.gain, RAIN_DUCK, 0.35);
  }

  /** The narrator has finished: close down and let the rain back in. */
  closeChannel() {
    if (!this.ctx || !this.open) return;
    this.open = false;
    this._click(0.035);
    this._ramp(this.hiss.gain, 0, 0.3);
    this._ramp(this.hum.gain, 0, 0.3);
    this._ramp(this.rain.gain, RAIN_IDLE, 0.8);
  }

  setEnabled(on) {
    this.enabled = on;
    try { localStorage.setItem('ashgrave.ambience', on ? '1' : '0'); } catch { /* ignore */ }
    if (!this.ctx) { if (on) this.start(); return; }
    this._ramp(this.master.gain, on ? 1 : 0, 0.4);
  }

  stop() {
    if (!this.ctx) return;
    try { this.ctx.close(); } catch { /* ignore */ }
    this.ctx = null;
    this.started = false;
    this.open = false;
  }
}
