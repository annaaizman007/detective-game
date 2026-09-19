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

const RAIN_IDLE = 0.13;
const RAIN_DUCK = 0.075;   // pull the rain back so the voice sits on top
const HISS_OPEN = 0.020;
const HUM_OPEN = 0.010;

/** A couple of seconds of noise, looped. Brown for rumble, white for hiss. */
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

/**
 * Rain, written sample by sample.
 *
 * Filtered noise alone is a hiss, not rain -- what the ear actually uses to
 * recognise rain is the transients: thousands of individual drops striking
 * things, each a tiny pitched click with its own decay, over a broadband bed.
 * So this bakes the drops in: a dense layer of small ones for the sheet of it,
 * a sparse layer of fat ones for the drips off a ledge, over hiss and rumble.
 * Baking one long buffer and looping it costs nothing at playback time, where
 * scheduling ten thousand oscillators a minute would cost a great deal.
 *
 * The two channels are generated independently, which is what makes it sound
 * like weather all around rather than a speaker in front of you.
 */
function rainBuffer(ctx, seconds = 9) {
  const sr = ctx.sampleRate;
  const len = Math.floor(sr * seconds);
  const fade = Math.floor(sr * 0.6); // crossfade tail into head: seamless loop
  const buf = ctx.createBuffer(2, len, sr);

  for (let ch = 0; ch < 2; ch++) {
    const work = new Float32Array(len + fade);

    // --- bed: hiss (two-pole lowpass on white) plus a brown rumble -------
    let lp1 = 0; let lp2 = 0; let brown = 0; let hp = 0; let prev = 0;
    for (let i = 0; i < work.length; i++) {
      const white = Math.random() * 2 - 1;
      lp1 += (white - lp1) * 0.28;
      lp2 += (lp1 - lp2) * 0.28;
      brown = (brown + 0.018 * white) / 1.018;
      // A gentle high-pass keeps the hiss from turning into wind.
      hp = 0.94 * (hp + lp2 - prev);
      prev = lp2;
      // The bed stays well under the drops -- when it dominates, the whole
      // thing collapses back into a hiss with a rumble under it.
      work[i] = hp * 0.22 + brown * 0.40;
    }

    // --- the drops -------------------------------------------------------
    const addDrop = (at, freq, decaySec, amp, noisiness) => {
      const n = Math.min(work.length - at, Math.floor(decaySec * sr));
      const w = (Math.PI * 2 * freq) / sr;
      for (let t = 0; t < n; t++) {
        const env = Math.exp(-t / (decaySec * sr * 0.32));
        const tone = Math.sin(w * t);
        const grit = Math.random() * 2 - 1;
        work[at + t] += amp * env * (tone * (1 - noisiness) + grit * noisiness);
      }
    };

    // Fine spatter: the sheet of rain. Amplitude cubed so most are faint and
    // a few land close, which is how rain actually distributes.
    const fine = Math.floor(seconds * 300);
    for (let d = 0; d < fine; d++) {
      const amp = Math.random() ** 2.1 * 0.85;
      addDrop(
        Math.floor(Math.random() * len),
        1600 + Math.random() * 4400,
        0.004 + Math.random() * 0.014,
        amp, 0.55,
      );
    }

    // Middle distance: drops on the sill and the car roof below.
    const mid = Math.floor(seconds * 46);
    for (let d = 0; d < mid; d++) {
      const amp = 0.10 + Math.random() ** 1.7 * 0.55;
      addDrop(
        Math.floor(Math.random() * len),
        620 + Math.random() * 1500,
        0.018 + Math.random() * 0.05,
        amp, 0.4,
      );
    }

    // Fat drips off ledges and gutters: rarer, lower, longer.
    const fat = Math.floor(seconds * 9);
    for (let d = 0; d < fat; d++) {
      const amp = 0.18 + Math.random() ** 2 * 0.45;
      addDrop(
        Math.floor(Math.random() * len),
        180 + Math.random() * 520,
        0.05 + Math.random() * 0.13,
        amp, 0.25,
      );
    }

    // --- seamless loop: fold the tail back over the head -----------------
    const out = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) out[i] = work[i];
    for (let i = 0; i < fade; i++) {
      const k = i / fade;
      out[i] = out[i] * k + work[len + i] * (1 - k);
    }

    // Normalise so the mix is predictable whatever the random draw gave us.
    let peak = 0;
    for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(out[i]));
    if (peak > 0) { const g = 0.85 / peak; for (let i = 0; i < len; i++) out[i] *= g; }
  }
  return buf;
}

