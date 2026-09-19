// Foley for the opening: footsteps down a corridor, a lamp switch, a
// telephone bell, the handset coming off the cradle. Everything is
// synthesised from noise and sine waves so it works with no files at all,
// and it plays through the same master gain as the room, so it obeys the
// sound settings.

import { noiseBuffer } from './synth-textures';

export class Foley {
  private timers: ReturnType<typeof setTimeout>[] = [];
  private ringing = false;

  constructor(private ctx: AudioContext, private out: AudioNode) {}

  /** Stop anything scheduled. */
  stop(): void {
    this.timers.forEach(clearTimeout);
    this.timers = [];
    this.ringing = false;
  }

  private later(ms: number, fn: () => void): void {
    this.timers.push(setTimeout(fn, ms));
  }

  /** One step: a low thump with a little heel click, panned. */
  private step(level: number, pan: number): void {
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const panner = ctx.createStereoPanner();
    panner.pan.value = pan;
    panner.connect(this.out);

    // Heel: a short filtered noise burst.
    const heel = ctx.createBufferSource();
    heel.buffer = noiseBuffer(ctx, 0.06, false);
    const hp = ctx.createBiquadFilter();
    hp.type = 'bandpass'; hp.frequency.value = 1400; hp.Q.value = 0.8;
    const hg = ctx.createGain();
    hg.gain.setValueAtTime(level * 0.5, now);
    hg.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
    heel.connect(hp).connect(hg).connect(panner);
    heel.start(now); heel.stop(now + 0.07);

    // Sole: the thump, a sine dropping in pitch.
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(55, now + 0.12);
    const og = ctx.createGain();
    og.gain.setValueAtTime(level, now);
    og.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    osc.connect(og).connect(panner);
    osc.start(now); osc.stop(now + 0.18);
  }

  /** Footsteps coming closer down a hard corridor. */
  footsteps(count = 7, gap = 560): void {
    for (let i = 0; i < count; i++) {
      const level = 0.05 + (0.28 * i) / Math.max(1, count - 1);
      const pan = (i % 2 ? 0.18 : -0.18) * (1 - i / count);
      this.later(i * gap + Math.round(Math.random() * 40), () => this.step(level, pan));
    }
  }

  /** A lamp switch: two quick clicks, the second duller. */
  lampClick(): void {
    this.click(0.12, 2600, 0);
    this.click(0.08, 1200, 0.045);
  }

  private click(level: number, freq: number, delay: number): void {
    const ctx = this.ctx;
    const now = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx, 0.05, false);
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass'; band.frequency.value = freq; band.Q.value = 2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(level, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
    src.connect(band).connect(g).connect(this.out);
    src.start(now); src.stop(now + 0.06);
  }

  /** One burst of the bell: two clappers, tremolo at twenty a second. */
  private bell(seconds: number): void {
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const trem = ctx.createOscillator();
    trem.type = 'square';
    trem.frequency.value = 20;
    const tremGain = ctx.createGain();
    tremGain.gain.value = 0.5;
    const bus = ctx.createGain();
    bus.gain.setValueAtTime(0.0001, now);
    bus.gain.linearRampToValueAtTime(0.16, now + 0.02);
    bus.gain.setValueAtTime(0.16, now + seconds - 0.05);
    bus.gain.exponentialRampToValueAtTime(0.0001, now + seconds + 0.25);
    trem.connect(tremGain).connect(bus.gain);
    const hi = ctx.createBiquadFilter();
    hi.type = 'highpass'; hi.frequency.value = 600;
    bus.connect(hi).connect(this.out);
    for (const f of [1040, 1385, 2080]) {
      const o = ctx.createOscillator();
      o.type = f > 2000 ? 'triangle' : 'sine';
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = f > 2000 ? 0.15 : 0.5;
      o.connect(g).connect(bus);
      o.start(now); o.stop(now + seconds + 0.3);
    }
    trem.start(now); trem.stop(now + seconds + 0.3);
  }

  /**
   * The telephone rings until answered or `times` is up. Returns the
   * cadence so the picture can shake in time with it.
   */
  ring(times = 3, onRing?: (n: number) => void): { on: number; off: number } {
    const on = 1100, off = 1300;
    this.ringing = true;
    for (let i = 0; i < times; i++) {
      this.later(i * (on + off), () => {
        if (!this.ringing) return;
        onRing?.(i);
        this.bell(on / 1000);
      });
    }
    return { on, off };
  }

  /** The handset comes off the cradle: the bell stops, a clatter, a hum. */
  answer(): void {
    this.ringing = false;
    this.click(0.14, 900, 0);
    this.click(0.07, 2200, 0.06);
    // Line hum, brief, so the voice has something to arrive on.
    const ctx = this.ctx;
    const now = ctx.currentTime + 0.08;
    const o = ctx.createOscillator();
    o.type = 'sawtooth'; o.frequency.value = 60;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 240;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.03, now + 0.2);
    g.gain.linearRampToValueAtTime(0.0001, now + 1.6);
    o.connect(lp).connect(g).connect(this.out);
    o.start(now); o.stop(now + 1.7);
  }
}