export class Ambience {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.started = false;
    this.open = false;
    this.volume = 1;
    try {
      if (localStorage.getItem('ashgrave.ambience') === '0') this.enabled = false;
      const v = parseFloat(localStorage.getItem('ashgrave.ambienceVol'));
      if (Number.isFinite(v)) this.volume = Math.max(0, Math.min(1.6, v));
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
    this.master.gain.value = this.enabled ? this.volume : 0;
    this.master.connect(ctx.destination);

    this.weather = ctx.createGain();
    this.weather.gain.value = RAIN_IDLE;
    this.weather.connect(this.master);

    // --- rain -----------------------------------------------------------
    // Two copies of the baked buffer, one slightly slowed and started at an
    // offset, so the ear never finds the loop point.
    const rainBuf = rainBuffer(ctx, 9);
    this._rainVoices = [1, 0.93].map((rate, i) => {
      const src = ctx.createBufferSource();
      src.buffer = rainBuf;
      src.loop = true;
      src.playbackRate.value = rate;
      const g = ctx.createGain();
      g.gain.value = i ? 0.55 : 1;
      src.connect(g).connect(this.weather);
      src.start(ctx.currentTime, i * 3.7);
      return { src, g };
    });

    // Heard from inside, through a window: take the very top off.
    const glass = ctx.createBiquadFilter();
    glass.type = 'lowshelf';
    glass.frequency.value = 180;
    glass.gain.value = 3;

    // Slow gusts, or the rain sits dead still and stops sounding like
    // anything happening outside.
    const gust = ctx.createOscillator();
    gust.type = 'sine';
    gust.frequency.value = 0.045;
    const gustDepth = ctx.createGain();
    gustDepth.gain.value = 0.22;
    gust.connect(gustDepth).connect(this._rainVoices[0].g.gain);
    const gust2 = ctx.createOscillator();
    gust2.type = 'sine';
    gust2.frequency.value = 0.019;
    const gustDepth2 = ctx.createGain();
    gustDepth2.gain.value = 0.18;
    gust2.connect(gustDepth2).connect(this._rainVoices[1].g.gain);
    gust.start(); gust2.start();

    // Wet street somewhere below: a distant, formless low bed.
    const street = ctx.createBufferSource();
    street.buffer = noiseBuffer(ctx, 5, true);
    street.loop = true;
    const streetLow = ctx.createBiquadFilter();
    streetLow.type = 'lowpass';
    streetLow.frequency.value = 170;
    const streetGain = ctx.createGain();
    streetGain.gain.value = 0.5;
    street.connect(streetLow).connect(streetGain).connect(this.weather);
    street.start();

    // Kept for the duck/restore ramps.
    this.rain = this.weather;

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
    this._scheduleThunder(12000);
  }

  /** Distant thunder, every half-minute or so. Never while the radio is open. */
  _scheduleThunder(delay) {
    clearTimeout(this._thunderTimer);
    this._thunderTimer = setTimeout(() => {
      if (this.ctx && this.enabled && !this.open) this._thunder();
      this._scheduleThunder(24000 + Math.random() * 40000);
    }, delay);
  }

  _thunder() {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx, 4, true);
    src.loop = true;
    const low = ctx.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = 140;
    const g = ctx.createGain();
    const now = ctx.currentTime;
    const peak = 0.10 + Math.random() * 0.10;
    // A long swell rather than a crack: this storm is several streets away.
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(peak, now + 0.5 + Math.random());
    g.gain.exponentialRampToValueAtTime(0.0001, now + 3.4 + Math.random() * 1.6);
    src.connect(low).connect(g).connect(this.master);
    src.start();
    src.stop(now + 5.5);
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
    this._ramp(this.master.gain, on ? this.volume : 0, 0.4);
  }

  setVolume(v) {
    this.volume = Math.max(0, Math.min(1.6, Number(v) || 0));
    try { localStorage.setItem('ashgrave.ambienceVol', String(this.volume)); } catch { /* ignore */ }
    if (this.ctx && this.enabled) this._ramp(this.master.gain, this.volume, 0.15);
  }

  stop() {
    clearTimeout(this._thunderTimer);
    if (!this.ctx) return;
    try { this.ctx.close(); } catch { /* ignore */ }
    this.ctx = null;
    this.started = false;
    this.open = false;
  }
}
